// src/app/api/declarations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSessionUser } from "@/lib/session";
import { logAudit, extractRequestMeta } from "@/lib/audit";
import { createDeclarationSchema } from "@/lib/validations";
import { CLAUSE_TEMPLATES } from "@/lib/clauses";
import { checkAbuseLimit } from "@/lib/anti-abuse";

export async function POST(req: NextRequest) {
  const user = await getServerSessionUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const parsed = createDeclarationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Anti-abuse: max 3 active declarations, 5/day, 24h cooldown after rejections
  const abuseCheck = await checkAbuseLimit(user.id);
  if (!abuseCheck.allowed) {
    return NextResponse.json({ error: abuseCheck.reason }, { status: 429 });
  }

  const { meetingDate, meetingPlace, meetingType, clauses } = parsed.data;

  // Ensure VOLUNTARY_MEETING is always included
  const hasVoluntary = clauses.some((c) => c.type === "VOLUNTARY_MEETING");
  if (!hasVoluntary) {
    const template = CLAUSE_TEMPLATES.find((t) => t.type === "VOLUNTARY_MEETING")!;
    clauses.unshift({ type: "VOLUNTARY_MEETING", text: template.text });
  }

  const declaration = await db.declaration.create({
    data: {
      creatorId: user.id,
      meetingDate: new Date(meetingDate),
      meetingPlace,
      meetingType,
      inviteTokenExpiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
      clauses: {
        create: clauses.map((c) => ({
          type: c.type,
          text: c.text,
          acceptedByA: true,
          acceptedByB: false,
        })),
      },
    },
    select: { id: true, inviteToken: true },
  });

  const meta = extractRequestMeta(req);
  await logAudit({
    userId: user.id,
    declarationId: declaration.id,
    action: "DECLARATION_CREATED",
    details: { meetingDate, meetingPlace, meetingType, clauseCount: clauses.length },
    ...meta,
  });

  return NextResponse.json(declaration, { status: 201 });
}

export async function GET() {
  const user = await getServerSessionUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const declarations = await db.declaration.findMany({
    where: {
      OR: [{ creatorId: user.id }, { invitedId: user.id }],
    },
    include: {
      creator: { select: { id: true, fullName: true, email: true } },
      invited: { select: { id: true, fullName: true, email: true } },
      clauses: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(declarations);
}
