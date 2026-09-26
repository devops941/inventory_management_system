import { NextRequest } from "next/server";
import {fail, handleError, ok, sessionOf, withManage} from "@/lib/api";
import { receiveOrder } from "@/lib/purchase";

type Ctx = { params: Promise<{ id: string }> };

/** POST /api/purchases/:id/receive - goods received note, updates stock. */
export const POST = withManage("purchases", async (req: NextRequest, ctx: Ctx) => {
  try {
    const { id } = await ctx.params;
    const session = sessionOf(req);
    const order = await receiveOrder(id, session.sub);
    return ok(order);
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (
      message.includes("not found") ||
      message.includes("already received") ||
      message.includes("warehouse") ||
      message.includes("cancelled")
    ) {
      return fail(message, 409);
    }
    return handleError(e);
  }
});
