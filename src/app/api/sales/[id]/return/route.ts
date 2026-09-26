import { NextRequest } from "next/server";
import {fail, handleError, ok, sessionOf, withManage} from "@/lib/api";
import { returnSalesOrder } from "@/lib/sales";

type Ctx = { params: Promise<{ id: string }> };

/** POST /api/sales/:id/return - returns issued goods back into stock. */
export const POST = withManage("sales", async (req: NextRequest, ctx: Ctx) => {
  try {
    const { id } = await ctx.params;
    const session = sessionOf(req);
    const order = await returnSalesOrder(id, session.sub);
    return ok(order);
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (
      message.includes("not found") ||
      message.includes("only issued") ||
      message.includes("already returned")
    ) {
      return fail(message, 409);
    }
    return handleError(e);
  }
});
