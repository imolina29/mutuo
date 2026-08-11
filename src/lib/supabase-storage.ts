// src/lib/supabase-storage.ts
import { createClient } from "@supabase/supabase-js";
import { encrypt, decrypt } from "@/lib/crypto";

const BUCKET = "identity-docs";

function getClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  return createClient(url, key);
}

/**
 * Ensures the private bucket exists. Called once on first upload.
 */
async function ensureBucket() {
  const supabase = getClient();
  const { data } = await supabase.storage.getBucket(BUCKET);
  if (!data) {
    await supabase.storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: 10 * 1024 * 1024, // 10MB max
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    });
  }
}

/**
 * Encrypts image bytes with AES-256 and uploads to Supabase Storage.
 * Returns the storage path (not encrypted — the file content IS encrypted).
 */
export async function uploadEncryptedFile(
  fileBytes: Buffer,
  folder: string,
  filename: string
): Promise<string> {
  await ensureBucket();
  const supabase = getClient();

  // Encrypt the actual image bytes as hex, then convert to Buffer for upload
  const encryptedHex = encrypt(fileBytes.toString("base64"));
  const encryptedBuffer = Buffer.from(encryptedHex, "utf-8");

  const path = `${folder}/${filename}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, encryptedBuffer, {
      contentType: "application/octet-stream",
      upsert: true,
    });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return path;
}

/**
 * Downloads and decrypts a file from Supabase Storage.
 * Returns the original image bytes as a Buffer.
 */
export async function downloadDecryptedFile(path: string): Promise<Buffer> {
  const supabase = getClient();
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) throw new Error(`Storage download failed: ${error?.message}`);

  const encryptedHex = await data.text();
  const base64 = decrypt(encryptedHex);
  return Buffer.from(base64, "base64");
}

/**
 * Deletes one or more files from Supabase Storage.
 */
export async function deleteFiles(paths: string[]): Promise<void> {
  const supabase = getClient();
  const { error } = await supabase.storage.from(BUCKET).remove(paths);
  if (error) throw new Error(`Storage delete failed: ${error.message}`);
}

/**
 * Deletes all identity files for a given user folder.
 */
export async function deleteUserFiles(userId: string): Promise<void> {
  const supabase = getClient();
  const folder = `user-${userId}`;
  const { data } = await supabase.storage.from(BUCKET).list(folder);
  if (data && data.length > 0) {
    const paths = data.map((f) => `${folder}/${f.name}`);
    await deleteFiles(paths);
  }
}
