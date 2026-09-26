import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import {fail, handleError, ok, withManage, withModule} from "@/lib/api";
import { productSchema } from "@/lib/validators";

export const GET = withModule("products", async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    const categoryId = searchParams.get("categoryId");
    const supplierId = searchParams.get("supplierId");
    const warehouseId = searchParams.get("warehouseId");
    const status = searchParams.get("status");
    const lowStock = searchParams.get("lowStock") === "true";

    const products = await prisma.product.findMany({
      where: {
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { sku: { contains: q, mode: "insensitive" } },
                { barcode: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(supplierId ? { supplierId } : {}),
        ...(warehouseId ? { warehouseId } : {}),
        ...(status ? { status } : {}),
      },
      include: { category: true, supplier: true, warehouse: true },
      orderBy: { createdAt: "desc" },
    });

    const filtered = lowStock
      ? products.filter((p) => p.quantity <= p.reorderLevel)
      : products;

    return ok(filtered);
  } catch (e) {
    return handleError(e);
  }
});

export const POST = withManage("products", async (req: NextRequest) => {
  try {
    const body = await req.json();
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) return fail("Invalid input", 422, parsed.error.flatten());
    const d = parsed.data;

    // Validate referenced records up-front so a bad id yields a clean 422
    // instead of a Prisma relation error.
    const category = await prisma.category.findUnique({
      where: { id: d.categoryId },
    });
    if (!category) return fail("Category not found", 422);
    if (d.supplierId) {
      const supplier = await prisma.supplier.findUnique({
        where: { id: d.supplierId },
      });
      if (!supplier) return fail("Supplier not found", 422);
    }
    if (d.warehouseId) {
      const warehouse = await prisma.warehouse.findUnique({
        where: { id: d.warehouseId },
      });
      if (!warehouse) return fail("Warehouse not found", 422);
    }

    const product = await prisma.product.create({
      data: {
        name: d.name,
        sku: d.sku,
        barcode: d.barcode ?? null,
        description: d.description ?? null,
        unit: d.unit,
        costPrice: d.costPrice,
        sellingPrice: d.sellingPrice,
        reorderLevel: d.reorderLevel,
        quantity: 0,
        image: d.image ?? null,
        status: d.status,
        expiryDate: d.expiryDate ?? null,
        categoryId: d.categoryId,
        supplierId: d.supplierId || null,
        warehouseId: d.warehouseId || null,
      },
      include: { category: true, supplier: true, warehouse: true },
    });

    // Opening stock: if a warehouse and quantity were supplied, record it.
    if (d.warehouseId && d.quantity > 0) {
      const { applyStock } = await import("@/lib/stock");
      await applyStock({
        productId: product.id,
        warehouseId: d.warehouseId,
        quantity: d.quantity,
        type: "IN",
        referenceType: "opening",
        note: "Opening stock",
      });
      const refreshed = await prisma.product.findUnique({
        where: { id: product.id },
        include: { category: true, supplier: true, warehouse: true },
      });
      return ok(refreshed, 201);
    }

    return ok(product, 201);
  } catch (e) {
    return handleError(e);
  }
});
