// src/app/api/declarations/[id]/post-meeting/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSessionUser } from "@/lib/session";
import { logAudit, extractRequestMeta } from "@/lib/audit";
import { postMeetingSchema } from "@/lib/validations";
import { isValidUuid } from "@/lib/validate-uuid";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isValidUuid(params.id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    const user = await getServerSessionUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

    const parsed = postMeetingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { status, notes } = parsed.data;

    // Use transaction to prevent double-complete race condition
    const result = await db.$transaction(async (tx) => {
      const declaration = await tx.declaration.findUnique({
        where: { id: params.id },
      });

      if (!declaration) throw new Error("NOT_FOUND");
      if (declaration.creatorId !== user.id && declaration.invitedId !== user.id) {
        throw new Error("FORBIDDEN");
      }
      if (declaration.status !== "SIGNED" && declaration.status !== "COMPLETED") {
        throw new Error("INVALID_STATUS");
      }

      await tx.postMeeting.create({
        data: {
          declarationId: params.id,
          userId: user.id,
          status,
          notes,
        },
      });

      const postMeetingCount = await tx.postMeeting.count({
        where: { declarationId: params.id },
      });

      if (postMeetingCount >= 2 && declaration.status !== "COMPLETED") {
        await tx.declaration.update({
          where: { id: params.id },
          data: { status: "COMPLETED" },
        });
      }

      return { registered: true };
    });

    const meta = extractRequestMeta(req);
    await logAudit({
      userId: user.id,
      declarationId: params.id,
      action: "POST_MEETING_REGISTERED",
      details: { status, notes },
      ...meta,
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "NOT_FOUND") {
        return NextResponse.json({ error: "Declaración no encontrada" }, { status: 404 });
      }
      if (err.message === "FORBIDDEN") {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
      }
      if (err.message === "INVALID_STATUS") {
        return NextResponse.json(
          { error: "Solo se puede registrar post-encuentro para declaraciones firmadas" },
          { status: 409 }
        );
      }
    }
    console.error("[post-meeting] Error:", err);
    return NextResponse.json({ error: "Error al registrar post-encuentro" }, { status: 500 });
  }
}
