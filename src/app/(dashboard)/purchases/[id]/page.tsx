"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Printer } from "lucide-react";
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

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  status: string;
  orderDate: string;
  expectedDate?: string | null;
  receivedDate?: string | null;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paidAmount: number;
  notes?: string | null;
  supplier?: { name: string; contactPerson?: string; email?: string; phone?: string; address?: string } | null;
  warehouse?: { name: string } | null;
  createdBy?: { name: string } | null;
  items: {
    id: string;
    quantity: number;
    receivedQty: number;
    unitCost: number;
    total: number;
    product?: { name: string; sku: string; unit: string } | null;
  }[];
}

export default function PurchaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const editable = canManage(user?.role, "purchases");

  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOrder(await api.get<PurchaseOrder>(`/api/purchases/${id}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load order");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const receive = async () => {
    try {
      await api.post(`/api/purchases/${id}/receive`);
      toast.success("Goods received and stock updated");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Receiving failed");
    }
  };

  if (loading) return <LoadingState label="Loading purchase order..." />;
  if (error || !order) return <ErrorState message={error ?? "Not found"} onRetry={load} />;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Button variant="ghost" size="sm" render={<Link href="/purchases" />}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to purchases
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          {editable && order.status !== "received" && order.status !== "cancelled" && (
            <Button size="sm" onClick={() => setConfirm(true)}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Receive goods
            </Button>
          )}
        </div>
      </div>

      <Card className="mx-auto max-w-4xl">
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="text-2xl">{order.orderNumber}</CardTitle>
            <CardDescription>
              Purchase order &middot; {formatDate(order.orderDate)}
            </CardDescription>
          </div>
          <div className="text-right">
            <StatusBadge value={order.status} />
            {order.receivedDate && (
              <p className="mt-1 text-xs text-muted-foreground">
                Received {formatDate(order.receivedDate)}
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Supplier
              </p>
              <p className="font-medium">{order.supplier?.name ?? "-"}</p>
              <p className="text-sm text-muted-foreground">
                {order.supplier?.contactPerson}
              </p>
              <p className="text-sm text-muted-foreground">{order.supplier?.phone}</p>
              <p className="text-sm text-muted-foreground">{order.supplier?.email}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Deliver to
              </p>
              <p className="font-medium">{order.warehouse?.name ?? "-"}</p>
              <p className="text-sm text-muted-foreground">
                Expected {order.expectedDate ? formatDate(order.expectedDate) : "-"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Created by
              </p>
              <p className="font-medium">{order.createdBy?.name ?? "-"}</p>
            </div>
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Received</TableHead>
                  <TableHead className="text-right">Unit cost</TableHead>
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
                    <TableCell className="text-right">{item.receivedQty}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.unitCost)}
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
                  {formatCurrency(order.total - order.paidAmount)}
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
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Receive goods"
        description={`Confirm receipt of ${order.orderNumber}. Stock levels will increase for ${order.warehouse?.name ?? "the warehouse"}.`}
        confirmLabel="Receive & update stock"
        onConfirm={receive}
      />
    </div>
  );
}
