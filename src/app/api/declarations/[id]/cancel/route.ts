// src/app/api/declarations/[id]/cancel/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSessionUser } from "@/lib/session";
import { logAudit, extractRequestMeta } from "@/lib/audit";
import { sendNotification } from "@/lib/email";

const CANCELLABLE_STATUSES = ["DRAFT", "PENDING_B", "PENDING_A", "NEGOTIATING", "SIGNED"];

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
    if (!CANCELLABLE_STATUSES.includes(declaration.status)) {
      return NextResponse.json(
        { error: "Esta declaración no se puede cancelar en su estado actual" },
        { status: 409 }
      );
    }

    await db.declaration.update({
      where: { id: params.id },
      data: { status: "CANCELLED" },
    });

    const meta = extractRequestMeta(req);
    await logAudit({
      userId: user.id,
      declarationId: params.id,
      action: "DECLARATION_CANCELLED",
      ...meta,
    });

    const otherParty = declaration.creatorId === user.id ? declaration.invited : declaration.creator;
    if (otherParty) {
      try {
        await sendNotification({
          userId: otherParty.id,
          declarationId: params.id,
          type: "DECLARATION_CANCELLED",
          recipientEmail: otherParty.email,
          recipientName: otherParty.fullName ?? "",
          context: { cancellerName: user.fullName ?? "" },
        });
      } catch (notifErr) {
        console.error("[cancel] Notification error (non-blocking):", notifErr);
      }
    }

    return NextResponse.json({ status: "CANCELLED" });
  } catch (err) {
    console.error("[cancel] Error:", err);
    return NextResponse.json({ error: "Error al cancelar la declaración" }, { status: 500 });
  }
}
