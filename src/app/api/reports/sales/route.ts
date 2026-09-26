import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { handleError, ok, withModule } from "@/lib/api";

/** GET /api/reports/sales - sales history with customer grouping. */
export const GET = withModule("reports", async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const orders = await prisma.salesOrder.findMany({
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
      include: { customer: true, items: { include: { product: true } } },
      orderBy: { orderDate: "desc" },
    });

    const active = orders.filter((o) => o.status !== "cancelled");
    const byCustomer = Object.values(
      active.reduce<Record<string, { customer: string; orders: number; total: number }>>(
        (acc, o) => {
          const key = o.customerId;
          acc[key] = acc[key] || {
            customer: o.customer?.name ?? "-",
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

    // Best-selling products by quantity sold across active orders.
    const productSales = new Map<
      string,
      { product: string; quantity: number; revenue: number }
    >();
    for (const o of active) {
      for (const it of o.items) {
        const key = it.productId;
        const entry =
          productSales.get(key) ?? {
            product: it.product?.name ?? "-",
            quantity: 0,
            revenue: 0,
          };
        entry.quantity += it.quantity;
        entry.revenue += it.total;
        productSales.set(key, entry);
      }
    }
    const topProducts = Array.from(productSales.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 8);

    return ok({
      rows: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customer: o.customer?.name ?? "-",
        status: o.status,
        paymentStatus: o.paymentStatus,
        orderDate: o.orderDate,
        total: o.total,
        paidAmount: o.paidAmount,
        itemCount: o.items.length,
      })),
      summary: {
        totalOrders: active.length,
        totalValue: active.reduce((s, o) => s + o.total, 0),
        paidValue: active.reduce((s, o) => s + o.paidAmount, 0),
        outstanding: active.reduce((s, o) => s + (o.total - o.paidAmount), 0),
        issued: orders.filter((o) => o.status === "issued").length,
        pending: orders.filter((o) => o.status === "pending").length,
      },
      byCustomer,
      topProducts,
    });
  } catch (e) {
    return handleError(e);
  }
});
