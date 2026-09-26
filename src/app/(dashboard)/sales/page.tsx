"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, PackageCheck, Eye, Trash2 } from "lucide-react";
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

interface SalesOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  orderDate: string;
  total: number;
  paidAmount: number;
  customer?: { name: string } | null;
  warehouse?: { name: string } | null;
  items: { quantity: number }[];
}

export default function SalesPage() {
  const { user } = useAuth();
  const editable = canManage(user?.role, "sales");
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<SalesOrder | null>(null);
  const [issuing, setIssuing] = useState<SalesOrder | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOrders(await api.get<SalesOrder[]>("/api/sales"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load sales");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const issue = async () => {
    if (!issuing) return;
    try {
      await api.post(`/api/sales/${issuing.id}/issue`);
      toast.success(`${issuing.orderNumber} issued and stock deducted`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Issue failed");
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    try {
      await api.delete(`/api/sales/${toDelete.id}`);
      toast.success("Sales order deleted");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const filtered =
    status === "all" ? orders : orders.filter((o) => o.status === status);

  const columns: Column<SalesOrder>[] = [
    {
      key: "orderNumber",
      header: "Order",
      searchValue: (r) => `${r.orderNumber} ${r.customer?.name ?? ""}`,
      render: (r) => (
        <div>
          <Link href={`/sales/${r.id}`} className="font-medium hover:underline">
            {r.orderNumber}
          </Link>
          <p className="text-xs text-muted-foreground">{r.customer?.name ?? "-"}</p>
        </div>
      ),
    },
    {
      key: "warehouse",
      header: "Warehouse",
      render: (r) => <span className="text-sm">{r.warehouse?.name ?? "-"}</span>,
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
      key: "date",
      header: "Date",
      render: (r) => (
        <span className="text-xs text-muted-foreground">
          {formatDate(r.orderDate)}
        </span>
      ),
    },
    {
      key: "total",
      header: "Total / Paid",
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
      key: "payment",
      header: "Payment",
      render: (r) => <StatusBadge value={r.paymentStatus} />,
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
            render: (r: SalesOrder) => (
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  render={<Link href={`/sales/${r.id}`} />}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                {r.status !== "issued" && r.status !== "cancelled" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Issue stock"
                    className="text-emerald-600"
                    onClick={() => setIssuing(r)}
                  >
                    <PackageCheck className="h-4 w-4" />
                  </Button>
                )}
                {r.status !== "issued" && (
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

  if (loading) return <LoadingState label="Loading sales orders..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const outstanding = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((s, o) => s + (o.total - o.paidAmount), 0);

  return (
    <div>
      <PageHeader
        title="Sales & Invoices"
        description={`${orders.length} orders · ${formatCurrency(outstanding)} outstanding`}
      >
        {editable && (
          <Button render={<Link href="/sales/new" />}>
            <Plus className="mr-2 h-4 w-4" /> New sales order
          </Button>
        )}
      </PageHeader>

      <DataTable
        columns={columns}
        rows={filtered}
        searchPlaceholder="Search by order number or customer..."
        emptyTitle="No sales orders"
        toolbar={
          <Select value={status} onValueChange={(v) => setStatus(v ?? "all")}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="issued">Issued</SelectItem>
              <SelectItem value="returned">Returned</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <ConfirmDialog
        open={!!issuing}
        onOpenChange={(v) => !v && setIssuing(null)}
        title="Issue stock"
        description={`Issue ${issuing?.orderNumber}? Stock will be deducted from the assigned warehouse and the invoice finalised.`}
        confirmLabel="Issue stock"
        onConfirm={issue}
      />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => !v && setToDelete(null)}
        title="Delete sales order"
        description={`Delete ${toDelete?.orderNumber}? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={remove}
      />
    </div>
  );
}
