import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import {fail, handleError, ok, sessionOf, withManage, withModule} from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withModule("users", async (_req: NextRequest, ctx: Ctx) => {
  try {
    const { id } = await ctx.params;
    const user = await prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
    if (!user) return fail("User not found", 404);
    return ok({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      status: user.status,
      role: user.role?.name ?? null,
      roleId: user.roleId,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
    });
  } catch (e) {
    return handleError(e);
  }
});

export const PUT = withManage("users", async (req: NextRequest, ctx: Ctx) => {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.email !== undefined) data.email = String(body.email).toLowerCase();
    if (body.phone !== undefined) data.phone = body.phone;
    if (body.roleId !== undefined) data.roleId = body.roleId || null;
    if (body.status !== undefined) data.status = body.status;
    if (body.password) data.password = await hashPassword(body.password);

    const user = await prisma.user.update({
      where: { id },
      data,
      include: { role: true },
    });
    return ok({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role?.name ?? null,
      status: user.status,
    });
  } catch (e) {
    return handleError(e);
  }
});

export const DELETE = withManage("users", async (req: NextRequest, ctx: Ctx) => {
  try {
    const { id } = await ctx.params;
    const session = sessionOf(req);
    if (session.sub === id) return fail("You cannot delete your own account", 400);
    await prisma.user.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
});
