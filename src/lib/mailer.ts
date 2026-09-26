import nodemailer, { type Transporter } from "nodemailer";

let transporter: Transporter | null = null;

/**
 * Returns a Nodemailer transport when SMTP is configured, otherwise null.
 * The app stays fully functional without SMTP: callers fall back to in-app
 * notifications only.
 */
function getTransport(): Transporter | null {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST) return null;
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT ?? 587),
    secure: Number(SMTP_PORT ?? 587) === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });
  return transporter;
}

export interface MailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Sends an alert email. Failures are logged but never thrown so that a broken
 * SMTP setup cannot block a stock operation.
 */
export async function sendMail({ to, subject, text, html }: MailInput) {
  const tx = getTransport();
  if (!tx) return { skipped: true as const };

  try {
    await tx.sendMail({
      from: process.env.SMTP_FROM ?? "inventory@example.com",
      to,
      subject,
      text,
      html,
    });
    return { sent: true as const };
  } catch (e) {
    console.error("[MAIL ERROR]", e);
    return { failed: true as const };
  }
}

/** Emails every admin/manager who should hear about stock problems. */
export async function sendAlertMail(subject: string, text: string) {
  const recipients = (process.env.ALERT_RECIPIENTS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (recipients.length === 0) return { skipped: true as const };
  return sendMail({ to: recipients.join(","), subject, text });
}
