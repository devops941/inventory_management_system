"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeftRight, Plus, Minus, ClipboardCheck, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type Column } from "@/components/shared/data-table";
import { PageHeader, LoadingState, ErrorState, StatCard } from "@/components/shared/states";
import { api, formatCurrency, formatDateTime, formatNumber } from "@/lib/client";
import { useAuth } from "@/components/auth-provider";
import { canManage } from "@/lib/rbac";

interface StockRow {
  id: string;
  quantity: number;
  productId: string;
  warehouseId: string;
  updatedAt: string;
  product?: { name: string; sku: string; unit: string; reorderLevel: number; costPrice: number; category?: { name: string } | null } | null;
  warehouse?: { name: string } | null;
}

interface Movement {
  id: string;
  type: string;
  quantity: number;
  balance: number;
  note?: string | null;
  reference?: string | null;
  createdAt: string;
  product?: { name: string; sku: string } | null;
  warehouse?: { name: string } | null;
  createdBy?: { name: string } | null;
}

interface Option {
  id: string;
  name: string;
}

const MOVEMENT_LABELS: Record<string, string> = {
  IN: "Stock in",
  OUT: "Stock out",
  ADJUSTMENT: "Adjustment",
  TRANSFER_IN: "Transfer in",
  TRANSFER_OUT: "Transfer out",
};

export default function StockPage() {
  const { user } = useAuth();
  const editable = canManage(user?.role, "stock");

  const [stocks, setStocks] = useState<StockRow[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [products, setProducts] = useState<Option[]>([]);
  const [warehouses, setWarehouses] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialog, setDialog] = useState<"in" | "out" | "adjust" | "transfer" | null>(null);
  const [form, setForm] = useState({
    productId: "",
    warehouseId: "",
    toWarehouseId: "",
    quantity: "1",
    note: "",
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, m] = await Promise.all([
        api.get<StockRow[]>("/api/stock"),
        api.get<Movement[]>("/api/stock/movements?take=100"),
      ]);
      setStocks(s);
      setMovements(m);

      // Warehouse list feeds the adjust/transfer dialogs; roles without
      // warehouse access are read-only here, so don't fail the whole page.
      const safe = async <T,>(url: string): Promise<T[]> => {
        try {
          return await api.get<T[]>(url);
        } catch {
          return [];
        }
      };
      const [p, w] = await Promise.all([
        safe<Option>("/api/products"),
        safe<Option>("/api/warehouses"),
      ]);
      setProducts(p);
      setWarehouses(w);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load stock");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openDialog = (kind: "in" | "out" | "adjust" | "transfer") => {
    setForm({
      productId: "",
      warehouseId: warehouses[0]?.id ?? "",
      toWarehouseId: warehouses[1]?.id ?? "",
      quantity: "1",
      note: "",
    });
    setDialog(kind);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dialog) return;
    setSaving(true);
    try {
      if (dialog === "transfer") {
        await api.post("/api/stock/transfer", {
          productId: form.productId,
          fromWarehouseId: form.warehouseId,
          toWarehouseId: form.toWarehouseId,
          quantity: Number(form.quantity),
          note: form.note || null,
        });
        toast.success("Stock transferred");
      } else {
        await api.post("/api/stock/adjust", {
          productId: form.productId,
          warehouseId: form.warehouseId,
          type: dialog === "in" ? "IN" : dialog === "out" ? "OUT" : "ADJUSTMENT",
          quantity: Number(form.quantity),
          note: form.note || null,
        });
        toast.success("Stock updated");
      }
      setDialog(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setSaving(false);
    }
  };

  const totalUnits = stocks.reduce((s, r) => s + r.quantity, 0);
  const totalValue = stocks.reduce(
    (s, r) => s + r.quantity * (r.product?.costPrice ?? 0),
    0
  );
  const lowCount = stocks.filter(
    (r) => r.quantity <= (r.product?.reorderLevel ?? 0)
  ).length;

  const stockColumns: Column<StockRow>[] = [
    {
      key: "product",
      header: "Product",
      searchValue: (r) => `${r.product?.name ?? ""} ${r.product?.sku ?? ""}`,
      render: (r) => (
        <div>
          <p className="font-medium">{r.product?.name}</p>
          <p className="text-xs text-muted-foreground">
            {r.product?.sku} &middot; {r.product?.category?.name ?? "-"}
          </p>
        </div>
      ),
    },
    {
      key: "warehouse",
      header: "Warehouse",
      searchValue: (r) => r.warehouse?.name ?? "",
      render: (r) => <span className="text-sm">{r.warehouse?.name}</span>,
    },
    {
      key: "quantity",
      header: "Quantity",
      render: (r) => {
        const low = r.quantity <= (r.product?.reorderLevel ?? 0);
        return (
          <div>
            <p className={low ? "font-semibold text-red-600" : "font-medium"}>
              {r.quantity} {r.product?.unit}
            </p>
            <p className="text-xs text-muted-foreground">
              reorder at {r.product?.reorderLevel ?? 0}
            </p>
          </div>
        );
      },
    },
    {
      key: "value",
      header: "Stock value",
      render: (r) => (
        <span className="text-sm">
          {formatCurrency(r.quantity * (r.product?.costPrice ?? 0))}
        </span>
      ),
    },
    {
      key: "updated",
      header: "Last updated",
      render: (r) => (
        <span className="text-xs text-muted-foreground">
          {formatDateTime(r.updatedAt)}
        </span>
      ),
    },
  ];

  const movementColumns: Column<Movement>[] = [
    {
      key: "createdAt",
      header: "When",
      render: (m) => (
        <span className="text-xs text-muted-foreground">
          {formatDateTime(m.createdAt)}
        </span>
      ),
    },
    {
      key: "product",
      header: "Product",
      searchValue: (m) => `${m.product?.name ?? ""} ${m.reference ?? ""}`,
      render: (m) => (
        <div>
          <p className="font-medium">{m.product?.name}</p>
          <p className="text-xs text-muted-foreground">{m.product?.sku}</p>
        </div>
      ),
    },
    {
      key: "warehouse",
      header: "Warehouse",
      render: (m) => <span className="text-sm">{m.warehouse?.name}</span>,
    },
    {
      key: "type",
      header: "Type",
      render: (m) => (
        <span className="text-sm">{MOVEMENT_LABELS[m.type] ?? m.type}</span>
      ),
    },
    {
      key: "quantity",
      header: "Change",
      render: (m) => (
        <span
          className={
            m.quantity >= 0 ? "font-medium text-emerald-600" : "font-medium text-red-600"
          }
        >
          {m.quantity > 0 ? "+" : ""}
          {m.quantity}
        </span>
      ),
    },
    {
      key: "balance",
      header: "Balance",
      render: (m) => <span className="text-sm">{m.balance}</span>,
    },
    {
      key: "reference",
      header: "Reference",
      render: (m) => (
        <div>
          <p className="text-xs">{m.reference ?? "-"}</p>
          <p className="text-xs text-muted-foreground">{m.note ?? ""}</p>
        </div>
      ),
    },
  ];

  if (loading) return <LoadingState label="Loading stock..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader title="Stock Management" description="Live quantities per warehouse">
        {editable && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => openDialog("in")}>
              <Plus className="mr-2 h-4 w-4" /> Stock in
            </Button>
            <Button size="sm" variant="outline" onClick={() => openDialog("out")}>
              <Minus className="mr-2 h-4 w-4" /> Stock out
            </Button>
            <Button size="sm" variant="outline" onClick={() => openDialog("adjust")}>
              <ClipboardCheck className="mr-2 h-4 w-4" /> Adjust
            </Button>
            <Button size="sm" variant="outline" onClick={() => openDialog("transfer")}>
              <ArrowLeftRight className="mr-2 h-4 w-4" /> Transfer
            </Button>
          </div>
        )}
      </PageHeader>

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total units" value={formatNumber(totalUnits)} />
        <StatCard label="Stock value (cost)" value={formatCurrency(totalValue)} />
        <StatCard
          label="Low stock lines"
          value={formatNumber(lowCount)}
          tone={lowCount > 0 ? "danger" : "success"}
        />
      </div>

      <Tabs defaultValue="levels">
        <TabsList>
          <TabsTrigger value="levels">Stock levels</TabsTrigger>
          <TabsTrigger value="movements">
            <History className="mr-2 h-4 w-4" /> Movement history
          </TabsTrigger>
        </TabsList>
        <TabsContent value="levels" className="mt-4">
          <DataTable
            columns={stockColumns}
            rows={stocks}
            searchPlaceholder="Search by product or warehouse..."
            emptyTitle="No stock recorded"
          />
        </TabsContent>
        <TabsContent value="movements" className="mt-4">
          <DataTable
            columns={movementColumns}
            rows={movements}
            searchPlaceholder="Search movements..."
            pageSize={15}
            emptyTitle="No stock movements yet"
          />
        </TabsContent>
      </Tabs>

      <Dialog open={!!dialog} onOpenChange={(v) => !v && setDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialog === "in"
                ? "Stock in"
                : dialog === "out"
                  ? "Stock out"
                  : dialog === "adjust"
                    ? "Stock adjustment (count)"
                    : "Transfer stock"}
            </DialogTitle>
            <DialogDescription>
              {dialog === "adjust"
                ? "Enter the counted quantity; stock is set to this value."
                : dialog === "transfer"
                  ? "Move stock from one warehouse to another."
                  : "Record a manual stock movement."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label>Product</Label>
              <Select
                value={form.productId}
                onValueChange={(v) => setForm({ ...form, productId: v ?? "" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product">
                    {products.find((p) => p.id === form.productId)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{dialog === "transfer" ? "From warehouse" : "Warehouse"}</Label>
              <Select
                value={form.warehouseId}
                onValueChange={(v) => setForm({ ...form, warehouseId: v ?? "" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse">
                    {warehouses.find((w) => w.id === form.warehouseId)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {dialog === "transfer" && (
              <div className="space-y-2">
                <Label>To warehouse</Label>
                <Select
                  value={form.toWarehouseId}
                  onValueChange={(v) => setForm({ ...form, toWarehouseId: v ?? "" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select warehouse">
                      {warehouses.find((w) => w.id === form.toWarehouseId)?.name}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>
                {dialog === "adjust" ? "Counted quantity" : "Quantity"}
              </Label>
              <Input
                type="number"
                min={dialog === "adjust" ? "0" : "1"}
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Note</Label>
              <Input
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Reason or reference"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialog(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !form.productId}>
                {saving ? "Saving..." : "Apply"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
