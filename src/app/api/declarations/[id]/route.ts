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
        auditLogs: { orderBy: { timestamp: "desc" } },
      },
    });

    if (!declaration) {
      return NextResponse.json({ error: "Declaración no encontrada" }, { status: 404 });
    }

    if (declaration.creatorId !== user.id && declaration.invitedId !== user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    return NextResponse.json(declaration);
  } catch (err) {
    console.error("[declarations/[id]/GET] Error:", err);
    return NextResponse.json({ error: "Error al obtener la declaración" }, { status: 500 });
  }
}
