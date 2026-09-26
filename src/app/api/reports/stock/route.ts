import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { handleError, ok, withModule } from "@/lib/api";

/** GET /api/reports/stock - valuation + per-warehouse breakdown. */
export const GET = withModule("reports", async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const warehouseId = searchParams.get("warehouseId");
    const categoryId = searchParams.get("categoryId");

    const products = await prisma.product.findMany({
      where: {
        ...(categoryId ? { categoryId } : {}),
      },
      include: { category: true, supplier: true },
      orderBy: { name: "asc" },
    });

    const stocks = await prisma.stock.findMany({
      where: warehouseId ? { warehouseId } : {},
      include: { product: true, warehouse: true },
    });

    const rows = products.map((p) => {
      const warehouseRows = stocks.filter((s) => s.productId === p.id);
      const qty = warehouseId
        ? warehouseRows.reduce((s, r) => s + r.quantity, 0)
        : p.quantity;
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category?.name ?? "-",
        supplier: p.supplier?.name ?? "-",
        unit: p.unit,
        quantity: qty,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        costValue: qty * p.costPrice,
        retailValue: qty * p.sellingPrice,
        reorderLevel: p.reorderLevel,
        status: qty <= p.reorderLevel ? "low" : "ok",
      };
    });

    const totalCost = rows.reduce((s, r) => s + r.costValue, 0);
    const totalRetail = rows.reduce((s, r) => s + r.retailValue, 0);
    const totalUnits = rows.reduce((s, r) => s + r.quantity, 0);

    const byWarehouse = await prisma.warehouse.findMany({
      include: { stock: { include: { product: true } } },
    });

    return ok({
      rows,
      summary: {
        totalCost,
        totalRetail,
        totalUnits,
        potentialProfit: totalRetail - totalCost,
        lowStock: rows.filter((r) => r.status === "low").length,
      },
      byWarehouse: byWarehouse.map((w) => ({
        id: w.id,
        name: w.name,
        units: w.stock.reduce((s, r) => s + r.quantity, 0),
        value: w.stock.reduce((s, r) => s + r.quantity * r.product.costPrice, 0),
      })),
    });
  } catch (e) {
    return handleError(e);
  }
});
