// src/lib/email.ts
import { Resend } from "resend";

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

interface EmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(params: EmailParams): Promise<void> {
  await getResend().emails.send({
    from: process.env.EMAIL_FROM ?? "Mutuo <noreply@mutuo.co>",
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
}
