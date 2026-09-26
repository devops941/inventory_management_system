"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  Boxes,
  IndianRupee,
  Package,
  ShoppingCart,
  Receipt,
  Users,
  Warehouse,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { PageHeader, LoadingState, StatCard, ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/dialogs";
import { api, formatCurrency, formatDate, formatNumber } from "@/lib/client";
import { useAuth } from "@/components/auth-provider";

interface DashboardData {
  stats: {
    productCount: number;
    categoryCount: number;
    supplierCount: number;
    customerCount: number;
    warehouseCount: number;
    stockValue: number;
    retailValue: number;
    totalUnits: number;
    lowStockCount: number;
    unreadAlerts: number;
    purchaseTotal: number;
    salesTotal: number;
    pendingPurchases: number;
    pendingSales: number;
    unpaidSales: number;
  };
  lowStock: {
    id: string;
    name: string;
    sku: string;
    quantity: number;
    reorderLevel: number;
    unit: string;
    category: string;
  }[];
  recentPurchases: {
    id: string;
    orderNumber: string;
    status: string;
    total: number;
    orderDate: string;
    supplier?: { name: string };
  }[];
  recentSales: {
    id: string;
    orderNumber: string;
    status: string;
    total: number;
    orderDate: string;
    customer?: { name: string };
  }[];
  months: { label: string; purchases: number; sales: number }[];
  categoryDistribution: { name: string; value: number }[];
}

const PIE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "#94a3b8",
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.get<DashboardData>("/api/reports/dashboard"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingState label="Loading dashboard..." />;
  if (error || !data)
    return <ErrorState message={error ?? "No data"} onRetry={load} />;

  const { stats } = data;

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.name?.split(" ")[0] ?? "there"}`}
        description="Live snapshot of stock, purchases, sales and alerts."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Products"
          value={formatNumber(stats.productCount)}
          hint={`${formatNumber(stats.totalUnits)} units in stock`}
          icon={Package}
        />
        <StatCard
          label="Stock Value (cost)"
          value={formatCurrency(stats.stockValue)}
          hint={`Retail ${formatCurrency(stats.retailValue)}`}
          icon={IndianRupee}
        />
        <StatCard
          label="Low Stock Items"
          value={formatNumber(stats.lowStockCount)}
          hint="At or below reorder level"
          icon={AlertTriangle}
          tone={stats.lowStockCount > 0 ? "danger" : "success"}
        />
        <StatCard
          label="Unread Alerts"
          value={formatNumber(stats.unreadAlerts)}
          hint="Low stock and expiry notices"
          icon={Boxes}
          tone={stats.unreadAlerts > 0 ? "warning" : "success"}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Purchase Value"
          value={formatCurrency(stats.purchaseTotal)}
          hint={`${stats.pendingPurchases} pending orders`}
          icon={ShoppingCart}
        />
        <StatCard
          label="Sales Value"
          value={formatCurrency(stats.salesTotal)}
          hint={`${stats.pendingSales} pending orders`}
          icon={Receipt}
        />
        <StatCard
          label="Customers"
          value={formatNumber(stats.customerCount)}
          hint={`${stats.unpaidSales} unpaid invoices`}
          icon={Users}
        />
        <StatCard
          label="Warehouses"
          value={formatNumber(stats.warehouseCount)}
          hint={`${formatNumber(stats.supplierCount)} suppliers`}
          icon={Warehouse}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Purchases vs Sales</CardTitle>
            <CardDescription>Last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                purchases: { label: "Purchases", color: "var(--chart-2)" },
                sales: { label: "Sales", color: "var(--chart-1)" },
              }}
              className="h-[280px] w-full"
            >
              <AreaChart data={data.months} margin={{ left: 8, right: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={60}
                  tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Area
                  type="monotone"
                  dataKey="purchases"
                  stroke="var(--color-purchases)"
                  fill="var(--color-purchases)"
                  fillOpacity={0.25}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="var(--color-sales)"
                  fill="var(--color-sales)"
                  fillOpacity={0.25}
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Stock by Category</CardTitle>
            <CardDescription>Units across top categories</CardDescription>
          </CardHeader>
          <CardContent>
            {data.categoryDistribution.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No stock recorded yet
              </p>
            ) : (
              <ChartContainer
                config={{ value: { label: "Units", color: "var(--chart-1)" } }}
                className="h-[280px] w-full"
              >
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                  <Pie
                    data={data.categoryDistribution}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={2}
                  >
                    {data.categoryDistribution.map((entry, i) => (
                      <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Low Stock Alerts</CardTitle>
              <CardDescription>Reorder soon</CardDescription>
            </div>
            <Link href="/alerts" className="text-xs text-muted-foreground hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.lowStock.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                All products are above their reorder level.
              </p>
            ) : (
              data.lowStock.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 border-b pb-2 last:border-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.sku} &middot; {p.category}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-red-600">
                      {p.quantity} {p.unit}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      reorder at {p.reorderLevel}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Purchases</CardTitle>
            <CardDescription>Latest supplier orders</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recentPurchases.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No purchase orders yet.
              </p>
            ) : (
              data.recentPurchases.map((o) => (
                <Link
                  key={o.id}
                  href={`/purchases/${o.id}`}
                  className="flex items-center justify-between gap-3 border-b pb-2 last:border-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{o.orderNumber}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {o.supplier?.name} &middot; {formatDate(o.orderDate)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm font-semibold">
                      {formatCurrency(o.total)}
                    </span>
                    <StatusBadge value={o.status} />
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Sales</CardTitle>
            <CardDescription>Latest customer orders</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recentSales.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No sales orders yet.
              </p>
            ) : (
              data.recentSales.map((o) => (
                <Link
                  key={o.id}
                  href={`/sales/${o.id}`}
                  className="flex items-center justify-between gap-3 border-b pb-2 last:border-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{o.orderNumber}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {o.customer?.name} &middot; {formatDate(o.orderDate)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm font-semibold">
                      {formatCurrency(o.total)}
                    </span>
                    <StatusBadge value={o.status} />
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Top Categories by Units</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{ value: { label: "Units", color: "var(--chart-2)" } }}
            className="h-[240px] w-full"
          >
            <BarChart data={data.categoryDistribution}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} width={50} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
