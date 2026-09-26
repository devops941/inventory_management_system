import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { handleError, ok, withModule } from "@/lib/api";

/** GET /api/reports/purchases - purchase history with supplier grouping. */
export const GET = withModule("reports", async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const orders = await prisma.purchaseOrder.findMany({
      where: {
        ...(from || to
          ? {
              orderDate: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      include: { supplier: true, items: { include: { product: true } } },
      orderBy: { orderDate: "desc" },
    });

    const active = orders.filter((o) => o.status !== "cancelled");
    const bySupplier = Object.values(
      active.reduce<Record<string, { supplier: string; orders: number; total: number }>>(
        (acc, o) => {
          const key = o.supplierId;
          acc[key] = acc[key] || {
            supplier: o.supplier?.name ?? "-",
            orders: 0,
            total: 0,
          };
          acc[key].orders += 1;
          acc[key].total += o.total;
          return acc;
        },
        {}
      )
    ).sort((a, b) => b.total - a.total);

    return ok({
      rows: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        supplier: o.supplier?.name ?? "-",
        status: o.status,
        orderDate: o.orderDate,
        total: o.total,
        paidAmount: o.paidAmount,
        itemCount: o.items.length,
      })),
      summary: {
        totalOrders: active.length,
        totalValue: active.reduce((s, o) => s + o.total, 0),
        paidValue: active.reduce((s, o) => s + o.paidAmount, 0),
        pending: orders.filter((o) => o.status === "pending").length,
        received: orders.filter((o) => o.status === "received").length,
      },
      bySupplier,
    });
  } catch (e) {
    return handleError(e);
  }
});
