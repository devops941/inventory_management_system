import prisma from "@/lib/prisma";
import { handleError, ok, withAuth } from "@/lib/api";

/** GET /api/reports/dashboard - key figures, charts and recent activity. */
export const GET = withAuth(async () => {
  try {
    const [
      productCount,
      categoryCount,
      supplierCount,
      customerCount,
      warehouseCount,
      lowStockProducts,
      allProducts,
      recentPurchases,
      recentSales,
      unreadAlerts,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.category.count(),
      prisma.supplier.count(),
      prisma.customer.count(),
      prisma.warehouse.count(),
      prisma.product.findMany({
        where: { status: "active" },
        include: { category: true },
        orderBy: { quantity: "asc" },
      }),
      prisma.product.findMany({ select: { quantity: true, costPrice: true, sellingPrice: true } }),
      prisma.purchaseOrder.findMany({
        include: { supplier: true },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      prisma.salesOrder.findMany({
        include: { customer: true },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      prisma.notification.count({ where: { isRead: false } }),
    ]);

    const lowStock = lowStockProducts
      .filter((p) => p.quantity <= p.reorderLevel)
      .map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        quantity: p.quantity,
        reorderLevel: p.reorderLevel,
        unit: p.unit,
        category: p.category?.name ?? "-",
      }));

    const stockValue = allProducts.reduce(
      (s, p) => s + p.quantity * p.costPrice,
      0
    );
    const retailValue = allProducts.reduce(
      (s, p) => s + p.quantity * p.sellingPrice,
      0
    );
    const totalUnits = allProducts.reduce((s, p) => s + p.quantity, 0);

    const purchases = await prisma.purchaseOrder.findMany({
      select: { total: true, status: true, orderDate: true },
    });
    const sales = await prisma.salesOrder.findMany({
      select: { total: true, status: true, orderDate: true, paymentStatus: true },
    });

    const purchaseTotal = purchases
      .filter((p) => p.status !== "cancelled")
      .reduce((s, p) => s + p.total, 0);
    const salesTotal = sales
      .filter((s2) => s2.status !== "cancelled")
      .reduce((s, p) => s + p.total, 0);

    // Monthly series for the last 6 months.
    const months: { label: string; purchases: number; sales: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString("en-US", { month: "short" });
      const inMonth = (date: Date) =>
        date.getFullYear() === d.getFullYear() && date.getMonth() === d.getMonth();
      months.push({
        label,
        purchases: purchases
          .filter((p) => p.status !== "cancelled" && inMonth(new Date(p.orderDate)))
          .reduce((s, p) => s + p.total, 0),
        sales: sales
          .filter((s2) => s2.status !== "cancelled" && inMonth(new Date(s2.orderDate)))
          .reduce((s, p) => s + p.total, 0),
      });
    }

    // Stock distribution by category (top 6).
    const categories = await prisma.category.findMany({
      include: { products: { select: { quantity: true } } },
    });
    const categoryDistribution = categories
      .map((c) => ({
        name: c.name,
        value: c.products.reduce((s, p) => s + p.quantity, 0),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    return ok({
      stats: {
        productCount,
        categoryCount,
        supplierCount,
        customerCount,
        warehouseCount,
        stockValue,
        retailValue,
        totalUnits,
        lowStockCount: lowStock.length,
        unreadAlerts,
        purchaseTotal,
        salesTotal,
        pendingPurchases: purchases.filter((p) => p.status === "pending").length,
        pendingSales: sales.filter((s2) => s2.status === "pending").length,
        unpaidSales: sales.filter(
          (s2) => s2.status !== "cancelled" && s2.paymentStatus !== "paid"
        ).length,
      },
      lowStock: lowStock.slice(0, 8),
      recentPurchases,
      recentSales,
      months,
      categoryDistribution,
    });
  } catch (e) {
    return handleError(e);
  }
});
