// src/app/api/identity/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { db } from "@/lib/db";
import { getServerSessionUser } from "@/lib/session";
import { logAudit, extractRequestMeta } from "@/lib/audit";
import { uploadEncryptedFile } from "@/lib/supabase-storage";
import { ocrCedula, compareWithProfile } from "@/lib/ocr";
import { compareFaces } from "@/lib/face-match";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB per file
const FACE_MATCH_THRESHOLD = 0.6; // Minimum face match score to pass

export async function POST(req: NextRequest) {
  const user = await getServerSessionUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // Ensure user has profile data to compare against
  const dbUser = await db.user.findUnique({ where: { id: user.id } });
  if (!dbUser?.fullName || !dbUser?.cedulaNumber) {
    return NextResponse.json(
      { error: "Completa tu perfil (nombre y número de cédula) antes de verificar tu identidad" },
      { status: 400 }
    );
  }

  const formData = await req.formData();
  const cedulaFront = formData.get("cedulaFront") as File | null;
  const cedulaBack = formData.get("cedulaBack") as File | null;
  const selfie = formData.get("selfie") as File | null;

  if (!cedulaFront || !cedulaBack || !selfie) {
    return NextResponse.json(
      { error: "Se requieren las fotos de la cédula (frente y reverso) y una selfie" },
      { status: 400 }
    );
  }

  // Validate file sizes
  for (const file of [cedulaFront, cedulaBack, selfie]) {
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Cada archivo debe ser menor a 5MB" },
        { status: 400 }
      );
    }
  }

  // Validate file types
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  for (const file of [cedulaFront, cedulaBack, selfie]) {
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Solo se permiten imágenes JPG, PNG o WebP" },
        { status: 400 }
      );
    }
  }

  // Read file buffers
  const frontBuffer = Buffer.from(await cedulaFront.arrayBuffer());
  const backBuffer = Buffer.from(await cedulaBack.arrayBuffer());
  const selfieBuffer = Buffer.from(await selfie.arrayBuffer());

  // --- Step 1: OCR on cédula front ---
  let ocrMatch = { nameMatch: false, cedulaMatch: false, details: "" };
  try {
    const ocrResult = await ocrCedula(frontBuffer);
    ocrMatch = compareWithProfile(ocrResult, dbUser.fullName, dbUser.cedulaNumber);

    if (!ocrMatch.cedulaMatch && !ocrMatch.nameMatch) {
      return NextResponse.json(
        {
          error: "Los datos de la cédula no coinciden con tu perfil. Verifica que el nombre y número de cédula sean correctos.",
          details: ocrMatch.details,
        },
        { status: 422 }
      );
    }
  } catch (ocrError) {
    console.error("[identity/verify] OCR error:", ocrError);
    ocrMatch.details = "OCR no disponible, verificación basada en documentos y rostro";
  }

  // --- Step 2: Face matching (selfie vs cédula photo) ---
  let faceResult = { score: 0, details: "" };
  try {
    const faceMatch = await compareFaces(selfieBuffer, frontBuffer);
    faceResult = { score: faceMatch.score, details: faceMatch.details };

    if (!faceMatch.selfieHasFace) {
      return NextResponse.json(
        { error: "No se detectó un rostro en la selfie. Toma la foto de frente con buena iluminación." },
        { status: 422 }
      );
    }

    if (faceMatch.score < FACE_MATCH_THRESHOLD) {
      return NextResponse.json(
        {
          error: "El rostro de la selfie no coincide con la foto de la cédula. Intenta con mejor iluminación.",
          details: faceMatch.details,
        },
        { status: 422 }
      );
    }
  } catch (faceError) {
    console.error("[identity/verify] Face match error:", faceError);
    faceResult.details = "Face matching no disponible, verificación basada en OCR";
  }

  // --- Step 3: Upload encrypted files to Supabase Storage ---
  const folder = `user-${user.id}`;
  const fileId = uuid();

  const [frontPath, backPath, selfiePath] = await Promise.all([
    uploadEncryptedFile(frontBuffer, folder, `cedula-front-${fileId}.enc`),
    uploadEncryptedFile(backBuffer, folder, `cedula-back-${fileId}.enc`),
    uploadEncryptedFile(selfieBuffer, folder, `selfie-${fileId}.enc`),
  ]);

  // --- Step 4: Calculate combined match score ---
  // OCR: 40% weight (20% cédula + 20% name), Face: 60% weight
  let matchScore = 0;
  if (ocrMatch.cedulaMatch) matchScore += 0.2;
  if (ocrMatch.nameMatch) matchScore += 0.2;
  matchScore += faceResult.score * 0.6;

  const allDetails = [ocrMatch.details, faceResult.details].filter(Boolean).join(" | ");

  // --- Step 5: Save to DB ---
  await db.identityVerification.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      cedulaFront: frontPath,
      cedulaBack: backPath,
      selfie: selfiePath,
      matchScore,
      ocrDetails: allDetails,
    },
    update: {
      cedulaFront: frontPath,
      cedulaBack: backPath,
      selfie: selfiePath,
      matchScore,
      ocrDetails: allDetails,
      verifiedAt: new Date(),
    },
  });

  await db.user.update({
    where: { id: user.id },
    data: { verified: true },
  });

  const meta = extractRequestMeta(req);
  await logAudit({
    userId: user.id,
    action: "IDENTITY_VERIFIED",
    details: {
      method: "ocr_face_match",
      matchScore,
      ocrDetails: ocrMatch.details,
      faceDetails: faceResult.details,
    },
    ...meta,
  });

  return NextResponse.json({
    verified: true,
    matchScore,
    details: allDetails,
  });
}
