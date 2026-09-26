import { NextRequest } from "next/server";
import {fail, handleError, ok, sessionOf, withManage} from "@/lib/api";
import { issueSalesOrder } from "@/lib/sales";

type Ctx = { params: Promise<{ id: string }> };

/** POST /api/sales/:id/issue - issues stock and generates the invoice. */
export const POST = withManage("sales", async (req: NextRequest, ctx: Ctx) => {
  try {
    const { id } = await ctx.params;
    const session = sessionOf(req);
    const order = await issueSalesOrder(id, session.sub);
    return ok(order);
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (
      message.includes("not found") ||
      message.includes("already issued") ||
      message.includes("Insufficient") ||
      message.includes("warehouse") ||
      message.includes("cancelled")
    ) {
      return fail(message, 409);
    }
    return handleError(e);
  }
});
