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
 * Returns extracted text, nombres, apellidos, and cédula number.
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
 * Colombian cédula layout (front):
 *   REPUBLICA DE COLOMBIA
 *   IDENTIFICACION PERSONAL
 *   CEDULA DE CIUDADANIA
 *   NUMERO    1.069.489.619
 *   [APELLIDOS label]
 *   MOLINA RUIZ
 *   [NOMBRES label]
 *   IVAN ERNESTO
 */
function parseCedulaText(rawText: string): {
  nombres: string | null;
  apellidos: string | null;
  cedulaNumber: string | null;
} {
  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // ---- Extract cédula number ----
  let cedulaNumber: string | null = null;

  // Strategy 1: Look for "NUMERO" label followed by number
  const numeroLineIdx = lines.findIndex((l) => /N[UÚ]MERO/i.test(l));
  if (numeroLineIdx !== -1) {
    const numeroLine = lines[numeroLineIdx];
    // Number might be on the same line as NUMERO
    const sameLineMatch = numeroLine.match(/[\d][.\s\d]{7,}/);
    if (sameLineMatch) {
      const cleaned = sameLineMatch[0].replace(/[\s.]/g, "");
      if (cleaned.length >= 8 && cleaned.length <= 10) {
        cedulaNumber = cleaned;
      }
    }
    // Or on the next line
    if (!cedulaNumber && numeroLineIdx + 1 < lines.length) {
      const nextLine = lines[numeroLineIdx + 1];
      const match = nextLine.match(/[\d][.\s\d]{7,}/);
      if (match) {
        const cleaned = match[0].replace(/[\s.]/g, "");
        if (cleaned.length >= 8 && cleaned.length <= 10) {
          cedulaNumber = cleaned;
        }
      }
    }
  }

  // Strategy 2: Look for formatted number pattern (1.069.489.619)
  if (!cedulaNumber) {
    // Match numbers with dots/spaces as thousand separators
    const formattedMatch = rawText.match(/\b(\d{1,3}(?:[.\s]\d{3}){2,3})\b/);
    if (formattedMatch) {
      const cleaned = formattedMatch[1].replace(/[\s.]/g, "");
      if (cleaned.length >= 8 && cleaned.length <= 10) {
        cedulaNumber = cleaned;
      }
    }
  }

  // Strategy 3: Look for any 8-10 digit number (exclude years like 1990, 2024)
  if (!cedulaNumber) {
    const allNumbers = rawText.match(/\b\d{8,10}\b/g) ?? [];
    for (const num of allNumbers) {
      // Skip numbers that look like dates or small numbers
      if (parseInt(num) > 10000000) {
        cedulaNumber = num;
        break;
      }
    }
  }

  // Strategy 4: OCR might split/mangle the leading digit — try joining adjacent numbers
  if (!cedulaNumber) {
    // Look for patterns like "069.489.619" (missing leading 1) preceded by a single digit
    const partialMatch = rawText.match(/(\d)[.\s]*(\d{3})[.\s]*(\d{3})[.\s]*(\d{3})/);
    if (partialMatch) {
      const joined = partialMatch[1] + partialMatch[2] + partialMatch[3] + partialMatch[4];
      if (joined.length >= 8 && joined.length <= 10) {
        cedulaNumber = joined;
      }
    }
  }

  // ---- Extract nombres and apellidos ----
  let nombres: string | null = null;
  let apellidos: string | null = null;

  // Find APELLIDOS and NOMBRES labels
  const apellidosIdx = lines.findIndex((l) => /APELLIDOS?/i.test(l));
  const nombresIdx = lines.findIndex((l) => /\bNOMBRES?\b/i.test(l));

  if (apellidosIdx !== -1) {
    // Check if apellidos value is on the same line (after the label)
    const apellidosLine = lines[apellidosIdx];
    const afterLabel = apellidosLine.replace(/.*APELLIDOS?\s*/i, "").trim();
    if (afterLabel && afterLabel.length > 1 && isNameText(afterLabel)) {
      apellidos = afterLabel;
    } else if (apellidosIdx + 1 < lines.length) {
      // Value is on the next line
      const nextLine = lines[apellidosIdx + 1];
      if (isNameText(nextLine)) {
        apellidos = nextLine;
      }
    }
  }

  if (nombresIdx !== -1) {
    const nombresLine = lines[nombresIdx];
    const afterLabel = nombresLine.replace(/.*NOMBRES?\s*/i, "").trim();
    if (afterLabel && afterLabel.length > 1 && isNameText(afterLabel)) {
      nombres = afterLabel;
    } else if (nombresIdx + 1 < lines.length) {
      const nextLine = lines[nombresIdx + 1];
      if (isNameText(nextLine)) {
        nombres = nextLine;
      }
    }
  }

  // Fallback: if we found apellidos but not nombres (or vice versa), try adjacent lines
  if (apellidos && !nombres && apellidosIdx !== -1) {
    // nombres might be 2 lines after apellidos (apellidos value + nombres label + nombres value)
    for (let i = apellidosIdx + 2; i < Math.min(apellidosIdx + 5, lines.length); i++) {
      if (isNameText(lines[i]) && !/APELLIDOS?|NOMBRES?|FIRMA/i.test(lines[i])) {
        nombres = lines[i];
        break;
      }
    }
  }

  return { nombres, apellidos, cedulaNumber };
}

/**
 * Checks if a string looks like a person's name (uppercase words, no common headers)
 */
function isNameText(text: string): boolean {
  const upper = text.trim().toUpperCase();
  // Must have at least 2 chars, contain letters
  if (upper.length < 2) return false;
  if (!/[A-ZÁÉÍÓÚÑ]/.test(upper)) return false;
  // Exclude common cédula header text
  const excludePatterns = [
    /REPUBLICA/i, /COLOMBIA/i, /CEDULA/i, /CIUDADANIA/i,
    /REGISTRADURIA/i, /IDENTIFICACION/i, /PERSONAL/i,
    /APELLIDOS?/i, /\bNOMBRES?\b/i, /FIRMA/i, /NUMERO/i,
    /FECHA/i, /LUGAR/i, /NACIMIENTO/i, /EXPEDICION/i,
    /SEXO/i, /ESTATURA/i, /GRUPO/i, /RH/i,
  ];
  return !excludePatterns.some((p) => p.test(upper));
}
