// src/app/api/account/delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { db } from "@/lib/db";
import { getServerSessionUser } from "@/lib/session";
import { logAudit, extractRequestMeta } from "@/lib/audit";
import { deleteUserFiles } from "@/lib/supabase-storage";
import { sendEmail } from "@/lib/email";
import { escapeHtml } from "@/lib/escape-html";

export async function DELETE(req: NextRequest) {
  try {
    const user = await getServerSessionUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    if (body.confirmation !== "ELIMINAR") {
      return NextResponse.json(
        { error: "Debes confirmar escribiendo ELIMINAR" },
        { status: 400 }
      );
    }

    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, fullName: true },
    });
    if (!dbUser) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    const email = dbUser.email;
    const name = dbUser.fullName ?? "Usuario";

    // --- Step 1: Delete encrypted identity files from Supabase Storage ---
    try {
      await deleteUserFiles(user.id);
    } catch (err) {
      console.error("[account/delete] Storage cleanup error:", err);
      // Continue — DB deletion is more critical
    }

    // --- Step 2: Anonymize audit logs (keep for legal compliance, remove PII) ---
    // AuditLog.userId is SetNull on user delete, but we also scrub IP/UA
    await db.auditLog.updateMany({
      where: { userId: user.id },
      data: {
        ipAddress: null,
        userAgent: null,
        details: { anonymized: true, deletedAt: new Date().toISOString() },
      },
    });

    // --- Step 3: Log deletion BEFORE deleting user (audit trail for compliance) ---
    const meta = extractRequestMeta(req);
    await logAudit({
      userId: user.id,
      action: "ACCOUNT_DELETED",
      details: {
        reason: "user_requested",
        emailHash: createHash("sha256").update(email).digest("hex"),
      },
      ...meta,
    });

    // --- Step 4: Delete user ---
    // Schema cascades: Identity, Notifications, Blocks, Reports, PostMeetings → deleted
    // Schema SetNull: Declarations (creatorId/invitedId), AuditLogs (userId) → preserved
    await db.user.delete({ where: { id: user.id } });

    // --- Step 5: Send confirmation email ---
    try {
      await sendEmail({
        to: email,
        subject: "Tus datos han sido eliminados — Mutuo",
        html: `
          <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1e3a5f;">Mutuo</h2>
            <p>Hola ${escapeHtml(name)},</p>
            <p>Confirmamos que tu cuenta y todos tus datos personales han sido eliminados de forma permanente de nuestra plataforma, en cumplimiento de la <strong>Ley 1581 de 2012</strong> (Habeas Data).</p>
            <h3 style="color: #1e3a5f;">Datos eliminados:</h3>
            <ul>
              <li>Información personal (nombre, correo, teléfono, cédula)</li>
              <li>Fotografías de identidad (cédula y selfie)</li>
              <li>Notificaciones y preferencias</li>
              <li>Bloqueos y reportes</li>
            </ul>
            <h3 style="color: #1e3a5f;">Datos retenidos (obligación legal):</h3>
            <ul>
              <li>Registros de auditoría anonimizados (sin datos personales identificables)</li>
              <li>Declaraciones selladas donde participaste (requerimiento legal Ley 527/1999)</li>
            </ul>
            <p>Si no solicitaste esta eliminación, contacta inmediatamente a soporte.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb;" />
            <p style="font-size: 12px; color: #6b7280;">
              Este correo fue enviado como confirmación de eliminación de datos conforme a la Ley 1581 de 2012.
              No es necesario responder.
            </p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error("[account/delete] Confirmation email error:", emailErr);
    }

    return NextResponse.json({
      deleted: true,
      message: "Tu cuenta y datos personales han sido eliminados. Recibirás un correo de confirmación.",
    });
  } catch (err) {
    console.error("[account/delete] Error:", err);
    return NextResponse.json(
      { error: "Error al eliminar la cuenta. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
