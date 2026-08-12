// src/app/api/declarations/[id]/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSessionUser } from "@/lib/session";
import { verifyIntegrity } from "@/lib/seal";
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
        creator: { select: { id: true, fullName: true, cedulaNumber: true } },
        invited: { select: { id: true, fullName: true, cedulaNumber: true } },
        clauses: true,
      },
    });

    if (!declaration) {
      return NextResponse.json({ error: "Declaración no encontrada" }, { status: 404 });
    }

    if (declaration.creatorId !== user.id && declaration.invitedId !== user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    if (!declaration.sealedHash) {
      return NextResponse.json(
        { error: "Este documento aún no ha sido sellado" },
        { status: 409 }
      );
    }

    const isIntact = verifyIntegrity(
      {
        id: declaration.id,
        creatorId: declaration.creatorId,
        invitedId: declaration.invitedId,
        meetingDate: declaration.meetingDate,
        meetingPlace: declaration.meetingPlace,
        meetingType: declaration.meetingType,
        signedByAAt: declaration.signedByAAt,
        signedByBAt: declaration.signedByBAt,
        clauses: declaration.clauses.map((c) => ({
          type: c.type,
          text: c.text,
          version: c.version,
        })),
        creator: declaration.creator ? { fullName: declaration.creator.fullName ?? "", cedulaNumber: declaration.creator.cedulaNumber } : null,
        invited: declaration.invited ? { fullName: declaration.invited.fullName ?? "", cedulaNumber: declaration.invited.cedulaNumber } : null,
      },
      declaration.sealedHash
    );

    return NextResponse.json({
      intact: isIntact,
      hash: declaration.sealedHash,
      sealedAt: declaration.sealedAt,
      hasTsaResponse: !!declaration.tsaResponse,
    });
  } catch (err) {
    console.error("[verify] Error:", err);
    return NextResponse.json({ error: "Error al verificar integridad" }, { status: 500 });
  }
}
