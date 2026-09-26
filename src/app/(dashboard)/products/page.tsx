"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { PageHeader, LoadingState, ErrorState } from "@/components/shared/states";
import { ConfirmDialog, StatusBadge } from "@/components/shared/dialogs";
import { api, formatCurrency, formatDate } from "@/lib/client";
import { useAuth } from "@/components/auth-provider";
import { canManage } from "@/lib/rbac";

interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string | null;
  description?: string | null;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  reorderLevel: number;
  quantity: number;
  status: string;
  expiryDate?: string | null;
  categoryId: string;
  supplierId?: string | null;
  warehouseId?: string | null;
  category?: { name: string } | null;
  supplier?: { name: string } | null;
  warehouse?: { name: string } | null;
}

interface Option {
  id: string;
  name: string;
}

const EMPTY = {
  name: "",
  sku: "",
  barcode: "",
  description: "",
  unit: "pcs",
  costPrice: "0",
  sellingPrice: "0",
  reorderLevel: "0",
  quantity: "0",
  status: "active",
  expiryDate: "",
  categoryId: "",
  supplierId: "",
  warehouseId: "",
};

export default function ProductsPage() {
  const { user } = useAuth();
  const editable = canManage(user?.role, "products");

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [suppliers, setSuppliers] = useState<Option[]>([]);
  const [warehouses, setWarehouses] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Product | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [lowOnly, setLowOnly] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p = await api.get<Product[]>("/api/products");
      setProducts(p);

      // Reference lists power the create/edit form and category filter. They
      // live in modules some roles cannot read (e.g. Sales Staff has no access
      // to categories/suppliers), so a failure here must not break the page.
      const safe = async <T,>(url: string): Promise<T[]> => {
        try {
          return await api.get<T[]>(url);
        } catch {
          return [];
        }
      };
      const [c, s, w] = await Promise.all([
        safe<Option>("/api/categories"),
        safe<Option>("/api/suppliers"),
        safe<Option>("/api/warehouses"),
      ]);
      setCategories(c);
      setSuppliers(s);
      setWarehouses(w);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY, categoryId: categories[0]?.id ?? "" });
    setOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      sku: p.sku,
      barcode: p.barcode ?? "",
      description: p.description ?? "",
      unit: p.unit,
      costPrice: String(p.costPrice),
      sellingPrice: String(p.sellingPrice),
      reorderLevel: String(p.reorderLevel),
      quantity: "0",
      status: p.status,
      expiryDate: p.expiryDate ? p.expiryDate.slice(0, 10) : "",
      categoryId: p.categoryId,
      supplierId: p.supplierId ?? "",
      warehouseId: p.warehouseId ?? "",
    });
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        barcode: form.barcode || null,
        description: form.description || null,
        supplierId: form.supplierId || null,
        warehouseId: form.warehouseId || null,
        expiryDate: form.expiryDate || null,
      };
      if (editing) {
        await api.put(`/api/products/${editing.id}`, payload);
        toast.success("Product updated");
      } else {
        await api.post("/api/products", payload);
        toast.success("Product created");
      }
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    try {
      await api.delete(`/api/products/${toDelete.id}`);
      toast.success("Product deleted");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const filtered = products.filter(
    (p) =>
      (categoryFilter === "all" || p.categoryId === categoryFilter) &&
      (!lowOnly || p.quantity <= p.reorderLevel)
  );

  const columns: Column<Product>[] = [
    {
      key: "name",
      header: "Product",
      searchValue: (r) => `${r.name} ${r.sku} ${r.barcode ?? ""}`,
      render: (r) => (
        <div>
          <p className="font-medium">{r.name}</p>
          <p className="text-xs text-muted-foreground">
            SKU {r.sku}
            {r.barcode ? ` · ${r.barcode}` : ""}
          </p>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      searchValue: (r) => r.category?.name ?? "",
      render: (r) => (
        <span className="text-sm">{r.category?.name ?? "-"}</span>
      ),
    },
    {
      key: "supplier",
      header: "Supplier",
      searchValue: (r) => r.supplier?.name ?? "",
      render: (r) => (
        <span className="text-sm text-muted-foreground">
          {r.supplier?.name ?? "-"}
        </span>
      ),
    },
    {
      key: "price",
      header: "Cost / Sell",
      render: (r) => (
        <div className="text-sm">
          <span className="text-muted-foreground">{formatCurrency(r.costPrice)}</span>
          {" → "}
          <span className="font-medium">{formatCurrency(r.sellingPrice)}</span>
        </div>
      ),
    },
    {
      key: "quantity",
      header: "Stock",
      searchValue: (r) => String(r.quantity),
      render: (r) => (
        <div>
          <p
            className={
              r.quantity <= r.reorderLevel
                ? "font-semibold text-red-600"
                : "font-medium"
            }
          >
            {r.quantity} {r.unit}
          </p>
          <p className="text-xs text-muted-foreground">
            reorder at {r.reorderLevel}
          </p>
        </div>
      ),
    },
    {
      key: "expiry",
      header: "Expiry",
      render: (r) => (
        <span className="text-xs text-muted-foreground">
          {r.expiryDate ? formatDate(r.expiryDate) : "-"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusBadge value={r.status} />,
    },
    ...(editable
      ? [
          {
            key: "actions",
            header: "",
            className: "text-right",
            render: (r: Product) => (
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="icon" onClick={() => openEdit(r)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setToDelete(r)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ),
          },
        ]
      : []),
  ];

  if (loading) return <LoadingState label="Loading products..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader
        title="Products"
        description={`${products.length} products in the catalogue`}
      >
        {editable && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Add product
          </Button>
        )}
      </PageHeader>

      <DataTable
        columns={columns}
        rows={filtered}
        searchPlaceholder="Search by name, SKU or barcode..."
        emptyTitle="No products found"
        emptyDescription="Add your first product to start tracking stock."
        toolbar={
          <>
            <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? "all")}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All categories">
                  {categoryFilter === "all" ? "All categories" : categories.find((c) => c.id === categoryFilter)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={lowOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setLowOnly((v) => !v)}
            >
              <Package className="mr-2 h-4 w-4" /> Low stock only
            </Button>
          </>
        }
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit product" : "Add product"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update the product details. Use the Stock module to change quantities."
                : "Opening stock can be set here for the selected warehouse."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Product name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>SKU *</Label>
              <Input
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Barcode</Label>
              <Input
                value={form.barcode}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select
                value={form.categoryId}
                onValueChange={(v) => setForm({ ...form, categoryId: v ?? "" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category">
                    {categories.find((c) => c.id === form.categoryId)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Supplier</Label>
              <Select
                value={form.supplierId || "none"}
                onValueChange={(v) =>
                  setForm({ ...form, supplierId: !v || v === "none" ? "" : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier">
                    {form.supplierId ? suppliers.find((s) => s.id === form.supplierId)?.name : "None"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Warehouse</Label>
              <Select
                value={form.warehouseId || "none"}
                onValueChange={(v) =>
                  setForm({ ...form, warehouseId: !v || v === "none" ? "" : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse">
                    {form.warehouseId ? warehouses.find((w) => w.id === form.warehouseId)?.name : "None"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <Input
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Cost price</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.costPrice}
                onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Selling price</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.sellingPrice}
                onChange={(e) =>
                  setForm({ ...form, sellingPrice: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Reorder level</Label>
              <Input
                type="number"
                min="0"
                value={form.reorderLevel}
                onChange={(e) =>
                  setForm({ ...form, reorderLevel: e.target.value })
                }
              />
            </div>
            {!editing && (
              <div className="space-y-2">
                <Label>Opening stock</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  disabled={!form.warehouseId}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Expiry date</Label>
              <Input
                type="date"
                value={form.expiryDate}
                onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v ?? "active" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
            </div>
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : editing ? "Update product" : "Create product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => !v && setToDelete(null)}
        title="Delete product"
        description={`Delete "${toDelete?.name}"? Its stock history will also be removed.`}
        confirmLabel="Delete"
        destructive
        onConfirm={remove}
      />
    </div>
  );
}
