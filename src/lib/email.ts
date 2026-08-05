// src/lib/email.ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface EmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(params: EmailParams): Promise<void> {
  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "Mutuo <noreply@mutuo.co>",
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
}
