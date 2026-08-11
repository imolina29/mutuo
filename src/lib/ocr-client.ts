// src/lib/ocr-client.ts
// Client-side OCR using Tesseract.js — runs in the browser, no API costs

import Tesseract from "tesseract.js";

export interface OcrClientResult {
  rawText: string;
  extractedName: string | null;
  extractedCedula: string | null;
}

/**
 * Runs OCR on an image file in the browser using Tesseract.js.
 * Returns extracted text, name, and cédula number.
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
  const { name, cedulaNumber } = parseCedulaText(rawText);

  return { rawText, extractedName: name, extractedCedula: cedulaNumber };
}

/**
 * Parses OCR text from the front of a Colombian cédula.
 */
function parseCedulaText(rawText: string): {
  name: string | null;
  cedulaNumber: string | null;
} {
  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Extract cédula number
  let cedulaNumber: string | null = null;
  const cedulaPatterns = [
    /(?:No\.?|C\.?C\.?|NÚMERO|NUMERO)\s*[:.]?\s*([\d\s.]{8,15})/i,
    /\b(\d{1,3}(?:[.\s]\d{3}){2,3})\b/,
    /\b(\d{8,10})\b/,
  ];

  for (const pattern of cedulaPatterns) {
    const match = rawText.match(pattern);
    if (match) {
      const cleaned = match[1].replace(/[\s.]/g, "");
      if (cleaned.length >= 8 && cleaned.length <= 10) {
        cedulaNumber = cleaned;
        break;
      }
    }
  }

  // Extract name
  let name: string | null = null;
  const apellidosIdx = lines.findIndex((l) => /APELLIDOS?/i.test(l));
  const nombresIdx = lines.findIndex((l) => /NOMBRES?/i.test(l));

  if (apellidosIdx !== -1 && nombresIdx !== -1) {
    const apellidos = lines[apellidosIdx + 1] ?? "";
    const nombres = lines[nombresIdx + 1] ?? "";
    if (apellidos && !/APELLIDOS?|NOMBRES?|REPUBLICA|COLOMBIA/i.test(apellidos)) {
      name = `${nombres} ${apellidos}`.trim();
    }
  }

  if (!name) {
    for (const line of lines) {
      if (/^[A-ZÁÉÍÓÚÑ]{2,}\s+[A-ZÁÉÍÓÚÑ]{2,}(\s+[A-ZÁÉÍÓÚÑ]{2,})*$/.test(line)) {
        if (!/REPUBLICA|COLOMBIA|CEDULA|CIUDADANIA|REGISTRADURIA|IDENTIFICACION|PERSONAL/i.test(line)) {
          name = line;
          break;
        }
      }
    }
  }

  return { name, cedulaNumber };
}

/**
 * Compares OCR data with profile data.
 */
export function compareWithProfile(
  ocrData: OcrClientResult,
  profileName: string,
  profileCedula: string
): { nameMatch: boolean; cedulaMatch: boolean; details: string } {
  const details: string[] = [];
  const normalize = (s: string) => s.replace(/[\s.,-]/g, "").toLowerCase();

  let cedulaMatch = false;
  if (ocrData.extractedCedula) {
    cedulaMatch = normalize(ocrData.extractedCedula) === normalize(profileCedula);
    details.push(cedulaMatch ? "Número de cédula coincide ✓" : "Número de cédula no coincide ✗");
  } else {
    details.push("No se pudo leer el número de cédula");
  }

  let nameMatch = false;
  if (ocrData.extractedName) {
    const normName = (s: string) =>
      s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

    const ocrName = normName(ocrData.extractedName);
    const profile = normName(profileName);

    nameMatch = ocrName.includes(profile) || profile.includes(ocrName);

    if (!nameMatch) {
      const ocrWords = ocrName.split(" ");
      const profileWords = profile.split(" ");
      const matchingWords = ocrWords.filter((w) => profileWords.includes(w));
      nameMatch = matchingWords.length >= 2;
    }

    details.push(nameMatch ? "Nombre coincide ✓" : "Nombre no coincide ✗");
  } else {
    details.push("No se pudo leer el nombre");
  }

  return { nameMatch, cedulaMatch, details: details.join(" · ") };
}
