"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, PackageCheck, Printer, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { LoadingState, ErrorState } from "@/components/shared/states";
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
  dueDate?: string | null;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paidAmount: number;
  notes?: string | null;
  customer?: { name: string; email?: string; phone?: string; address?: string; city?: string } | null;
  warehouse?: { name: string } | null;
  createdBy?: { name: string } | null;
  items: {
    id: string;
    quantity: number;
    unitPrice: number;
    total: number;
    product?: { name: string; sku: string; unit: string } | null;
  }[];
}

export default function SalesDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const editable = canManage(user?.role, "sales");

  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [returning, setReturning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOrder(await api.get<SalesOrder>(`/api/sales/${id}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load order");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const issue = async () => {
    try {
      await api.post(`/api/sales/${id}/issue`);
      toast.success("Stock issued and invoice finalised");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Issue failed");
    }
  };

  const doReturn = async () => {
    try {
      await api.post(`/api/sales/${id}/return`);
      toast.success("Stock returned to the warehouse");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Return failed");
    }
  };

  if (loading) return <LoadingState label="Loading sales order..." />;
  if (error || !order) return <ErrorState message={error ?? "Not found"} onRetry={load} />;

  const balance = order.total - order.paidAmount;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Button variant="ghost" size="sm" render={<Link href="/sales" />}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to sales
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Print invoice
          </Button>
          {editable && order.status !== "issued" && order.status !== "cancelled" && (
            <Button size="sm" onClick={() => setIssuing(true)}>
              <PackageCheck className="mr-2 h-4 w-4" /> Issue stock
            </Button>
          )}
          {editable && order.status === "issued" && (
            <Button variant="outline" size="sm" onClick={() => setReturning(true)}>
              <RotateCcw className="mr-2 h-4 w-4" /> Sales return
            </Button>
          )}
        </div>
      </div>

      <Card className="mx-auto max-w-4xl">
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="text-2xl">Invoice {order.orderNumber}</CardTitle>
            <CardDescription>
              Issued {formatDate(order.orderDate)}
              {order.dueDate ? ` · Due ${formatDate(order.dueDate)}` : ""}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1">
            <StatusBadge value={order.status} />
            <StatusBadge value={order.paymentStatus} />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Bill to
              </p>
              <p className="font-medium">{order.customer?.name ?? "-"}</p>
              <p className="text-sm text-muted-foreground">{order.customer?.address}</p>
              <p className="text-sm text-muted-foreground">{order.customer?.city}</p>
              <p className="text-sm text-muted-foreground">{order.customer?.phone}</p>
              <p className="text-sm text-muted-foreground">{order.customer?.email}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Warehouse
              </p>
              <p className="font-medium">{order.warehouse?.name ?? "-"}</p>
              <p className="mt-2 text-xs font-medium uppercase text-muted-foreground">
                Served by
              </p>
              <p className="text-sm">{order.createdBy?.name ?? "-"}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Amount due
              </p>
              <p className="text-2xl font-semibold">{formatCurrency(balance)}</p>
            </div>
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <p className="font-medium">{item.product?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.product?.sku}
                      </p>
                    </TableCell>
                    <TableCell className="text-right">
                      {item.quantity} {item.product?.unit}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.unitPrice)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end">
            <div className="w-full max-w-xs space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatCurrency(order.tax)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span>-{formatCurrency(order.discount)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-base font-semibold">
                <span>Total</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Paid</span>
                <span>{formatCurrency(order.paidAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Balance</span>
                <span className="font-medium text-red-600">
                  {formatCurrency(balance)}
                </span>
              </div>
            </div>
          </div>

          {order.notes && (
            <div className="rounded-lg bg-muted/40 p-3 text-sm">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Notes
              </p>
              <p>{order.notes}</p>
            </div>
          )}

          <p className="border-t pt-4 text-center text-xs text-muted-foreground">
            Thank you for your business. This is a computer-generated invoice.
          </p>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={issuing}
        onOpenChange={setIssuing}
        title="Issue stock"
        description={`Issue ${order.orderNumber}? Stock will be deducted from ${order.warehouse?.name ?? "the warehouse"}.`}
        confirmLabel="Issue stock"
        onConfirm={issue}
      />
      <ConfirmDialog
        open={returning}
        onOpenChange={setReturning}
        title="Sales return"
        description={`Return all items from ${order.orderNumber} back into stock?`}
        confirmLabel="Process return"
        onConfirm={doReturn}
      />
    </div>
  );
}
