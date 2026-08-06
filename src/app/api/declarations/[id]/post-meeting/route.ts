// src/app/api/declarations/[id]/post-meeting/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSessionUser } from "@/lib/session";
import { logAudit, extractRequestMeta } from "@/lib/audit";
import { postMeetingSchema } from "@/lib/validations";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getServerSessionUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const parsed = postMeetingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const declaration = await db.declaration.findUnique({
    where: { id: params.id },
  });

  if (!declaration) {
    return NextResponse.json({ error: "Declaración no encontrada" }, { status: 404 });
  }
  if (declaration.creatorId !== user.id && declaration.invitedId !== user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  if (declaration.status !== "SIGNED" && declaration.status !== "COMPLETED") {
    return NextResponse.json(
      { error: "Solo se puede registrar post-encuentro para declaraciones firmadas" },
      { status: 409 }
    );
  }

  const { status, notes } = parsed.data;

  await db.postMeeting.create({
    data: {
      declarationId: params.id,
      userId: user.id,
      status,
      notes,
    },
  });

  // Once both parties have registered what happened, close out the
  // declaration's lifecycle.
  const postMeetingCount = await db.postMeeting.count({
    where: { declarationId: params.id },
  });
  if (postMeetingCount >= 2 && declaration.status !== "COMPLETED") {
    await db.declaration.update({
      where: { id: params.id },
      data: { status: "COMPLETED" },
    });
  }

  const meta = extractRequestMeta(req);
  await logAudit({
    userId: user.id,
    declarationId: params.id,
    action: "POST_MEETING_REGISTERED",
    details: { status, notes },
    ...meta,
  });

  return NextResponse.json({ registered: true });
}
