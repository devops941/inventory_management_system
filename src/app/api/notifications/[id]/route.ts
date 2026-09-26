import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import {handleError, ok, withModule} from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH /api/notifications/:id  -> mark one read (id can be "all"). */
export const PATCH = withModule("alerts", async (req: NextRequest, ctx: Ctx) => {
  try {
    const { id } = await ctx.params;
    if (id === "all") {
      await prisma.notification.updateMany({
        where: { isRead: false },
        data: { isRead: true },
      });
      return ok({ updated: "all" });
    }
    const notification = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
    return ok(notification);
  } catch (e) {
    return handleError(e);
  }
});

export const DELETE = withModule("alerts", async (_req: NextRequest, ctx: Ctx) => {
  try {
    const { id } = await ctx.params;
    await prisma.notification.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
});
