// src/lib/crypto.ts
// AES-256-GCM — authenticated encryption (confidentiality + integrity).
// Backward-compatible: decrypt() can still read legacy AES-256-CBC data.
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12; // GCM recommended nonce size

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length !== 64) throw new Error("ENCRYPTION_KEY must be 64 hex chars");
  return Buffer.from(key, "hex");
}

/**
 * Encrypts plaintext with AES-256-GCM.
 * Output format: "gcm:" + iv(hex) + ":" + authTag(hex) + ":" + ciphertext(hex)
 */
export function encrypt(text: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  return `gcm:${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypts ciphertext. Supports both:
 * - GCM format: "gcm:iv:authTag:ciphertext"
 * - Legacy CBC format: "iv:ciphertext" (backward-compatible read)
 */
export function decrypt(ciphertext: string): string {
  if (ciphertext.startsWith("gcm:")) {
    return decryptGcm(ciphertext);
  }
  return decryptCbcLegacy(ciphertext);
}

function decryptGcm(ciphertext: string): string {
  const parts = ciphertext.split(":");
  // parts: ["gcm", ivHex, authTagHex, encryptedHex]
  if (parts.length !== 4) throw new Error("Invalid GCM ciphertext format");
  const [, ivHex, authTagHex, encrypted] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/** Legacy AES-256-CBC decrypt — read-only for migration */
function decryptCbcLegacy(ciphertext: string): string {
  const [ivHex, encrypted] = ciphertext.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = createDecipheriv("aes-256-cbc", getKey(), iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
