import { NextRequest } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { fail, handleError, ok } from "@/lib/api";
import { sendMail } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return fail("Email is required", 422);
    const user = await prisma.user.findUnique({
      where: { email: String(email).toLowerCase() },
    });
    // Always respond success to avoid account enumeration.
    if (!user) return ok({ sent: true });

    const token = crypto.randomBytes(24).toString("hex");
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: token,
        resetExpires: new Date(Date.now() + 1000 * 60 * 30),
      },
    });

    const base = process.env.APP_URL ?? "http://localhost:3000";
    const link = `${base}/reset-password?token=${token}`;
    const mail = await sendMail({
      to: user.email,
      subject: "Reset your Inventory MS password",
      text: `Use this link within 30 minutes to reset your password: ${link}`,
      html: `<p>Use the link below within 30 minutes to reset your password.</p><p><a href="${link}">Reset password</a></p>`,
    });
    // With no SMTP configured (local demo), surface the link on the server
    // console only. It is never returned to the caller: that would let anyone
    // who knows an email address take over the account.
    if (!("sent" in mail)) console.info(`[password-reset] ${user.email} -> ${link}`);

    return ok({ sent: true });
  } catch (e) {
    return handleError(e);
  }
}
