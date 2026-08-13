// src/lib/ocr-client.ts
// Client-side OCR using Tesseract.js — runs in the browser, no API costs

import Tesseract from "tesseract.js";

export interface OcrClientResult {
  rawText: string;
  extractedNombres: string | null;
  extractedApellidos: string | null;
  extractedCedula: string | null;
}

/**
 * Runs OCR on an image file in the browser using Tesseract.js.
 */
export async function ocrCedulaClient(
  file: File,
  onProgress?: (progress: number) => void
): Promise<OcrClientResult> {
  const result = await Tesseract.recognize(file, "spa", {
    logger: (info) => {
      if (info.status === "recognizing text" && onProgress) {
        onProgress(Math.round(info.progress * 100));
      }
    },
  });

  const rawText = result.data.text;
  console.log("[OCR] Raw text extracted:", rawText);

  const parsed = parseCedulaText(rawText);
  console.log("[OCR] Parsed result:", parsed);

  return {
    rawText,
    extractedNombres: parsed.nombres,
    extractedApellidos: parsed.apellidos,
    extractedCedula: parsed.cedulaNumber,
  };
}

/**
 * Parses OCR text from the front of a Colombian cédula.
 *
 * IMPORTANT: In Colombian cédulas, the VALUE appears BEFORE the label:
 *   GARCÍA LÓPEZ        ← value
 *   APELLIDOS           ← label
 *   MARÍA CAMILA        ← value
 *   NOMBRES             ← label
 *
 * Common OCR errors on cédulas:
 *   - "MARÍA" → "MAR¡A" or "MAR1A" (I confused with ¡ or 1)
 *   - "NOMBRES" → "NDMBRES" or "NQMBRES" (O confused with D/Q)
 *   - Leading digit of number lost or changed (1 → 4, etc)
 *   - "NUMERO" → "NUMER0" (O → 0)
 */
function parseCedulaText(rawText: string): {
  nombres: string | null;
  apellidos: string | null;
  cedulaNumber: string | null;
} {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // ---- Extract cédula number ----
  let cedulaNumber: string | null = null;

  // Strategy 1: Look for "NUMERO" line and extract digits from it
  const numeroLineIdx = lines.findIndex((l) => /N[UÚ]MER[O0]/i.test(l));
  if (numeroLineIdx !== -1) {
    const line = lines[numeroLineIdx];
    // Extract all digit groups from this line
    const digits = line.replace(/[^0-9]/g, "");
    if (digits.length >= 8 && digits.length <= 11) {
      cedulaNumber = digits.length > 10 ? digits.slice(-10) : digits;
    }
    // Also try the next line if this one didn't have enough digits
    if (!cedulaNumber && numeroLineIdx + 1 < lines.length) {
      const nextDigits = lines[numeroLineIdx + 1].replace(/[^0-9]/g, "");
      if (nextDigits.length >= 8 && nextDigits.length <= 10) {
        cedulaNumber = nextDigits;
      }
    }
  }

  // Strategy 2: Find any formatted number (X.XXX.XXX.XXX or X XXX XXX XXX)
  if (!cedulaNumber) {
    const formatted = rawText.match(/(\d{1,3})[.,\s]+(\d{3})[.,\s]+(\d{3})[.,\s]+(\d{3})/);
    if (formatted) {
      cedulaNumber = formatted[1] + formatted[2] + formatted[3] + formatted[4];
    }
  }

  // Strategy 3: Find any 8-10 digit sequence
  if (!cedulaNumber) {
    const nums = rawText.match(/\b\d{8,10}\b/g) ?? [];
    for (const n of nums) {
      if (parseInt(n) > 10000000) { cedulaNumber = n; break; }
    }
  }

  // ---- Extract apellidos and nombres ----
  // Colombian cédula layout: VALUE appears BEFORE the label
  let apellidos: string | null = null;
  let nombres: string | null = null;

  // Find the APELLIDOS label line (may be "APELLIDOS", "APELLIDO", OCR errors)
  const apellidosLabelIdx = lines.findIndex((l) =>
    /^A?P?E?LL?I?D[O0]S?$/i.test(l.replace(/[^A-ZÁÉÍÓÚÑa-záéíóúñ]/g, ""))
  );

  // Find the NOMBRES label line (may be "NOMBRES", "NDMBRES", "NQMBRES", etc.)
  const nombresLabelIdx = lines.findIndex((l) =>
    /^N[O0DQ]?M[BV]R[E3]S?$/i.test(l.replace(/[^A-ZÁÉÍÓÚÑa-záéíóúñ0-9]/g, ""))
  );

  // VALUE is on the line BEFORE the label
  if (apellidosLabelIdx > 0) {
    const candidate = lines[apellidosLabelIdx - 1];
    if (isNameText(candidate)) {
      apellidos = cleanName(candidate);
    }
  }

  if (nombresLabelIdx > 0) {
    const candidate = lines[nombresLabelIdx - 1];
    if (isNameText(candidate)) {
      nombres = cleanName(candidate);
    }
  }

  // Fallback: if we found one label, try to find the other value nearby
  if (apellidos && !nombres && apellidosLabelIdx !== -1) {
    // Look for name-like text after the apellidos label
    for (let i = apellidosLabelIdx + 1; i < Math.min(apellidosLabelIdx + 4, lines.length); i++) {
      if (i === nombresLabelIdx) continue; // skip the NOMBRES label itself
      if (isNameText(lines[i])) {
        nombres = cleanName(lines[i]);
        break;
      }
    }
  }

  if (nombres && !apellidos && nombresLabelIdx !== -1) {
    // Look backward from NOMBRES for a name-like text
    for (let i = nombresLabelIdx - 2; i >= Math.max(0, nombresLabelIdx - 4); i--) {
      if (isNameText(lines[i])) {
        apellidos = cleanName(lines[i]);
        break;
      }
    }
  }

  return { nombres, apellidos, cedulaNumber };
}

/**
 * Cleans a name extracted by OCR — fixes common character substitutions.
 */
function cleanName(text: string): string {
  return text
    .replace(/¡/g, "I")      // ¡VAN → IVAN
    .replace(/1(?=[A-Z])/g, "I") // 1VAN → IVAN
    .replace(/0(?=[A-Z])/g, "O") // 0SCAR → OSCAR
    .replace(/[^\w\sÁÉÍÓÚÑáéíóúñ]/g, "") // Remove stray punctuation
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

/**
 * Checks if a string looks like a person's name (not a header/label)
 */
function isNameText(text: string): boolean {
  const cleaned = text.replace(/[^A-ZÁÉÍÓÚÑa-záéíóúñ\s¡1]/g, "").trim();
  if (cleaned.length < 3) return false;

  // Exclude known header/label text
  const upper = cleaned.toUpperCase();
  const excludes = [
    "REPUBLICA", "COLOMBIA", "CEDULA", "CIUDADANIA",
    "REGISTRADURIA", "IDENTIFICACION", "PERSONAL",
    "FIRMA", "NUMERO", "FECHA", "LUGAR", "NACIMIENTO",
    "EXPEDICION", "SEXO", "ESTATURA", "GRUPO",
  ];

  // If the text IS a label (APELLIDOS, NOMBRES with OCR errors), reject it
  if (/^A?P?E?LL?I?D[O0]S?$/i.test(upper.replace(/\s/g, ""))) return false;
  if (/^N[O0DQ]?M[BV]R[E3]S?$/i.test(upper.replace(/\s/g, ""))) return false;

  return !excludes.some((ex) => upper.includes(ex));
}
