// src/app/api/declarations/[id]/revoke/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSessionUser } from "@/lib/session";
import { logAudit, extractRequestMeta } from "@/lib/audit";
import { sendNotification } from "@/lib/email";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
      try {
        await sendNotification({
          userId: otherParty.id,
          declarationId: params.id,
          type: "DECLARATION_REVOKED",
          recipientEmail: otherParty.email,
          recipientName: otherParty.fullName ?? "",
          context: { revokerName: user.fullName ?? "" },
        });
      } catch (notifErr) {
        console.error("[revoke] Notification error (non-blocking):", notifErr);
      }
    }

    return NextResponse.json({ status: "REVOKED" });
  } catch (err) {
    console.error("[revoke] Error:", err);
    return NextResponse.json({ error: "Error al revocar la declaración" }, { status: 500 });
  }
}
