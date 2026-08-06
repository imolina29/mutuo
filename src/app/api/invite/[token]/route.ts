import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const declaration = await db.declaration.findUnique({
    where: { inviteToken: params.token },
    include: {
      creator: { select: { fullName: true } },
      clauses: { select: { id: true, type: true, text: true, version: true }, orderBy: { type: "asc" } },
    },
  });

  if (!declaration) {
    return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 });
  }

  if (declaration.inviteTokenExpiresAt && declaration.inviteTokenExpiresAt < new Date()) {
    return NextResponse.json({ error: "Esta invitación ha expirado" }, { status: 410 });
  }

  if (declaration.status !== "PENDING_B" && declaration.status !== "NEGOTIATING" && declaration.status !== "PENDING_A") {
    return NextResponse.json({ error: "Esta declaración ya no acepta respuestas" }, { status: 409 });
  }

  return NextResponse.json({
    id: declaration.id,
    status: declaration.status,
    meetingDate: declaration.meetingDate,
    meetingPlace: declaration.meetingPlace,
    meetingType: declaration.meetingType,
    creator: declaration.creator,
    clauses: declaration.clauses,
  });
}
