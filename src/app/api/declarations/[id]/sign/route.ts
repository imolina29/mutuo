// src/app/api/declarations/[id]/sign/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSessionUser } from "@/lib/session";
import { logAudit, extractRequestMeta } from "@/lib/audit";
import { buildCanonicalDocument, computeHash, requestTimestamp } from "@/lib/seal";
import { sendNotification } from "@/lib/email";
import { isBlocked } from "@/lib/anti-abuse";
import { isValidUuid } from "@/lib/validate-uuid";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isValidUuid(params.id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
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
    let isInvited = declaration.invitedId === user.id;

    // Auto-link invited user via invite token if not yet linked
    if (!isCreator && !isInvited) {
      const token = req.nextUrl.searchParams.get("token");
      if (token && declaration.inviteToken === token && !declaration.invitedId) {
        await db.declaration.update({
          where: { id: params.id },
          data: { invitedId: user.id },
        });
        isInvited = true;
      } else {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
      }
    }

    const otherPartyId = isCreator ? declaration.invitedId : declaration.creatorId;
    if (otherPartyId && (await isBlocked(user.id, otherPartyId))) {
      return NextResponse.json({ error: "No puedes interactuar con este usuario" }, { status: 403 });
    }

    const meta = extractRequestMeta(req);
    const now = new Date();

    // Build identity snapshot for the signing user
    const signerUser = await db.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { fullName: true, nombres: true, apellidos: true, cedulaNumber: true, email: true },
    });
    const signerSnapshot = {
      fullName: signerUser.fullName ?? [signerUser.nombres, signerUser.apellidos].filter(Boolean).join(" "),
      cedulaNumber: signerUser.cedulaNumber,
      email: signerUser.email,
      signedAt: now.toISOString(),
    };

    // --- Transaction with status check INSIDE to prevent race conditions ---
    const result = await db.$transaction(async (tx) => {
      // Re-read status inside transaction (SELECT FOR UPDATE equivalent)
      const current = await tx.declaration.findUniqueOrThrow({
        where: { id: params.id },
        select: { status: true, signedByAAt: true },
      });

      // Validate status inside transaction
      if (isCreator) {
        if (current.status !== "DRAFT" && current.status !== "NEGOTIATING") {
          throw new Error("INVALID_STATUS");
        }
      } else {
        if (current.status !== "PENDING_B") {
          throw new Error("INVALID_STATUS");
        }
      }

      // Save identity snapshot + sign timestamp
      const signData = isCreator
        ? { signedByAAt: now, status: "PENDING_B" as const, creatorSnapshot: signerSnapshot }
        : { signedByBAt: now, invitedSnapshot: signerSnapshot };

      await tx.declaration.update({
        where: { id: params.id },
        data: signData,
      });

      const bothSigned = isCreator ? false : !!current.signedByAAt;

      if (bothSigned) {
        // Mark as SIGNED first (TSA call happens OUTSIDE transaction)
        await tx.declaration.update({
          where: { id: params.id },
          data: { status: "SIGNED" },
        });

        await tx.clause.updateMany({
          where: { declarationId: params.id },
          data: { acceptedByA: true, acceptedByB: true },
        });

        return { status: "SIGNED" as const, sealed: false, needsSeal: true };
      }

      return { status: "pending" as const, sealed: false, needsSeal: false };
    });

    // Handle transaction error
    if (result.status === "SIGNED" && result.needsSeal) {
      // --- TSA call OUTSIDE transaction to avoid timeout ---
      try {
        // Re-read the declaration to get the saved snapshots
        const sealed = await db.declaration.findUniqueOrThrow({
          where: { id: params.id },
          select: { creatorSnapshot: true, invitedSnapshot: true },
        });
        const cSnap = sealed.creatorSnapshot as Record<string, string> | null;
        const iSnap = sealed.invitedSnapshot as Record<string, string> | null;

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
          creator: cSnap ? { fullName: cSnap.fullName ?? "", cedulaNumber: cSnap.cedulaNumber ?? null } : null,
          invited: iSnap ? { fullName: iSnap.fullName ?? "", cedulaNumber: iSnap.cedulaNumber ?? null } : null,
        });

        const hash = computeHash(canonical);
        const tsaResponse = await requestTimestamp(hash);

        await db.declaration.update({
          where: { id: params.id },
          data: {
            sealedHash: hash,
            tsaResponse,
            sealedAt: new Date(),
          },
        });

        // Audit logs
        await logAudit({
          userId: user.id,
          declarationId: params.id,
          action: isCreator ? "DECLARATION_SIGNED_A" : "DECLARATION_SIGNED_B",
          ...meta,
        });
        await logAudit({
          userId: user.id,
          declarationId: params.id,
          action: "DECLARATION_SEALED",
          details: { hash },
          ...meta,
        });

        // Notifications — wrapped in try/catch so they don't fail the operation
        try {
          if (declaration.creator) {
            await sendNotification({
              userId: declaration.creator.id,
              declarationId: params.id,
              type: "DECLARATION_SIGNED",
              recipientEmail: declaration.creator.email,
              recipientName: declaration.creator.fullName ?? "",
              context: { hash },
            });
          }
          if (declaration.invited) {
            await sendNotification({
              userId: declaration.invited.id,
              declarationId: params.id,
              type: "DECLARATION_SIGNED",
              recipientEmail: declaration.invited.email,
              recipientName: declaration.invited.fullName ?? "",
              context: { hash },
            });
          }
        } catch (notifErr) {
          console.error("[sign] Notification error (non-blocking):", notifErr);
        }

        return NextResponse.json({ status: "SIGNED", sealed: true, hash });
      } catch (sealErr) {
        console.error("[sign] TSA sealing error:", sealErr);
        // Declaration is SIGNED but not sealed — return success with warning
        return NextResponse.json({
          status: "SIGNED",
          sealed: false,
          warning: "Firmada pero el sello TSA falló. Se reintentará automáticamente.",
        });
      }
    }

    // Single-party sign (not both signed yet)
    await logAudit({
      userId: user.id,
      declarationId: params.id,
      action: isCreator ? "DECLARATION_SIGNED_A" : "DECLARATION_SIGNED_B",
      ...meta,
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Error && err.message === "INVALID_STATUS") {
      return NextResponse.json({ error: "No se puede firmar en este estado" }, { status: 409 });
    }
    console.error("[sign] Error:", err);
    return NextResponse.json({ error: "Error al firmar la declaración" }, { status: 500 });
  }
}
