import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { handleError, ok, withModule } from "@/lib/api";

export const GET = withModule("alerts", async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unread") === "true";
    const type = searchParams.get("type");

    const notifications = await prisma.notification.findMany({
      where: {
        ...(unreadOnly ? { isRead: false } : {}),
        ...(type ? { type } : {}),
      },
      include: { product: { select: { name: true, sku: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    const unread = await prisma.notification.count({ where: { isRead: false } });
    return ok({ notifications, unread });
  } catch (e) {
    return handleError(e);
  }
});
