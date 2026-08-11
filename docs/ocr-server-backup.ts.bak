// src/lib/ocr.ts
// OCR using Google Cloud Vision API (TEXT_DETECTION)
// Falls back to basic regex extraction if Vision API is unavailable

import vision from "@google-cloud/vision";

export interface OcrResult {
  rawText: string;
  extractedName: string | null;
  extractedCedula: string | null;
}

let client: vision.ImageAnnotatorClient | null = null;

function getClient(): vision.ImageAnnotatorClient | null {
  if (client) return client;
  try {
    const credentials = process.env.GOOGLE_CLOUD_CREDENTIALS;
    if (credentials) {
      client = new vision.ImageAnnotatorClient({ credentials: JSON.parse(credentials) });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      client = new vision.ImageAnnotatorClient();
    }
    return client;
  } catch {
    return null;
  }
}

/**
 * Extracts text from an image buffer using Google Cloud Vision OCR.
 */
async function extractTextFromImage(imageBuffer: Buffer): Promise<string> {
  const visionClient = getClient();
  if (!visionClient) return "";

  const [result] = await visionClient.textDetection({
    image: { content: imageBuffer.toString("base64") },
  });

  const fullText = result.fullTextAnnotation?.text ?? "";
  return fullText;
}

/**
 * Parses OCR text from the front of a Colombian cédula.
 * Attempts to extract the full name and cédula number.
 *
 * Colombian cédula format:
 * - Number: 8-10 digits, often preceded by "No." or "C.C."
 * - Name: "APELLIDOS" / "NOMBRES" sections, or labeled lines
 */
export function parseCedulaText(rawText: string): {
  name: string | null;
  cedulaNumber: string | null;
} {
  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Extract cédula number: look for 8-10 digit sequences
  let cedulaNumber: string | null = null;
  const cedulaPatterns = [
    /(?:No\.?|C\.?C\.?|NÚMERO|NUMERO)\s*[:.]?\s*([\d\s.]{8,15})/i,
    /\b(\d{1,3}(?:[.\s]\d{3}){2,3})\b/,    // formatted: 1.069.489.619
    /\b(\d{8,10})\b/,                         // plain: 1069489619
  ];

  for (const pattern of cedulaPatterns) {
    const match = rawText.match(pattern);
    if (match) {
      cedulaNumber = match[1].replace(/[\s.]/g, "");
      if (cedulaNumber.length >= 8 && cedulaNumber.length <= 10) break;
      cedulaNumber = null; // reset if not valid length
    }
  }

  // Extract name: look for APELLIDOS/NOMBRES patterns
  let name: string | null = null;
  const apellidosIdx = lines.findIndex((l) => /APELLIDOS?/i.test(l));
  const nombresIdx = lines.findIndex((l) => /NOMBRES?/i.test(l));

  if (apellidosIdx !== -1 && nombresIdx !== -1) {
    // Name is typically on the lines AFTER the labels
    const apellidos = lines[apellidosIdx + 1] ?? "";
    const nombres = lines[nombresIdx + 1] ?? "";
    if (apellidos && !/APELLIDOS?|NOMBRES?|REPUBLICA|COLOMBIA/i.test(apellidos)) {
      name = `${nombres} ${apellidos}`.trim();
    }
  }

  // Fallback: look for a line with 2+ uppercase words that looks like a name
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
 * Runs OCR on a cédula image and extracts structured data.
 */
export async function ocrCedula(imageBuffer: Buffer): Promise<OcrResult> {
  const rawText = await extractTextFromImage(imageBuffer);
  if (!rawText) {
    return { rawText: "", extractedName: null, extractedCedula: null };
  }
  const { name, cedulaNumber } = parseCedulaText(rawText);
  return {
    rawText,
    extractedName: name,
    extractedCedula: cedulaNumber,
  };
}

/**
 * Compares OCR-extracted data with user profile data.
 * Returns a match result with details.
 */
export function compareWithProfile(
  ocrData: OcrResult,
  profileName: string | null,
  profileCedula: string | null
): { nameMatch: boolean; cedulaMatch: boolean; details: string } {
  const details: string[] = [];

  // Compare cédula number (strip dots and spaces for comparison)
  const normalize = (s: string) => s.replace(/[\s.,-]/g, "").toLowerCase();

  let cedulaMatch = false;
  if (ocrData.extractedCedula && profileCedula) {
    cedulaMatch = normalize(ocrData.extractedCedula) === normalize(profileCedula);
    details.push(
      cedulaMatch
        ? "Número de cédula coincide"
        : `Cédula no coincide: OCR="${ocrData.extractedCedula}" vs perfil="${profileCedula}"`
    );
  } else if (!ocrData.extractedCedula) {
    details.push("No se pudo extraer el número de cédula de la imagen");
  } else {
    details.push("El usuario no tiene número de cédula en su perfil");
  }

  // Compare name (fuzzy: normalize accents, case, extra spaces)
  let nameMatch = false;
  if (ocrData.extractedName && profileName) {
    const normName = (s: string) =>
      s
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();

    const ocrName = normName(ocrData.extractedName);
    const profile = normName(profileName);

    // Check if one contains the other (names may be partial)
    nameMatch = ocrName.includes(profile) || profile.includes(ocrName);

    // Also check word-by-word overlap (at least 2 words match)
    if (!nameMatch) {
      const ocrWords = ocrName.split(" ");
      const profileWords = profile.split(" ");
      const matchingWords = ocrWords.filter((w) => profileWords.includes(w));
      nameMatch = matchingWords.length >= 2;
    }

    details.push(
      nameMatch
        ? "Nombre coincide"
        : `Nombre no coincide: OCR="${ocrData.extractedName}" vs perfil="${profileName}"`
    );
  } else if (!ocrData.extractedName) {
    details.push("No se pudo extraer el nombre de la imagen");
  } else {
    details.push("El usuario no tiene nombre en su perfil");
  }

  return { nameMatch, cedulaMatch, details: details.join(". ") };
}
