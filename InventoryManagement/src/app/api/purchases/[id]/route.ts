import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import {fail, handleError, ok, withManage, withModule} from "@/lib/api";
import { receiveOrder } from "@/lib/purchase";
import { purchaseOrderSchema } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withModule("purchases", async (_req: NextRequest, ctx: Ctx) => {
  try {
    const { id } = await ctx.params;
    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        warehouse: true,
        createdBy: { select: { name: true } },
        items: { include: { product: true } },
      },
    });
    if (!order) return fail("Purchase order not found", 404);
    return ok(order);
  } catch (e) {
    return handleError(e);
  }
});

export const PUT = withManage("purchases", async (req: NextRequest, ctx: Ctx) => {
  try {
    const { id } = await ctx.params;
    const existing = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!existing) return fail("Purchase order not found", 404);
    if (existing.status === "received")
      return fail("A received order cannot be edited", 409);

    const body = await req.json();
    const parsed = purchaseOrderSchema.safeParse(body);
    if (!parsed.success) return fail("Invalid input", 422, parsed.error.flatten());
    const d = parsed.data;

    const items = d.items.map((it) => ({
      productId: it.productId,
      quantity: it.quantity,
      unitCost: it.unitCost ?? 0,
      total: (it.unitCost ?? 0) * it.quantity,
    }));
    const subtotal = items.reduce((s, i) => s + i.total, 0);
    const total = subtotal + d.tax - d.discount;

    await prisma.purchaseItem.deleteMany({ where: { purchaseOrderId: id } });
    const order = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        supplierId: d.supplierId,
        warehouseId: d.warehouseId || null,
        // See POST /api/purchases: keep the order editable until receiveOrder runs.
        status: d.status === "received" ? "approved" : d.status,
        expectedDate: d.expectedDate ?? null,
        subtotal,
        tax: d.tax,
        discount: d.discount,
        total,
        paidAmount: d.paidAmount,
        notes: d.notes ?? null,
        items: { create: items },
      },
      include: { supplier: true, warehouse: true, items: { include: { product: true } } },
    });

    if (d.status === "received") {
      const { sessionOf } = await import("@/lib/api");
      const received = await receiveOrder(order.id, sessionOf(req).sub);
      return ok(received);
    }
    return ok(order);
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (message.includes("warehouse")) return fail(message, 409);
    return handleError(e);
  }
});

export const DELETE = withManage("purchases", async (_req: NextRequest, ctx: Ctx) => {
  try {
    const { id } = await ctx.params;
    const existing = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!existing) return fail("Purchase order not found", 404);
    if (existing.status === "received")
      return fail("A received order cannot be deleted; cancel it instead", 409);
    await prisma.purchaseItem.deleteMany({ where: { purchaseOrderId: id } });
    await prisma.purchaseOrder.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
});
