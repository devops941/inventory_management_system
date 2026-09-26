"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { FileSpreadsheet, FileText, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "@/components/ui/chart";
import { DataTable, type Column } from "@/components/shared/data-table";
import { PageHeader, LoadingState, ErrorState, StatCard } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/dialogs";
import { api, formatCurrency, formatDate, formatNumber } from "@/lib/client";

interface StockReport {
  rows: {
    id: string;
    name: string;
    sku: string;
    category: string;
    supplier: string;
    unit: string;
    quantity: number;
    costPrice: number;
    sellingPrice: number;
    costValue: number;
    retailValue: number;
    reorderLevel: number;
    status: string;
  }[];
  summary: {
    totalCost: number;
    totalRetail: number;
    totalUnits: number;
    potentialProfit: number;
    lowStock: number;
  };
  byWarehouse: { id: string; name: string; units: number; value: number }[];
}

interface PurchaseReport {
  rows: {
    id: string;
    orderNumber: string;
    supplier: string;
    status: string;
    orderDate: string;
    total: number;
    paidAmount: number;
    itemCount: number;
  }[];
  summary: {
    totalOrders: number;
    totalValue: number;
    paidValue: number;
    pending: number;
    received: number;
  };
  bySupplier: { supplier: string; orders: number; total: number }[];
}

interface SalesReport {
  rows: {
    id: string;
    orderNumber: string;
    customer: string;
    status: string;
    paymentStatus: string;
    orderDate: string;
    total: number;
    paidAmount: number;
    itemCount: number;
  }[];
  summary: {
    totalOrders: number;
    totalValue: number;
    paidValue: number;
    outstanding: number;
    issued: number;
    pending: number;
  };
  byCustomer: { customer: string; orders: number; total: number }[];
  topProducts: { product: string; quantity: number; revenue: number }[];
}

export default function ReportsPage() {
  const [stock, setStock] = useState<StockReport | null>(null);
  const [purchases, setPurchases] = useState<PurchaseReport | null>(null);
  const [sales, setSales] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [exporting, setExporting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const range = new URLSearchParams();
      if (from) range.set("from", from);
      if (to) range.set("to", to);
      const suffix = range.toString() ? `?${range.toString()}` : "";
      const [s, p, sl] = await Promise.all([
        api.get<StockReport>("/api/reports/stock"),
        api.get<PurchaseReport>(`/api/reports/purchases${suffix}`),
        api.get<SalesReport>(`/api/reports/sales${suffix}`),
      ]);
      setStock(s);
      setPurchases(p);
      setSales(sl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const exportReport = async (type: string, format: "xlsx" | "pdf") => {
    setExporting(`${type}-${format}`);
    try {
      const res = await fetch(
        `/api/reports/export?type=${type}&format=${format}`,
        { credentials: "include" }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message || "Export failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}-report.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`${format.toUpperCase()} exported`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(null);
    }
  };

  const ExportButtons = ({ type }: { type: string }) => (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={exporting === `${type}-xlsx`}
        onClick={() => exportReport(type, "xlsx")}
      >
        <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={exporting === `${type}-pdf`}
        onClick={() => exportReport(type, "pdf")}
      >
        <FileText className="mr-2 h-4 w-4" /> PDF
      </Button>
    </div>
  );

  if (loading) return <LoadingState label="Building reports..." />;
  if (error || !stock || !purchases || !sales)
    return <ErrorState message={error ?? "No data"} onRetry={load} />;

  const stockColumns: Column<StockReport["rows"][number]>[] = [
    {
      key: "product",
      header: "Product",
      searchValue: (r) => `${r.name} ${r.sku} ${r.category}`,
      render: (r) => (
        <div>
          <p className="font-medium">{r.name}</p>
          <p className="text-xs text-muted-foreground">
            {r.sku} &middot; {r.category}
          </p>
        </div>
      ),
    },
    {
      key: "quantity",
      header: "Qty",
      render: (r) => (
        <span className={r.status === "low" ? "font-semibold text-red-600" : ""}>
          {r.quantity} {r.unit}
        </span>
      ),
    },
    {
      key: "cost",
      header: "Cost value",
      render: (r) => <span className="text-sm">{formatCurrency(r.costValue)}</span>,
    },
    {
      key: "retail",
      header: "Retail value",
      render: (r) => <span className="text-sm">{formatCurrency(r.retailValue)}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusBadge value={r.status} />,
    },
  ];

  const purchaseColumns: Column<PurchaseReport["rows"][number]>[] = [
    {
      key: "orderNumber",
      header: "Order",
      searchValue: (r) => `${r.orderNumber} ${r.supplier}`,
      render: (r) => (
        <div>
          <p className="font-medium">{r.orderNumber}</p>
          <p className="text-xs text-muted-foreground">{r.supplier}</p>
        </div>
      ),
    },
    {
      key: "date",
      header: "Date",
      render: (r) => <span className="text-sm">{formatDate(r.orderDate)}</span>,
    },
    {
      key: "total",
      header: "Total",
      render: (r) => <span className="text-sm">{formatCurrency(r.total)}</span>,
    },
    {
      key: "paid",
      header: "Paid",
      render: (r) => <span className="text-sm">{formatCurrency(r.paidAmount)}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusBadge value={r.status} />,
    },
  ];

  const salesColumns: Column<SalesReport["rows"][number]>[] = [
    {
      key: "orderNumber",
      header: "Order",
      searchValue: (r) => `${r.orderNumber} ${r.customer}`,
      render: (r) => (
        <div>
          <p className="font-medium">{r.orderNumber}</p>
          <p className="text-xs text-muted-foreground">{r.customer}</p>
        </div>
      ),
    },
    {
      key: "date",
      header: "Date",
      render: (r) => <span className="text-sm">{formatDate(r.orderDate)}</span>,
    },
    {
      key: "total",
      header: "Total",
      render: (r) => <span className="text-sm">{formatCurrency(r.total)}</span>,
    },
    {
      key: "payment",
      header: "Payment",
      render: (r) => <StatusBadge value={r.paymentStatus} />,
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusBadge value={r.status} />,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        description="Stock valuation, purchase and sales performance"
      />

      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-40"
            />
          </div>
          <Button size="sm" onClick={load}>
            Apply range
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setFrom("");
              setTo("");
            }}
          >
            Clear
          </Button>
          <p className="ml-auto text-xs text-muted-foreground">
            Date range applies to purchase and sales reports.
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="stock">
        <TabsList>
          <TabsTrigger value="stock">Stock</TabsTrigger>
          <TabsTrigger value="purchases">Purchases</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="grid flex-1 gap-4 sm:grid-cols-4">
              <StatCard label="Units" value={formatNumber(stock.summary.totalUnits)} />
              <StatCard
                label="Cost value"
                value={formatCurrency(stock.summary.totalCost)}
              />
              <StatCard
                label="Retail value"
                value={formatCurrency(stock.summary.totalRetail)}
              />
              <StatCard
                label="Potential profit"
                value={formatCurrency(stock.summary.potentialProfit)}
                tone="success"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <ExportButtons type="stock" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Stock value by warehouse</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{ value: { label: "Value", color: "var(--chart-1)" } }}
                  className="h-[260px] w-full"
                >
                  <BarChart data={stock.byWarehouse}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={60}
                      tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Units by warehouse</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{ units: { label: "Units", color: "var(--chart-2)" } }}
                  className="h-[260px] w-full"
                >
                  <BarChart data={stock.byWarehouse}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} width={50} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="units" fill="var(--color-units)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          <DataTable
            columns={stockColumns}
            rows={stock.rows}
            pageSize={12}
            searchPlaceholder="Search stock report..."
          />
        </TabsContent>

        <TabsContent value="purchases" className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-4">
            <StatCard label="Orders" value={formatNumber(purchases.summary.totalOrders)} />
            <StatCard
              label="Total value"
              value={formatCurrency(purchases.summary.totalValue)}
            />
            <StatCard
              label="Paid"
              value={formatCurrency(purchases.summary.paidValue)}
              tone="success"
            />
            <StatCard
              label="Pending"
              value={formatNumber(purchases.summary.pending)}
              tone={purchases.summary.pending > 0 ? "warning" : "success"}
            />
          </div>
          <div className="flex justify-end">
            <ExportButtons type="purchases" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>
                <span className="inline-flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> Spend by supplier
                </span>
              </CardTitle>
              <CardDescription>Top suppliers by purchase value</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{ total: { label: "Spend", color: "var(--chart-3)" } }}
                className="h-[280px] w-full"
              >
                <BarChart data={purchases.bySupplier.slice(0, 8)} layout="vertical">
                  <CartesianGrid horizontal={false} />
                  <XAxis
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                  />
                  <YAxis
                    type="category"
                    dataKey="supplier"
                    tickLine={false}
                    axisLine={false}
                    width={140}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="total" fill="var(--color-total)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <DataTable
            columns={purchaseColumns}
            rows={purchases.rows}
            pageSize={12}
            searchPlaceholder="Search purchase report..."
          />
        </TabsContent>

        <TabsContent value="sales" className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-4">
            <StatCard label="Orders" value={formatNumber(sales.summary.totalOrders)} />
            <StatCard
              label="Total value"
              value={formatCurrency(sales.summary.totalValue)}
            />
            <StatCard
              label="Collected"
              value={formatCurrency(sales.summary.paidValue)}
              tone="success"
            />
            <StatCard
              label="Outstanding"
              value={formatCurrency(sales.summary.outstanding)}
              tone="danger"
            />
          </div>
          <div className="flex justify-end">
            <ExportButtons type="sales" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue by customer</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{ total: { label: "Revenue", color: "var(--chart-1)" } }}
                  className="h-[260px] w-full"
                >
                  <BarChart data={sales.byCustomer.slice(0, 8)}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="customer" tickLine={false} axisLine={false} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={60}
                      tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="total" fill="var(--color-total)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Best-selling products</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{ quantity: { label: "Units sold", color: "var(--chart-4)" } }}
                  className="h-[260px] w-full"
                >
                  <BarChart data={sales.topProducts} layout="vertical">
                    <CartesianGrid horizontal={false} />
                    <XAxis type="number" tickLine={false} axisLine={false} />
                    <YAxis
                      type="category"
                      dataKey="product"
                      tickLine={false}
                      axisLine={false}
                      width={140}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="quantity"
                      fill="var(--color-quantity)"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          <DataTable
            columns={salesColumns}
            rows={sales.rows}
            pageSize={12}
            searchPlaceholder="Search sales report..."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
