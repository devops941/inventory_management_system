import prisma from "@/lib/prisma";
import { handleError, ok, withAuth } from "@/lib/api";

export const GET = withAuth(async () => {
  try {
    const roles = await prisma.role.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { users: true } } },
    });
    return ok(roles);
  } catch (e) {
    return handleError(e);
  }
});
