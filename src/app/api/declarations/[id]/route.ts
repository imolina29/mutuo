// src/app/api/declarations/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSessionUser } from "@/lib/session";
import { isValidUuid } from "@/lib/validate-uuid";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isValidUuid(params.id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    const user = await getServerSessionUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const declaration = await db.declaration.findUnique({
      where: { id: params.id },
      include: {
        creator: { select: { id: true, fullName: true, email: true } },
        invited: { select: { id: true, fullName: true, email: true } },
        clauses: { orderBy: { type: "asc" } },
        postMeetings: true,
        auditLogs: {
          select: { id: true, action: true, timestamp: true, details: true },
          orderBy: { timestamp: "desc" },
        },
      },
    });

    if (!declaration) {
      return NextResponse.json({ error: "Declaración no encontrada" }, { status: 404 });
    }

    // Check if user is a participant OR has a valid invite token
    const isParticipant = declaration.creatorId === user.id || declaration.invitedId === user.id;
    const token = req.nextUrl.searchParams.get("token");
    const hasValidToken = token && declaration.inviteToken === token;

    if (!isParticipant && !hasValidToken) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    // Auto-link invited user if they have a valid token and aren't linked yet
    if (hasValidToken && !declaration.invitedId && declaration.creatorId !== user.id) {
      await db.declaration.update({
        where: { id: params.id },
        data: { invitedId: user.id },
      });
      declaration.invitedId = user.id;
    }

    // If a participant deleted their account, use the frozen snapshot
    const creatorSnapshot = declaration.creatorSnapshot as Record<string, string> | null;
    const invitedSnapshot = declaration.invitedSnapshot as Record<string, string> | null;

    const response = {
      ...declaration,
      creator: declaration.creator ?? (creatorSnapshot
        ? { id: null, fullName: creatorSnapshot.fullName, email: "(cuenta eliminada)", deleted: true }
        : null),
      invited: declaration.invited ?? (invitedSnapshot
        ? { id: null, fullName: invitedSnapshot.fullName, email: "(cuenta eliminada)", deleted: true }
        : null),
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("[declarations/[id]/GET] Error:", err);
    return NextResponse.json({ error: "Error al obtener la declaración" }, { status: 500 });
  }
}
