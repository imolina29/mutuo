// src/app/api/declarations/[id]/negotiate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSessionUser } from "@/lib/session";
import { logAudit, extractRequestMeta } from "@/lib/audit";
import { negotiateSchema } from "@/lib/validations";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getServerSessionUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const parsed = negotiateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const declaration = await db.declaration.findUnique({
    where: { id: params.id },
    include: { clauses: true },
  });

  if (!declaration) {
    return NextResponse.json({ error: "Declaración no encontrada" }, { status: 404 });
  }

  const isCreator = declaration.creatorId === user.id;
  const isInvited = declaration.invitedId === user.id;

  if (!isCreator && !isInvited) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  // Check valid status for negotiation
  if (isInvited && declaration.status !== "PENDING_B" && declaration.status !== "PENDING_A") {
    return NextResponse.json({ error: "No se pueden proponer cambios en este estado" }, { status: 409 });
  }
  if (isCreator && declaration.status !== "NEGOTIATING") {
    return NextResponse.json({ error: "No se pueden proponer cambios en este estado" }, { status: 409 });
  }

  // Check round limit
  if (declaration.currentRound >= declaration.maxRounds) {
    return NextResponse.json(
      { error: "Se alcanzó el máximo de rondas de negociación. Crea una nueva declaración." },
      { status: 409 }
    );
  }

  const { clauses, meetingDate, meetingPlace, meetingType } = parsed.data;

  // Ensure VOLUNTARY_MEETING is kept
  const hasVoluntary = clauses.some((c) => c.type === "VOLUNTARY_MEETING");
  if (!hasVoluntary) {
    return NextResponse.json(
      { error: "La cláusula de encuentro voluntario es obligatoria" },
      { status: 400 }
    );
  }

  const newRound = declaration.currentRound + 1;
  const nextStatus = isInvited ? "NEGOTIATING" : "PENDING_A";

  await db.$transaction(async (tx) => {
    await tx.clause.deleteMany({ where: { declarationId: params.id } });
    await tx.clause.createMany({
      data: clauses.map((c) => ({
        declarationId: params.id,
        type: c.type,
        text: c.text,
        acceptedByA: isCreator,
        acceptedByB: isInvited,
        version: newRound,
      })),
    });
    await tx.declaration.update({
      where: { id: params.id },
      data: {
        currentRound: newRound,
        status: nextStatus,
        invitedId: isInvited ? user.id : declaration.invitedId,
        ...(meetingDate && { meetingDate: new Date(meetingDate) }),
        ...(meetingPlace && { meetingPlace }),
        ...(meetingType && { meetingType }),
      },
    });
  });

  const meta = extractRequestMeta(req);
  await logAudit({
    userId: user.id,
    declarationId: params.id,
    action: "CHANGES_PROPOSED",
    details: { round: newRound, clauseCount: clauses.length, role: isCreator ? "creator" : "invited" },
    ...meta,
  });

  return NextResponse.json({ round: newRound, status: nextStatus });
}
