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
 * Preprocesses an image for OCR: converts to high-contrast grayscale
 * using an off-screen canvas. This dramatically improves Tesseract accuracy
 * on Colombian cédulas (colorful backgrounds, holograms, security patterns).
 */
async function preprocessImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      // Scale up small images for better OCR
      const scale = Math.max(1, 1500 / Math.max(img.width, img.height));
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d")!;

      // Draw original
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Get pixel data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Convert to grayscale with high contrast
      for (let i = 0; i < data.length; i += 4) {
        // Weighted grayscale (luminance)
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

        // Apply contrast enhancement (stretch histogram)
        // Threshold-style: push toward black or white
        const contrast = 1.8; // contrast factor
        const mid = 128;
        let val = mid + (gray - mid) * contrast;
        val = Math.max(0, Math.min(255, val));

        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
      }

      ctx.putImageData(imageData, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Canvas toBlob failed"));
        },
        "image/png"
      );
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Runs OCR on a cédula image in the browser using Tesseract.js.
 * Preprocesses the image first for better accuracy.
 */
export async function ocrCedulaClient(
  file: File,
  onProgress?: (progress: number) => void
): Promise<OcrClientResult> {
  // Preprocess: convert to high-contrast grayscale
  let imageInput: File | Blob = file;
  try {
    imageInput = await preprocessImage(file);
  } catch (e) {
    console.warn("[OCR] Preprocessing failed, using original:", e);
  }

  const result = await Tesseract.recognize(imageInput, "spa", {
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
 *   - Labels sometimes merged with values on same line
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

  // Strategy 1: Look for "NUMERO" line and extract digits from it or next line
  const numeroLineIdx = lines.findIndex((l) => /N[UÚ]MER[O0]/i.test(l));
  if (numeroLineIdx !== -1) {
    const line = lines[numeroLineIdx];
    const digits = line.replace(/[^0-9]/g, "");
    if (digits.length >= 8 && digits.length <= 11) {
      cedulaNumber = digits.length > 10 ? digits.slice(-10) : digits;
    }
    if (!cedulaNumber && numeroLineIdx + 1 < lines.length) {
      const nextDigits = lines[numeroLineIdx + 1].replace(/[^0-9]/g, "");
      if (nextDigits.length >= 8 && nextDigits.length <= 10) {
        cedulaNumber = nextDigits;
      }
    }
    // Also check same line after "NUMERO" keyword — e.g. "NUMERO 1.073.824.181"
    if (!cedulaNumber) {
      const afterNumero = line.replace(/.*N[UÚ]MER[O0]\s*/i, "");
      const formatted = afterNumero.match(/(\d[\d.,\s]*\d)/);
      if (formatted) {
        const cleaned = formatted[1].replace(/[^0-9]/g, "");
        if (cleaned.length >= 8) cedulaNumber = cleaned;
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
  let apellidos: string | null = null;
  let nombres: string | null = null;

  // --- Strategy A: Label-based (most reliable when labels are found) ---

  // Find APELLIDOS label — handle common OCR errors
  const apellidosLabelIdx = lines.findIndex((l) => {
    const cleaned = l.replace(/[^A-ZÁÉÍÓÚÑa-záéíóúñ]/g, "").toUpperCase();
    return /^A?P?E?LL?I?D[O0]S?$/.test(cleaned) || /APELLID/i.test(l);
  });

  // Find NOMBRES label — handle common OCR errors
  const nombresLabelIdx = lines.findIndex((l) => {
    const cleaned = l.replace(/[^A-ZÁÉÍÓÚÑa-záéíóúñ0-9]/g, "").toUpperCase();
    return /^N[O0DQ]?M[BV]R[E3]S?$/.test(cleaned) || /NOMBRE/i.test(l);
  });

  // VALUE is on the line BEFORE the label
  if (apellidosLabelIdx > 0) {
    const candidate = lines[apellidosLabelIdx - 1];
    if (isNameText(candidate)) {
      apellidos = cleanName(candidate);
    }
    // Also try: label and value might be on the same line (e.g. "NEGRETE DURANGO APELLIDOS")
    if (!apellidos) {
      const sameLineMatch = lines[apellidosLabelIdx].replace(/APELLID\w*/i, "").trim();
      if (sameLineMatch && isNameText(sameLineMatch)) {
        apellidos = cleanName(sameLineMatch);
      }
    }
  }

  if (nombresLabelIdx > 0) {
    const candidate = lines[nombresLabelIdx - 1];
    if (isNameText(candidate)) {
      nombres = cleanName(candidate);
    }
    if (!nombres) {
      const sameLineMatch = lines[nombresLabelIdx].replace(/N[O0DQ]?M[BV]R[E3]S?\w*/i, "").trim();
      if (sameLineMatch && isNameText(sameLineMatch)) {
        nombres = cleanName(sameLineMatch);
      }
    }
  }

  // --- Strategy B: Position-based (when labels aren't found) ---
  // On Colombian cédulas, the layout is typically:
  //   NUMERO  X.XXX.XXX.XXX
  //   [APELLIDOS_VALUE]
  //   APELLIDOS
  //   [NOMBRES_VALUE]
  //   NOMBRES
  //   [FIRMA_VALUE]
  //   FIRMA
  if (!apellidos || !nombres) {
    // Find the position of the cédula number
    const numberLineIdx = lines.findIndex((l) => {
      const digits = l.replace(/[^0-9]/g, "");
      return digits.length >= 8 && cedulaNumber && digits.includes(cedulaNumber.slice(-6));
    });

    // Find FIRMA line (usually at the bottom)
    const firmaLineIdx = lines.findIndex((l) => /^F[I1]RMA$/i.test(l.replace(/[^A-Za-z]/g, "")));

    if (numberLineIdx !== -1) {
      // Collect name-like lines between the number and FIRMA/end
      const startSearch = numberLineIdx + 1;
      const endSearch = firmaLineIdx !== -1 ? firmaLineIdx : lines.length;
      const nameCandidates: string[] = [];

      for (let i = startSearch; i < endSearch; i++) {
        const line = lines[i];
        // Skip labels and non-name text
        if (isLabel(line)) continue;
        if (isNameText(line)) {
          nameCandidates.push(cleanName(line));
        }
      }

      // First name candidate = apellidos, second = nombres
      if (!apellidos && nameCandidates.length >= 1) {
        apellidos = nameCandidates[0];
      }
      if (!nombres && nameCandidates.length >= 2) {
        nombres = nameCandidates[1];
      }
    }
  }

  // --- Strategy C: Regex on raw text ---
  // Try to find patterns like "1.073.824.181\nNEGRETE DURANGO\n"
  if (!apellidos || !nombres) {
    const fullText = rawText.toUpperCase();
    // After the number, look for consecutive uppercase word groups
    const afterNumber = fullText.split(/\d{3}[.,]\d{3}/g).pop() ?? "";
    const wordGroups = afterNumber.match(/\b([A-ZÁÉÍÓÚÑ]{2,}(?:\s+[A-ZÁÉÍÓÚÑ]{2,})*)\b/g) ?? [];
    const nameGroups = wordGroups.filter((g) => {
      const clean = g.trim();
      return clean.length >= 3 && isNameText(clean) && !isLabel(clean);
    });

    if (!apellidos && nameGroups.length >= 1) {
      apellidos = cleanName(nameGroups[0]);
    }
    if (!nombres && nameGroups.length >= 2) {
      nombres = cleanName(nameGroups[1]);
    }
  }

  // Fallback: if we found one label, try to find the other value nearby
  if (apellidos && !nombres && apellidosLabelIdx !== -1) {
    for (let i = apellidosLabelIdx + 1; i < Math.min(apellidosLabelIdx + 4, lines.length); i++) {
      if (i === nombresLabelIdx) continue;
      if (isNameText(lines[i]) && !isLabel(lines[i])) {
        nombres = cleanName(lines[i]);
        break;
      }
    }
  }

  if (nombres && !apellidos && nombresLabelIdx !== -1) {
    for (let i = nombresLabelIdx - 2; i >= Math.max(0, nombresLabelIdx - 4); i--) {
      if (isNameText(lines[i]) && !isLabel(lines[i])) {
        apellidos = cleanName(lines[i]);
        break;
      }
    }
  }

  return { nombres, apellidos, cedulaNumber };
}

/**
 * Checks if a string is a known cédula label (not a name).
 */
function isLabel(text: string): boolean {
  const upper = text.toUpperCase().replace(/[^A-ZÁÉÍÓÚÑ\s]/g, "").trim();
  const labels = [
    "REPUBLICA", "COLOMBIA", "IDENTIFICACION", "PERSONAL",
    "CEDULA", "CIUDADANIA", "REGISTRADURIA", "NACIONAL",
    "NUMERO", "APELLIDOS", "APELLIDO", "NOMBRES", "NOMBRE",
    "FIRMA", "FECHA", "LUGAR", "NACIMIENTO", "EXPEDICION",
    "SEXO", "ESTATURA", "GRUPO", "SANGUINEO", "RH",
    "INDICE", "DERECHO",
  ];

  // Check if the text IS a label
  if (/^A?P?E?LL?I?D[O0]S?$/i.test(upper.replace(/\s/g, ""))) return true;
  if (/^N[O0DQ]?M[BV]R[E3]S?$/i.test(upper.replace(/\s/g, ""))) return true;
  if (/^F[I1]RMA$/i.test(upper.replace(/\s/g, ""))) return true;

  // Check if it contains a label keyword AND nothing else meaningful
  const words = upper.split(/\s+/);
  return words.every((w) => labels.some((lab) => lab === w || w.includes(lab)));
}

/**
 * Cleans a name extracted by OCR — fixes common character substitutions.
 */
function cleanName(text: string): string {
  return text
    .replace(/¡/g, "I")         // ¡VAN → IVAN
    .replace(/1(?=[A-Z])/g, "I") // 1VAN → IVAN
    .replace(/0(?=[A-Z])/g, "O") // 0SCAR → OSCAR
    .replace(/[^\w\sÁÉÍÓÚÑáéíóúñ]/g, "") // Remove stray punctuation
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

/**
 * Checks if a string looks like a person's name (not a header/label).
 */
function isNameText(text: string): boolean {
  const cleaned = text.replace(/[^A-ZÁÉÍÓÚÑa-záéíóúñ\s¡1]/g, "").trim();
  if (cleaned.length < 3) return false;

  // Must have at least one letter
  if (!/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(cleaned)) return false;

  // Exclude if it's a known label
  if (isLabel(text)) return false;

  return true;
}
