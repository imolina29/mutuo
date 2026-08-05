// src/app/api/declarations/[id]/sign/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSessionUser } from "@/lib/session";
import { logAudit, extractRequestMeta } from "@/lib/audit";
import { buildCanonicalDocument, computeHash, requestTimestamp } from "@/lib/seal";
import { sendEmail } from "@/lib/email";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getServerSessionUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!user.verified) {
    return NextResponse.json(
      { error: "Debes verificar tu identidad antes de firmar" },
      { status: 403 }
    );
  }

  const declaration = await db.declaration.findUnique({
    where: { id: params.id },
    include: {
      creator: { select: { id: true, fullName: true, email: true, cedulaNumber: true } },
      invited: { select: { id: true, fullName: true, email: true, cedulaNumber: true } },
      clauses: true,
    },
  });

  if (!declaration) {
    return NextResponse.json({ error: "Declaración no encontrada" }, { status: 404 });
  }

  const isCreator = declaration.creatorId === user.id;
  const isInvited = declaration.invitedId === user.id;

  // If user is neither creator nor invited, reject
  if (!isCreator && !isInvited) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const meta = extractRequestMeta(req);
  const now = new Date();

  if (isCreator) {
    if (declaration.status !== "DRAFT" && declaration.status !== "NEGOTIATING") {
      return NextResponse.json({ error: "No se puede firmar en este estado" }, { status: 409 });
    }
  } else {
    if (declaration.status !== "PENDING_B") {
      return NextResponse.json({ error: "No se puede firmar en este estado" }, { status: 409 });
    }
  }

  const result = await db.$transaction(async (tx) => {
    const signData = isCreator
      ? { signedByAAt: now, status: "PENDING_B" as const }
      : { signedByBAt: now };

    await tx.declaration.update({
      where: { id: params.id },
      data: signData,
    });

    const bothSigned = isCreator
      ? false
      : !!declaration.signedByAAt;

    if (bothSigned) {
      const canonical = buildCanonicalDocument({
        id: declaration.id,
        creatorId: declaration.creatorId,
        invitedId: declaration.invitedId,
        meetingDate: declaration.meetingDate,
        meetingPlace: declaration.meetingPlace,
        meetingType: declaration.meetingType,
        signedByAAt: declaration.signedByAAt!,
        signedByBAt: now,
        clauses: declaration.clauses.map((c) => ({
          type: c.type,
          text: c.text,
          version: c.version,
        })),
        creator: { fullName: declaration.creator!.fullName ?? "", cedulaNumber: declaration.creator!.cedulaNumber },
        invited: declaration.invited ? { fullName: declaration.invited.fullName ?? "", cedulaNumber: declaration.invited.cedulaNumber } : null,
      });

      const hash = computeHash(canonical);
      const tsaResponse = await requestTimestamp(hash);

      await tx.declaration.update({
        where: { id: params.id },
        data: {
          status: "SIGNED",
          sealedHash: hash,
          tsaResponse,
          sealedAt: new Date(),
        },
      });

      await tx.clause.updateMany({
        where: { declarationId: params.id },
        data: { acceptedByA: true, acceptedByB: true },
      });

      return { status: "SIGNED" as const, sealed: true, hash };
    }

    return { status: "pending" as const, sealed: false };
  });

  await logAudit({
    userId: user.id,
    declarationId: params.id,
    action: isCreator ? "DECLARATION_SIGNED_A" : "DECLARATION_SIGNED_B",
    ...meta,
  });

  if (result.sealed && result.status === "SIGNED") {
    await logAudit({
      userId: user.id,
      declarationId: params.id,
      action: "DECLARATION_SEALED",
      details: { hash: result.hash },
      ...meta,
    });

    if (declaration.creator) {
      await sendEmail({
        to: declaration.creator.email,
        subject: "Declaración de intención mutua firmada y sellada",
        html: `<p>La declaración con ${declaration.invited?.fullName ?? "la otra parte"} ha sido firmada por ambas partes y sellada con validez probatoria.</p><p>Hash del documento: ${result.hash}</p><p>Si necesitas ayuda, llama a la Línea 155.</p>`,
      });
    }
    if (declaration.invited) {
      await sendEmail({
        to: declaration.invited.email,
        subject: "Declaración de intención mutua firmada y sellada",
        html: `<p>La declaración con ${declaration.creator?.fullName ?? "la otra parte"} ha sido firmada por ambas partes y sellada con validez probatoria.</p><p>Hash del documento: ${result.hash}</p><p>Si necesitas ayuda, llama a la Línea 155.</p>`,
      });
    }
  }

  return NextResponse.json(result);
}
