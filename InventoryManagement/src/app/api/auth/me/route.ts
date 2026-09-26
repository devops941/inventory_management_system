import { getSession, ok, fail } from "@/lib/api";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return fail("Unauthorized", 401);
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    include: { role: true },
  });
  if (!user) return fail("Unauthorized", 401);
  return ok({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    avatar: user.avatar,
    status: user.status,
    role: user.role?.name ?? null,
    roleId: user.roleId,
    lastLogin: user.lastLogin,
  });
}
