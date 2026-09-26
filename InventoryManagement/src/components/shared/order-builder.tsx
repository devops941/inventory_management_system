"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/states";
import { api, formatCurrency } from "@/lib/client";

interface Product {
  id: string;
  name: string;
  sku: string;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  quantity: number;
}
interface Option {
  id: string;
  name: string;
}

interface Line {
  key: string;
  productId: string;
  quantity: string;
  price: string;
}

export function OrderBuilder({ mode }: { mode: "purchase" | "sale" }) {
  const router = useRouter();
  const isPurchase = mode === "purchase";

  const [products, setProducts] = useState<Product[]>([]);
  const [parties, setParties] = useState<Option[]>([]);
  const [warehouses, setWarehouses] = useState<Option[]>([]);
  const [partyId, setPartyId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [status, setStatus] = useState(isPurchase ? "pending" : "pending");
  const [paymentStatus, setPaymentStatus] = useState("unpaid");
  const [tax, setTax] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [paidAmount, setPaidAmount] = useState("0");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([
    { key: crypto.randomUUID(), productId: "", quantity: "1", price: "0" },
  ]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, partyList, w] = await Promise.all([
        api.get<Product[]>("/api/products"),
        api.get<Option[]>(isPurchase ? "/api/suppliers" : "/api/customers"),
        api.get<Option[]>("/api/warehouses"),
      ]);
      setProducts(p);
      setParties(partyList);
      setWarehouses(w);
      if (w[0]) setWarehouseId(w[0].id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load form data");
    }
  }, [isPurchase]);

  useEffect(() => {
    load();
  }, [load]);

  const updateLine = (key: string, patch: Partial<Line>) => {
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, ...patch } : l))
    );
  };

  const pickProduct = (key: string, productId: string) => {
    const product = products.find((p) => p.id === productId);
    updateLine(key, {
      productId,
      price: product
        ? String(isPurchase ? product.costPrice : product.sellingPrice)
        : "0",
    });
  };

  const subtotal = useMemo(
    () =>
      lines.reduce(
        (s, l) => s + (Number(l.quantity) || 0) * (Number(l.price) || 0),
        0
      ),
    [lines]
  );
  const total = subtotal + (Number(tax) || 0) - (Number(discount) || 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validLines = lines.filter((l) => l.productId && Number(l.quantity) > 0);
    if (validLines.length === 0) {
      toast.error("Add at least one product line");
      return;
    }
    if (!partyId) {
      toast.error(`Select a ${isPurchase ? "supplier" : "customer"}`);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        [isPurchase ? "supplierId" : "customerId"]: partyId,
        warehouseId: warehouseId || null,
        status,
        ...(isPurchase ? {} : { paymentStatus }),
        ...(isPurchase ? {} : { dueDate: dueDate || null }),
        tax: Number(tax) || 0,
        discount: Number(discount) || 0,
        paidAmount: Number(paidAmount) || 0,
        notes: notes || null,
        items: validLines.map((l) => ({
          productId: l.productId,
          quantity: Number(l.quantity),
          ...(isPurchase
            ? { unitCost: Number(l.price) || 0 }
            : { unitPrice: Number(l.price) || 0 }),
        })),
      };
      const endpoint = isPurchase ? "/api/purchases" : "/api/sales";
      const created = await api.post<{ id: string }>(endpoint, payload);
      toast.success(
        isPurchase ? "Purchase order created" : "Sales order created"
      );
      router.push(`${endpoint}/${created.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <PageHeader
        title={isPurchase ? "New Purchase Order" : "New Sales Order"}
        description={
          isPurchase
            ? "Order stock from a supplier. Receiving the goods updates stock automatically."
            : "Create a customer order. Issuing it deducts stock and generates the invoice."
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Order lines</CardTitle>
            <CardDescription>
              {isPurchase
                ? "Cost price is filled from the product record."
                : "Selling price is filled from the product record."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {lines.map((line) => {
              const product = products.find((p) => p.id === line.productId);
              return (
                <div
                  key={line.key}
                  className="grid grid-cols-12 items-end gap-2 rounded-lg border p-3"
                >
                  <div className="col-span-12 space-y-1 sm:col-span-5">
                    <Label className="text-xs">Product</Label>
                    <Select
                      value={line.productId}
                      onValueChange={(v) => pickProduct(line.key, v ?? "")}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} ({p.sku})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-4 space-y-1 sm:col-span-2">
                    <Label className="text-xs">Qty</Label>
                    <Input
                      type="number"
                      min="1"
                      value={line.quantity}
                      onChange={(e) =>
                        updateLine(line.key, { quantity: e.target.value })
                      }
                    />
                  </div>
                  <div className="col-span-4 space-y-1 sm:col-span-2">
                    <Label className="text-xs">
                      {isPurchase ? "Unit cost" : "Unit price"}
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.price}
                      onChange={(e) =>
                        updateLine(line.key, { price: e.target.value })
                      }
                    />
                  </div>
                  <div className="col-span-3 space-y-1 sm:col-span-2">
                    <Label className="text-xs">Line total</Label>
                    <p className="pt-2 text-sm font-medium">
                      {formatCurrency(
                        (Number(line.quantity) || 0) * (Number(line.price) || 0)
                      )}
                    </p>
                  </div>
                  <div className="col-span-1 flex justify-end sm:col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      disabled={lines.length === 1}
                      onClick={() =>
                        setLines((prev) => prev.filter((l) => l.key !== line.key))
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {product && (
                    <p className="col-span-12 text-xs text-muted-foreground">
                      In stock: {product.quantity} {product.unit}
                      {!isPurchase &&
                        Number(line.quantity) > product.quantity &&
                        " · exceeds available stock"}
                    </p>
                  )}
                </div>
              );
            })}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setLines((prev) => [
                  ...prev,
                  { key: crypto.randomUUID(), productId: "", quantity: "1", price: "0" },
                ])
              }
            >
              <Plus className="mr-2 h-4 w-4" /> Add line
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">
                  {isPurchase ? "Supplier" : "Customer"} *
                </Label>
                <Select value={partyId} onValueChange={(v) => setPartyId(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {parties.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Warehouse</Label>
                <Select value={warehouseId} onValueChange={(v) => setWarehouseId(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select warehouse" />
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
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v ?? "pending")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    {isPurchase ? (
                      <>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="received">
                          Received (updates stock)
                        </SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="issued">
                          Issued (deducts stock)
                        </SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              {!isPurchase && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs">Payment status</Label>
                    <Select value={paymentStatus} onValueChange={(v) => setPaymentStatus(v ?? "unpaid")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unpaid">Unpaid</SelectItem>
                        <SelectItem value="partial">Partial</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Due date</Label>
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>
                </>
              )}
              <div className="space-y-1">
                <Label className="text-xs">Notes</Label>
                <Textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Tax</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={tax}
                    onChange={(e) => setTax(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Discount</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Paid amount</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1 border-t pt-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatCurrency(Number(tax) || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <span>-{formatCurrency(Number(discount) || 0)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 text-base font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Creating..." : "Create order"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
