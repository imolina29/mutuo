// src/lib/email.ts
import { Resend } from "resend";
import { db } from "@/lib/db";
import type { NotificationType } from "@prisma/client";

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

interface NotificationParams {
  userId: string;
  declarationId: string;
  type: NotificationType;
  recipientEmail: string;
  recipientName: string;
  context: Record<string, string>;
}

const TEMPLATES: Record<NotificationType, { subject: string; body: (ctx: Record<string, string>) => string }> = {
  INVITATION_RECEIVED: {
    subject: "Has recibido una declaración de intención mutua",
    body: (ctx) => `<p><strong>${ctx.senderName}</strong> te ha enviado una declaración de intención mutua para un encuentro el <strong>${ctx.meetingDate}</strong> en <strong>${ctx.meetingPlace}</strong>.</p><p><a href="${ctx.inviteUrl}">Ver invitación</a></p>`,
  },
  INVITATION_ACCEPTED: {
    subject: "Tu declaración ha sido aceptada y firmada",
    body: (ctx) => `<p><strong>${ctx.signerName}</strong> ha aceptado y firmado la declaración de intención mutua. El documento ha sido sellado con validez probatoria.</p>`,
  },
  INVITATION_REJECTED: {
    subject: "Tu declaración ha sido rechazada",
    body: (ctx) => `<p><strong>${ctx.responderName}</strong> ha rechazado la declaración de intención mutua.</p>`,
  },
  CHANGES_PROPOSED: {
    subject: "Se han propuesto cambios a la declaración",
    body: (ctx) => `<p><strong>${ctx.proposerName}</strong> ha propuesto cambios a la declaración (ronda ${ctx.round}). Revisa los cambios y decide si los aceptas.</p><p><a href="${ctx.declarationUrl}">Ver cambios</a></p>`,
  },
  CHANGES_ACCEPTED: {
    subject: "Los cambios a la declaración han sido aceptados",
    body: (ctx) => `<p><strong>${ctx.accepterName}</strong> ha aceptado los cambios propuestos.</p>`,
  },
  CHANGES_REJECTED: {
    subject: "Los cambios a la declaración han sido rechazados",
    body: (ctx) => `<p><strong>${ctx.rejectorName}</strong> ha rechazado los cambios propuestos.</p>`,
  },
  DECLARATION_SIGNED: {
    subject: "Declaración de intención mutua sellada",
    body: (ctx) => `<p>La declaración ha sido firmada por ambas partes y sellada. Hash: <code>${ctx.hash}</code></p>`,
  },
  DECLARATION_CANCELLED: {
    subject: "Declaración cancelada",
    body: (ctx) => `<p><strong>${ctx.cancellerName}</strong> ha cancelado la declaración antes del encuentro.</p>`,
  },
  DECLARATION_REVOKED: {
    subject: "Consentimiento de intención revocado",
    body: (ctx) => `<p><strong>${ctx.revokerName}</strong> ha revocado su consentimiento de intención. El consentimiento es revocable en cualquier momento.</p>`,
  },
  POST_MEETING_REMINDER: {
    subject: "Registra cómo fue tu encuentro",
    body: (ctx) => `<p>Tu encuentro con <strong>${ctx.otherName}</strong> ya debió haberse realizado. Te invitamos a registrar cómo fue.</p><p><a href="${ctx.postMeetingUrl}">Registrar</a></p>`,
  },
};

export async function sendNotification(params: NotificationParams): Promise<void> {
  const template = TEMPLATES[params.type];
  if (!template) return;

  const html = `
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
      ${template.body(params.context)}
      <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;" />
      <p style="font-size: 12px; color: #6b7280;">
        Esta declaración es una manifestación de voluntad de encuentro, no una autorización de actividad sexual.
        El consentimiento es revocable en cualquier momento.<br/>
        Línea 155 — Atención a víctimas de violencia de género.
      </p>
      <p style="font-size: 12px; color: #6b7280;">Mutuo — Colombia</p>
    </div>
  `;

  await sendEmail({ to: params.recipientEmail, subject: template.subject, html });

  await db.notification.create({
    data: {
      userId: params.userId,
      declarationId: params.declarationId,
      type: params.type,
      channel: "email",
    },
  });
}
