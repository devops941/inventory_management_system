import { NextRequest } from "next/server";
import {fail, handleError, ok, sessionOf, withManage} from "@/lib/api";
import { applyStock } from "@/lib/stock";
import { stockAdjustSchema } from "@/lib/validators";

/** POST /api/stock/adjust - stock in / out / adjustment (stock count). */
export const POST = withManage("stock", async (req: NextRequest) => {
  try {
    const session = sessionOf(req);
    const parsed = stockAdjustSchema.safeParse(await req.json());
    if (!parsed.success) return fail("Invalid input", 422, parsed.error.flatten());
    const d = parsed.data;

    const result = await applyStock({
      productId: d.productId,
      warehouseId: d.warehouseId,
      quantity: d.quantity,
      type: d.type,
      referenceType: "adjustment",
      note: d.note ?? `Manual stock ${d.type.toLowerCase()}`,
      createdById: session.sub,
    });
    return ok(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (message.includes("Insufficient") || message.includes("not found"))
      return fail(message, 409);
    return handleError(e);
  }
});
