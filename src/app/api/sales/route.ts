import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import {fail, handleError, nextDocNumber, ok, sessionOf, withManage, withModule} from "@/lib/api";
import { salesOrderSchema } from "@/lib/validators";
import { issueSalesOrder } from "@/lib/sales";

export const GET = withModule("sales", async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const paymentStatus = searchParams.get("paymentStatus");
    const customerId = searchParams.get("customerId");
    const q = searchParams.get("q")?.trim();

    const orders = await prisma.salesOrder.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(paymentStatus ? { paymentStatus } : {}),
        ...(customerId ? { customerId } : {}),
        ...(q ? { orderNumber: { contains: q, mode: "insensitive" } } : {}),
      },
      include: {
        customer: true,
        warehouse: true,
        createdBy: { select: { name: true } },
        items: { include: { product: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return ok(orders);
  } catch (e) {
    return handleError(e);
  }
});

export const POST = withManage("sales", async (req: NextRequest) => {
  try {
    const session = sessionOf(req);
    const parsed = salesOrderSchema.safeParse(await req.json());
    if (!parsed.success) return fail("Invalid input", 422, parsed.error.flatten());
    const d = parsed.data;

    const count = await prisma.salesOrder.count();
    const orderNumber = nextDocNumber("SO", count);

    const items = d.items.map((it) => ({
      productId: it.productId,
      quantity: it.quantity,
      unitPrice: it.unitPrice ?? 0,
      total: (it.unitPrice ?? 0) * it.quantity,
    }));
    const subtotal = items.reduce((s, i) => s + i.total, 0);
    const total = subtotal + d.tax - d.discount;

    const order = await prisma.salesOrder.create({
      data: {
        orderNumber,
        customerId: d.customerId,
        warehouseId: d.warehouseId || null,
        // Create as "confirmed" when the user asked for "issued" so
        // issueSalesOrder runs its availability check and stock deduction.
        status: d.status === "issued" ? "confirmed" : d.status,
        paymentStatus: d.paymentStatus,
        dueDate: d.dueDate ?? null,
        subtotal,
        tax: d.tax,
        discount: d.discount,
        total,
        paidAmount: d.paidAmount,
        notes: d.notes ?? null,
        createdById: session.sub,
        items: { create: items },
      },
      include: {
        customer: true,
        warehouse: true,
        items: { include: { product: true } },
      },
    });

    if (d.status === "issued") {
      const issued = await issueSalesOrder(order.id, session.sub);
      return ok(issued, 201);
    }
    return ok(order, 201);
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (message.includes("Insufficient") || message.includes("warehouse"))
      return fail(message, 409);
    return handleError(e);
  }
});
