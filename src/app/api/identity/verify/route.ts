// src/app/api/identity/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { db } from "@/lib/db";
import { getServerSessionUser } from "@/lib/session";
import { logAudit, extractRequestMeta } from "@/lib/audit";
import { uploadEncryptedFile } from "@/lib/supabase-storage";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB per file
const MIN_VERIFICATION_SCORE = 0.2; // At least one check must pass

export async function POST(req: NextRequest) {
  try {
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

    // OCR data from client-side Tesseract.js
    const ocrRawText = (formData.get("ocrRawText") as string) ?? "";
    const ocrExtractedName = (formData.get("ocrExtractedName") as string) ?? null;
    const ocrExtractedCedula = (formData.get("ocrExtractedCedula") as string) ?? null;

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

    // --- SECURITY GATE: OCR data is required ---
    // The client must have successfully run OCR and extracted text.
    // Without OCR data, we cannot verify identity and MUST reject.
    if (!ocrRawText || ocrRawText.trim().length < 10) {
      return NextResponse.json(
        {
          error: "No se pudo leer el texto de la cédula. Asegúrate de que la foto sea clara, con buena iluminación y sin reflejos.",
        },
        { status: 422 }
      );
    }

    // --- Step 1: Server-side validation of OCR data against profile ---
    const normalize = (s: string) => s.replace(/[\s.,-]/g, "").toLowerCase();
    const normName = (s: string) =>
      s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

    let cedulaMatch = false;
    let nameMatch = false;
    const details: string[] = [];

    // Compare cédula number
    if (ocrExtractedCedula) {
      cedulaMatch = normalize(ocrExtractedCedula) === normalize(dbUser.cedulaNumber);
      details.push(cedulaMatch ? "Número de cédula coincide ✓" : "Número de cédula no coincide ✗");
    } else {
      details.push("No se pudo leer el número de cédula del documento");
    }

    // Compare name
    if (ocrExtractedName) {
      const ocrName = normName(ocrExtractedName);
      const profileName = normName(dbUser.fullName);

      nameMatch = ocrName.includes(profileName) || profileName.includes(ocrName);

      if (!nameMatch) {
        const ocrWords = ocrName.split(" ");
        const profileWords = profileName.split(" ");
        const matchingWords = ocrWords.filter((w) => profileWords.includes(w));
        nameMatch = matchingWords.length >= 2;
      }

      details.push(nameMatch ? "Nombre coincide ✓" : "Nombre no coincide ✗");
    } else {
      details.push("No se pudo leer el nombre del documento");
    }

    // Must match at least one field
    if (!cedulaMatch && !nameMatch) {
      return NextResponse.json(
        {
          error: "Los datos de la cédula no coinciden con tu perfil. Verifica que el nombre y número de cédula en tu perfil sean correctos, y que la foto de la cédula sea legible.",
          details: details.join(" · "),
        },
        { status: 422 }
      );
    }

    // Calculate match score
    let matchScore = 0;
    if (cedulaMatch) matchScore += 0.5;
    if (nameMatch) matchScore += 0.5;

    const allDetails = details.join(" · ");

    if (matchScore < MIN_VERIFICATION_SCORE) {
      return NextResponse.json(
        {
          error: "No se pudo verificar tu identidad con los documentos proporcionados.",
          details: allDetails,
          matchScore,
        },
        { status: 422 }
      );
    }

    // --- Step 2: Upload encrypted files to Supabase Storage ---
    const frontBuffer = Buffer.from(await cedulaFront.arrayBuffer());
    const backBuffer = Buffer.from(await cedulaBack.arrayBuffer());
    const selfieBuffer = Buffer.from(await selfie.arrayBuffer());

    const folder = `user-${user.id}`;
    const fileId = uuid();

    const [frontPath, backPath, selfiePath] = await Promise.all([
      uploadEncryptedFile(frontBuffer, folder, `cedula-front-${fileId}.enc`),
      uploadEncryptedFile(backBuffer, folder, `cedula-back-${fileId}.enc`),
      uploadEncryptedFile(selfieBuffer, folder, `selfie-${fileId}.enc`),
    ]);

    // --- Step 3: Save to DB and mark verified ---
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
        method: "client_ocr",
        matchScore,
        cedulaMatch,
        nameMatch,
        ocrExtractedName,
        ocrExtractedCedula: ocrExtractedCedula ? "***" : null, // Don't log full cédula number
        ocrDetails: allDetails,
      },
      ...meta,
    });

    return NextResponse.json({
      verified: true,
      matchScore,
      details: allDetails,
    });
  } catch (err) {
    console.error("[identity/verify] Unhandled error:", err);
    return NextResponse.json(
      { error: "Error interno al verificar identidad. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
