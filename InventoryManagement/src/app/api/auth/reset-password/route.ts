import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { fail, handleError, ok } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();
    if (!token || !password || String(password).length < 6)
      return fail("Token and a password of at least 6 characters are required", 422);

    const user = await prisma.user.findFirst({
      where: { resetToken: token, resetExpires: { gt: new Date() } },
    });
    if (!user) return fail("Reset token is invalid or has expired", 400);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: await hashPassword(password),
        resetToken: null,
        resetExpires: null,
      },
    });
    return ok({ reset: true });
  } catch (e) {
    return handleError(e);
  }
}
