import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { AUTH_COOKIE, signToken, verifyPassword } from "@/lib/auth";
import { fail, handleError, ok } from "@/lib/api";
import { loginSchema } from "@/lib/validators";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) return fail("Invalid input", 422, parsed.error.flatten());

    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { role: true },
    });
    if (!user) return fail("Invalid email or password", 401);
    if (user.status === "blocked") return fail("Account is blocked", 403);

    const valid = await verifyPassword(password, user.password);
    if (!valid) return fail("Invalid email or password", 401);

    const roleName = user.role?.name ?? "Sales Staff";
    const token = await signToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: roleName,
      roleId: user.roleId,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const res = ok({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: roleName,
        roleId: user.roleId,
        avatar: user.avatar,
      },
      token,
    });
    res.cookies.set(AUTH_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
    return res;
  } catch (e) {
    return handleError(e);
  }
}
