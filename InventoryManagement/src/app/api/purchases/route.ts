import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import {fail, handleError, nextDocNumber, ok, sessionOf, withManage, withModule} from "@/lib/api";
import { purchaseOrderSchema } from "@/lib/validators";
import { receiveOrder } from "@/lib/purchase";

export const GET = withModule("purchases", async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const supplierId = searchParams.get("supplierId");
    const q = searchParams.get("q")?.trim();

    const orders = await prisma.purchaseOrder.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(supplierId ? { supplierId } : {}),
        ...(q ? { orderNumber: { contains: q, mode: "insensitive" } } : {}),
      },
      include: {
        supplier: true,
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

export const POST = withManage("purchases", async (req: NextRequest) => {
  try {
    const session = sessionOf(req);
    const parsed = purchaseOrderSchema.safeParse(await req.json());
    if (!parsed.success) return fail("Invalid input", 422, parsed.error.flatten());
    const d = parsed.data;

    const count = await prisma.purchaseOrder.count();
    const orderNumber = nextDocNumber("PO", count);

    const items = d.items.map((it) => ({
      productId: it.productId,
      quantity: it.quantity,
      unitCost: it.unitCost ?? 0,
      total: (it.unitCost ?? 0) * it.quantity,
    }));
    const subtotal = items.reduce((s, i) => s + i.total, 0);
    const total = subtotal + d.tax - d.discount;

    const order = await prisma.purchaseOrder.create({
      data: {
        orderNumber,
        supplierId: d.supplierId,
        warehouseId: d.warehouseId || null,
        // Create as "approved" when the user asked for "received" so the
        // receiveOrder helper can run its full validation and stock push.
        status: d.status === "received" ? "approved" : d.status,
        expectedDate: d.expectedDate ?? null,
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
        supplier: true,
        warehouse: true,
        items: { include: { product: true } },
      },
    });

    // Created directly as received -> push stock through the shared helper.
    if (d.status === "received") {
      const received = await receiveOrder(order.id, session.sub);
      return ok(received, 201);
    }

    return ok(order, 201);
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (message.includes("warehouse")) return fail(message, 409);
    return handleError(e);
  }
});
