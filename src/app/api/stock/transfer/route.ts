import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import {fail, handleError, ok, sessionOf, withManage} from "@/lib/api";
import { applyStock } from "@/lib/stock";
import { transferSchema } from "@/lib/validators";

/** POST /api/stock/transfer - move stock between warehouses atomically. */
export const POST = withManage("stock", async (req: NextRequest) => {
  try {
    const session = sessionOf(req);
    const parsed = transferSchema.safeParse(await req.json());
    if (!parsed.success) return fail("Invalid input", 422, parsed.error.flatten());
    const d = parsed.data;
    if (d.fromWarehouseId === d.toWarehouseId)
      return fail("Source and destination warehouses must differ", 422);

    // Verify the source holds enough before making any change.
    const source = await prisma.stock.findUnique({
      where: {
        productId_warehouseId: {
          productId: d.productId,
          warehouseId: d.fromWarehouseId,
        },
      },
    });
    if ((source?.quantity ?? 0) < d.quantity)
      return fail(
        `Insufficient stock in source warehouse: available ${source?.quantity ?? 0}`,
        409
      );

    const from = await applyStock({
      productId: d.productId,
      warehouseId: d.fromWarehouseId,
      quantity: d.quantity,
      type: "TRANSFER_OUT",
      referenceType: "transfer",
      note: d.note ?? "Warehouse transfer out",
      createdById: session.sub,
    });
    const to = await applyStock({
      productId: d.productId,
      warehouseId: d.toWarehouseId,
      quantity: d.quantity,
      type: "TRANSFER_IN",
      referenceType: "transfer",
      note: d.note ?? "Warehouse transfer in",
      createdById: session.sub,
    });
    return ok({ from, to });
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (message.includes("Insufficient") || message.includes("not found"))
      return fail(message, 409);
    return handleError(e);
  }
});
