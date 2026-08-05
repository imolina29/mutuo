// src/app/api/declarations/[id]/revoke/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSessionUser } from "@/lib/session";
import { logAudit, extractRequestMeta } from "@/lib/audit";
import { sendEmail } from "@/lib/email";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getServerSessionUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const declaration = await db.declaration.findUnique({
    where: { id: params.id },
    include: {
      creator: { select: { id: true, email: true, fullName: true } },
      invited: { select: { id: true, email: true, fullName: true } },
    },
  });

  if (!declaration) {
    return NextResponse.json({ error: "Declaración no encontrada" }, { status: 404 });
  }
  if (declaration.creatorId !== user.id && declaration.invitedId !== user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  // Consent is revocable at any moment after it has been given — but there
  // must be a signed declaration in place to revoke in the first place.
  if (declaration.status !== "SIGNED") {
    return NextResponse.json(
      { error: "Solo se pueden revocar declaraciones firmadas" },
      { status: 409 }
    );
  }

  await db.declaration.update({
    where: { id: params.id },
    data: { status: "REVOKED" },
  });

  const meta = extractRequestMeta(req);
  await logAudit({
    userId: user.id,
    declarationId: params.id,
    action: "DECLARATION_REVOKED",
    ...meta,
  });

  const otherParty = declaration.creatorId === user.id ? declaration.invited : declaration.creator;
  if (otherParty) {
    await sendEmail({
      to: otherParty.email,
      subject: "Consentimiento de intención revocado",
      html: `<p>${user.fullName} ha revocado su consentimiento de intención en la declaración mutua. El consentimiento es revocable en cualquier momento.</p><p>Si necesitas ayuda, llama a la Línea 155.</p>`,
    });
  }

  return NextResponse.json({ status: "REVOKED" });
}
