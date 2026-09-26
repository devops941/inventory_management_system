import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import {fail, handleError, ok, sessionOf, withManage, withModule} from "@/lib/api";
import { issueSalesOrder } from "@/lib/sales";
import { salesOrderSchema } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withModule("sales", async (_req: NextRequest, ctx: Ctx) => {
  try {
    const { id } = await ctx.params;
    const order = await prisma.salesOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        warehouse: true,
        createdBy: { select: { name: true } },
        items: { include: { product: true } },
      },
    });
    if (!order) return fail("Sales order not found", 404);
    return ok(order);
  } catch (e) {
    return handleError(e);
  }
});

export const PUT = withManage("sales", async (req: NextRequest, ctx: Ctx) => {
  try {
    const { id } = await ctx.params;
    const existing = await prisma.salesOrder.findUnique({ where: { id } });
    if (!existing) return fail("Sales order not found", 404);
    if (existing.status === "issued")
      return fail("An issued order cannot be edited", 409);

    const parsed = salesOrderSchema.safeParse(await req.json());
    if (!parsed.success) return fail("Invalid input", 422, parsed.error.flatten());
    const d = parsed.data;

    const items = d.items.map((it) => ({
      productId: it.productId,
      quantity: it.quantity,
      unitPrice: it.unitPrice ?? 0,
      total: (it.unitPrice ?? 0) * it.quantity,
    }));
    const subtotal = items.reduce((s, i) => s + i.total, 0);
    const total = subtotal + d.tax - d.discount;

    await prisma.salesItem.deleteMany({ where: { salesOrderId: id } });
    const order = await prisma.salesOrder.update({
      where: { id },
      data: {
        customerId: d.customerId,
        warehouseId: d.warehouseId || null,
        // See POST /api/sales: keep the order editable until issueSalesOrder runs.
        status: d.status === "issued" ? "confirmed" : d.status,
        paymentStatus: d.paymentStatus,
        dueDate: d.dueDate ?? null,
        subtotal,
        tax: d.tax,
        discount: d.discount,
        total,
        paidAmount: d.paidAmount,
        notes: d.notes ?? null,
        items: { create: items },
      },
      include: { customer: true, warehouse: true, items: { include: { product: true } } },
    });

    if (d.status === "issued") {
      const issued = await issueSalesOrder(order.id, sessionOf(req).sub);
      return ok(issued);
    }
    return ok(order);
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (message.includes("Insufficient") || message.includes("warehouse"))
      return fail(message, 409);
    return handleError(e);
  }
});

export const DELETE = withManage("sales", async (_req: NextRequest, ctx: Ctx) => {
  try {
    const { id } = await ctx.params;
    const existing = await prisma.salesOrder.findUnique({ where: { id } });
    if (!existing) return fail("Sales order not found", 404);
    if (existing.status === "issued")
      return fail("An issued order cannot be deleted; return it instead", 409);
    await prisma.salesItem.deleteMany({ where: { salesOrderId: id } });
    await prisma.salesOrder.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
});
