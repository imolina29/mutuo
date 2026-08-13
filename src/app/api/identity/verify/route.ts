// src/app/api/identity/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { db } from "@/lib/db";
import { getServerSessionUser } from "@/lib/session";
import { logAudit, extractRequestMeta } from "@/lib/audit";
import { uploadEncryptedFile } from "@/lib/supabase-storage";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB per file

export async function POST(req: NextRequest) {
  try {
    const user = await getServerSessionUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { id: user.id } });
    if (!dbUser?.cedulaNumber || (!dbUser.nombres && !dbUser.fullName)) {
      return NextResponse.json(
        { error: "Completa tu perfil (nombres, apellidos y número de cédula) antes de verificar tu identidad" },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const cedulaFront = formData.get("cedulaFront") as File | null;
    const cedulaBack = formData.get("cedulaBack") as File | null;
    const selfie = formData.get("selfie") as File | null;

    // OCR data from client-side Tesseract.js
    const ocrRawText = (formData.get("ocrRawText") as string) ?? "";
    const ocrExtractedNombres = (formData.get("ocrExtractedNombres") as string) ?? null;
    const ocrExtractedApellidos = (formData.get("ocrExtractedApellidos") as string) ?? null;
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
        return NextResponse.json({ error: "Cada archivo debe ser menor a 5MB" }, { status: 400 });
      }
    }

    // Validate file types
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    for (const file of [cedulaFront, cedulaBack, selfie]) {
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json({ error: "Solo se permiten imágenes JPG, PNG o WebP" }, { status: 400 });
      }
    }

    // Log only non-PII metadata for debugging
    console.log("[identity/verify] OCR analysis:", {
      rawTextLength: ocrRawText?.length ?? 0,
      hasNombres: !!ocrExtractedNombres,
      hasApellidos: !!ocrExtractedApellidos,
      hasCedula: !!ocrExtractedCedula,
    });

    // --- SECURITY GATE: OCR data is required ---
    if (!ocrRawText || ocrRawText.trim().length < 10) {
      return NextResponse.json(
        {
          error: "No se pudo leer el texto de la cédula.",
          checks: [{ field: "ocr", passed: false, message: "El OCR no pudo extraer texto. Toma la foto con buena iluminación, sin reflejos, y que se vea toda la cédula." }],
        },
        { status: 422 }
      );
    }

    // --- Normalize helpers ---
    const normalizeNum = (s: string) => s.replace(/\D/g, "");
    const cleanOcrName = (s: string) =>
      s.replace(/¡/g, "I").replace(/1(?=[A-Z])/g, "I").replace(/0(?=[A-Z])/g, "O");
    const normName = (s: string) =>
      cleanOcrName(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z\s]/g, "").replace(/\s+/g, " ").trim();

    interface Check { field: string; passed: boolean; message: string; }
    const checks: Check[] = [];

    // --- Compare cédula number ---
    let cedulaMatch = false;
    if (ocrExtractedCedula) {
      const ocrNum = normalizeNum(ocrExtractedCedula);
      const profileNum = normalizeNum(dbUser.cedulaNumber);

      // Exact match
      cedulaMatch = ocrNum === profileNum;

      // Tolerant match: OCR often mangles the first digit (1→4, 1→¡, etc.)
      // If the last 8+ digits match, consider it a match
      if (!cedulaMatch && ocrNum.length >= 8 && profileNum.length >= 8) {
        const ocrSuffix = ocrNum.slice(-8);
        const profileSuffix = profileNum.slice(-8);
        cedulaMatch = ocrSuffix === profileSuffix;
      }

      // Also match if one is a substring of the other (OCR dropped leading digit)
      if (!cedulaMatch) {
        cedulaMatch = profileNum.endsWith(ocrNum) || ocrNum.endsWith(profileNum);
      }

      checks.push({
        field: "cedula",
        passed: cedulaMatch,
        message: cedulaMatch
          ? `Número de cédula coincide (${profileNum})`
          : `Número de cédula no coincide. Se leyó "${ocrNum}" pero tu perfil tiene "${profileNum}". Verifica que tu número de cédula en el perfil sea correcto.`,
      });
    } else {
      checks.push({
        field: "cedula",
        passed: false,
        message: "No se pudo leer el número de cédula. Intenta con una foto más clara donde se vea el número completo.",
      });
    }

    // --- Compare apellidos ---
    let apellidosMatch = false;
    const profileApellidos = dbUser.apellidos ? normName(dbUser.apellidos) : null;
    if (ocrExtractedApellidos && profileApellidos) {
      const ocrApellidos = normName(ocrExtractedApellidos);
      apellidosMatch = ocrApellidos === profileApellidos
        || ocrApellidos.includes(profileApellidos)
        || profileApellidos.includes(ocrApellidos);

      if (!apellidosMatch) {
        const ocrWords = ocrApellidos.split(" ");
        const profileWords = profileApellidos.split(" ");
        const matching = ocrWords.filter((w) => profileWords.includes(w));
        apellidosMatch = matching.length >= 1 && matching.length >= profileWords.length * 0.5;
      }

      checks.push({
        field: "apellidos",
        passed: apellidosMatch,
        message: apellidosMatch
          ? `Apellidos coinciden (${profileApellidos})`
          : `Apellidos no coinciden. Se leyó "${ocrExtractedApellidos}" pero tu perfil tiene "${dbUser.apellidos}".`,
      });
    } else if (!ocrExtractedApellidos) {
      checks.push({
        field: "apellidos",
        passed: false,
        message: "No se pudieron leer los apellidos de la cédula. Intenta con una foto más clara.",
      });
    }

    // --- Compare nombres ---
    let nombresMatch = false;
    const profileNombres = dbUser.nombres ? normName(dbUser.nombres) : null;
    if (ocrExtractedNombres && profileNombres) {
      const ocrNombres = normName(ocrExtractedNombres);
      nombresMatch = ocrNombres === profileNombres
        || ocrNombres.includes(profileNombres)
        || profileNombres.includes(ocrNombres);

      if (!nombresMatch) {
        const ocrWords = ocrNombres.split(" ");
        const profileWords = profileNombres.split(" ");
        const matching = ocrWords.filter((w) => profileWords.includes(w));
        nombresMatch = matching.length >= 1;
      }

      checks.push({
        field: "nombres",
        passed: nombresMatch,
        message: nombresMatch
          ? `Nombres coinciden (${profileNombres})`
          : `Nombres no coinciden. Se leyó "${ocrExtractedNombres}" pero tu perfil tiene "${dbUser.nombres}".`,
      });
    } else if (!ocrExtractedNombres) {
      checks.push({
        field: "nombres",
        passed: false,
        message: "No se pudieron leer los nombres de la cédula. Intenta con una foto más clara.",
      });
    }

    // Fallback: if no nombres/apellidos in profile, compare against fullName
    if (!profileNombres && !profileApellidos && dbUser.fullName) {
      const fullNameNorm = normName(dbUser.fullName);
      const ocrFull = [ocrExtractedNombres, ocrExtractedApellidos].filter(Boolean).join(" ");
      const ocrFullNorm = normName(ocrFull);

      const fullWords = fullNameNorm.split(" ");
      const ocrWords = ocrFullNorm.split(" ");
      const matching = ocrWords.filter((w) => fullWords.includes(w));
      const nameOk = matching.length >= 2;

      checks.push({
        field: "nombre",
        passed: nameOk,
        message: nameOk
          ? "Nombre coincide con el perfil"
          : `Nombre no coincide. Se leyó "${ocrFull}" pero tu perfil tiene "${dbUser.fullName}".`,
      });

      if (nameOk) nombresMatch = true;
    }

    // --- Determine result ---
    // Cédula number match is sufficient — it's unique per person in Colombia.
    // Name matching is advisory (OCR often fails on cédula photos).
    const passed = cedulaMatch;

    if (!passed) {
      const guidance = "El número de cédula no coincide. Verifica que el número en tu perfil sea exactamente el mismo que aparece en tu cédula.";
      return NextResponse.json(
        { error: guidance, checks },
        { status: 422 }
      );
    }

    // --- Calculate score ---
    let matchScore = 0;
    if (cedulaMatch) matchScore += 0.4;
    if (apellidosMatch) matchScore += 0.3;
    if (nombresMatch) matchScore += 0.3;

    // --- Upload encrypted files ---
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

    // --- Save to DB ---
    const allDetails = checks.map((c) => `${c.passed ? "✓" : "✗"} ${c.message}`).join(" | ");

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
        apellidosMatch,
        nombresMatch,
      },
      ...meta,
    });

    return NextResponse.json({ verified: true, matchScore, checks });
  } catch (err) {
    console.error("[identity/verify] Unhandled error:", err);
    return NextResponse.json(
      { error: "Error interno al verificar identidad. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
