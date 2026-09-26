"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, CheckCircle2, Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  status: string;
  orderDate: string;
  expectedDate?: string | null;
  total: number;
  paidAmount: number;
  supplier?: { name: string } | null;
  warehouse?: { name: string } | null;
  items: { quantity: number }[];
}

export default function PurchasesPage() {
  const { user } = useAuth();
  const editable = canManage(user?.role, "purchases");
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<PurchaseOrder | null>(null);
  const [receiving, setReceiving] = useState<PurchaseOrder | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOrders(await api.get<PurchaseOrder[]>("/api/purchases"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load purchases");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const receive = async () => {
    if (!receiving) return;
    try {
      await api.post(`/api/purchases/${receiving.id}/receive`);
      toast.success(`${receiving.orderNumber} received and stock updated`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Receiving failed");
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    try {
      await api.delete(`/api/purchases/${toDelete.id}`);
      toast.success("Purchase order deleted");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const filtered =
    status === "all" ? orders : orders.filter((o) => o.status === status);

  const columns: Column<PurchaseOrder>[] = [
    {
      key: "orderNumber",
      header: "Order",
      searchValue: (r) => `${r.orderNumber} ${r.supplier?.name ?? ""}`,
      render: (r) => (
        <div>
          <Link href={`/purchases/${r.id}`} className="font-medium hover:underline">
            {r.orderNumber}
          </Link>
          <p className="text-xs text-muted-foreground">
            {r.supplier?.name ?? "-"}
          </p>
        </div>
      ),
    },
    {
      key: "warehouse",
      header: "Warehouse",
      render: (r) => (
        <span className="text-sm">{r.warehouse?.name ?? "-"}</span>
      ),
    },
    {
      key: "items",
      header: "Items",
      render: (r) => (
        <span className="text-sm">
          {r.items.reduce((s, i) => s + i.quantity, 0)} units
        </span>
      ),
    },
    {
      key: "dates",
      header: "Ordered / Expected",
      render: (r) => (
        <div className="text-xs text-muted-foreground">
          <p>{formatDate(r.orderDate)}</p>
          <p>{r.expectedDate ? formatDate(r.expectedDate) : "-"}</p>
        </div>
      ),
    },
    {
      key: "total",
      header: "Total",
      render: (r) => (
        <div className="text-sm">
          <p className="font-medium">{formatCurrency(r.total)}</p>
          <p className="text-xs text-muted-foreground">
            paid {formatCurrency(r.paidAmount)}
          </p>
        </div>
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
            render: (r: PurchaseOrder) => (
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  render={<Link href={`/purchases/${r.id}`} />}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                {r.status !== "received" && r.status !== "cancelled" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Receive goods"
                    onClick={() => setReceiving(r)}
                    className="text-emerald-600"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                )}
                {r.status !== "received" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => setToDelete(r)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ),
          },
        ]
      : []),
  ];

  if (loading) return <LoadingState label="Loading purchase orders..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader
        title="Purchase Orders"
        description={`${orders.length} orders · ${orders.filter((o) => o.status === "pending").length} pending`}
      >
        {editable && (
          <Button render={<Link href="/purchases/new" />}>
            <Plus className="mr-2 h-4 w-4" /> New purchase order
          </Button>
        )}
      </PageHeader>

      <DataTable
        columns={columns}
        rows={filtered}
        searchPlaceholder="Search by order number or supplier..."
        emptyTitle="No purchase orders"
        toolbar={
          <Select value={status} onValueChange={(v) => setStatus(v ?? "all")}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="received">Received</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <ConfirmDialog
        open={!!receiving}
        onOpenChange={(v) => !v && setReceiving(null)}
        title="Receive goods"
        description={`Receive ${receiving?.orderNumber}? Stock levels for the assigned warehouse will increase automatically.`}
        confirmLabel="Receive & update stock"
        onConfirm={receive}
      />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => !v && setToDelete(null)}
        title="Delete purchase order"
        description={`Delete ${toDelete?.orderNumber}? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={remove}
      />
    </div>
  );
}
