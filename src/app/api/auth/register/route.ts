import { NextRequest } from "next/server";

import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { fail, handleError, ok } from "@/lib/api";
import { registerSchema } from "@/lib/validators";

/**
 * Admin-only user creation is handled by /api/users. This endpoint allows
 * self-registration only when no users exist yet (first-run bootstrap),
 * otherwise it is locked down.
 */
export async function POST(req: NextRequest) {
  try {
    const count = await prisma.user.count();
    if (count > 0) {
      return fail("Registration is disabled. Ask an admin to create your account.", 403);
    }
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) return fail("Invalid input", 422, parsed.error.flatten());
    const { name, email, password, phone, roleId } = parsed.data;

    let role = roleId
      ? await prisma.role.findUnique({ where: { id: roleId } })
      : await prisma.role.findUnique({ where: { name: "Admin" } });

    if (!role) {
      role = await prisma.role.create({
        data: { name: "Admin", description: "System administrator" },
      });
    }

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: await hashPassword(password),
        phone: phone ?? null,
        roleId: role.id,
      },
    });
    return ok({ id: user.id, email: user.email }, 201);
  } catch (e) {
    return handleError(e);
  }
}
