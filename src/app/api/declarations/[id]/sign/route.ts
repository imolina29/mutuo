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
    // Creator can sign from DRAFT or NEGOTIATING state
    if (declaration.status !== "DRAFT" && declaration.status !== "NEGOTIATING") {
      return NextResponse.json({ error: "No se puede firmar en este estado" }, { status: 409 });
    }

    await db.declaration.update({
      where: { id: params.id },
      data: {
        signedByAAt: now,
        status: "PENDING_B",
      },
    });
    await logAudit({
      userId: user.id,
      declarationId: params.id,
      action: "DECLARATION_SIGNED_A",
      ...meta,
    });
  } else {
    // Invited can sign from PENDING_B state
    if (declaration.status !== "PENDING_B") {
      return NextResponse.json({ error: "No se puede firmar en este estado" }, { status: 409 });
    }

    await db.declaration.update({
      where: { id: params.id },
      data: {
        signedByBAt: now,
        invitedId: user.id,
        status: "PENDING_B", // temporary — will be updated to SIGNED below if A also signed
      },
    });
    await logAudit({
      userId: user.id,
      declarationId: params.id,
      action: "DECLARATION_SIGNED_B",
      ...meta,
    });
  }

  // Reload declaration to check if both have now signed
  const updatedDecl = await db.declaration.findUnique({
    where: { id: params.id },
    include: {
      creator: { select: { id: true, fullName: true, email: true, cedulaNumber: true } },
      invited: { select: { id: true, fullName: true, email: true, cedulaNumber: true } },
      clauses: true,
    },
  });

  if (updatedDecl && updatedDecl.signedByAAt && updatedDecl.signedByBAt) {
    // Both have signed — seal the document
    const canonical = buildCanonicalDocument({
      id: updatedDecl.id,
      creatorId: updatedDecl.creatorId,
      invitedId: updatedDecl.invitedId,
      meetingDate: updatedDecl.meetingDate,
      meetingPlace: updatedDecl.meetingPlace,
      meetingType: updatedDecl.meetingType,
      signedByAAt: updatedDecl.signedByAAt,
      signedByBAt: updatedDecl.signedByBAt,
      clauses: updatedDecl.clauses.map((c) => ({
        type: c.type,
        text: c.text,
        version: c.version,
      })),
      creator: updatedDecl.creator!,
      invited: updatedDecl.invited!,
    });

    const hash = computeHash(canonical);
    const tsaResponse = await requestTimestamp(hash);

    await db.declaration.update({
      where: { id: params.id },
      data: {
        status: "SIGNED",
        sealedHash: hash,
        tsaResponse: tsaResponse,
        sealedAt: new Date(),
      },
    });

    // Mark all clauses as accepted by both
    await db.clause.updateMany({
      where: { declarationId: params.id },
      data: { acceptedByA: true, acceptedByB: true },
    });

    await logAudit({
      userId: user.id,
      declarationId: params.id,
      action: "DECLARATION_SEALED",
      details: { hash },
      ...meta,
    });

    // Notify both parties by email
    if (updatedDecl.creator) {
      await sendEmail({
        to: updatedDecl.creator.email,
        subject: "Declaración de intención mutua firmada y sellada",
        html: `<p>La declaración con ${updatedDecl.invited?.fullName ?? "la otra parte"} ha sido firmada por ambas partes y sellada con validez probatoria.</p><p>Hash del documento: ${hash}</p><p>Si necesitas ayuda, llama a la Línea 155.</p>`,
      });
    }
    if (updatedDecl.invited) {
      await sendEmail({
        to: updatedDecl.invited.email,
        subject: "Declaración de intención mutua firmada y sellada",
        html: `<p>La declaración con ${updatedDecl.creator?.fullName ?? "la otra parte"} ha sido firmada por ambas partes y sellada con validez probatoria.</p><p>Hash del documento: ${hash}</p><p>Si necesitas ayuda, llama a la Línea 155.</p>`,
      });
    }

    return NextResponse.json({ status: "SIGNED", sealed: true, hash });
  }

  return NextResponse.json({ status: "pending", sealed: false });
}
