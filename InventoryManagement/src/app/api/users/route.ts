import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import {fail, handleError, ok, withManage, withModule} from "@/lib/api";
import { registerSchema } from "@/lib/validators";

export const GET = withModule("users", async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    const status = searchParams.get("status");
    const roleId = searchParams.get("roleId");

    const users = await prisma.user.findMany({
      where: {
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(status ? { status } : {}),
        ...(roleId ? { roleId } : {}),
      },
      include: { role: true },
      orderBy: { createdAt: "desc" },
    });
    return ok(
      users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        status: u.status,
        role: u.role?.name ?? null,
        roleId: u.roleId,
        lastLogin: u.lastLogin,
        createdAt: u.createdAt,
      }))
    );
  } catch (e) {
    return handleError(e);
  }
});

export const POST = withManage("users", async (req: NextRequest) => {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) return fail("Invalid input", 422, parsed.error.flatten());
    const { name, email, password, phone, roleId, status } = parsed.data;

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: await hashPassword(password),
        phone: phone ?? null,
        roleId: roleId ?? null,
        status: status ?? "active",
      },
      include: { role: true },
    });
    return ok(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role?.name ?? null,
        status: user.status,
      },
      201
    );
  } catch (e) {
    return handleError(e);
  }
});
