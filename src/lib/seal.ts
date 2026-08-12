// src/lib/seal.ts
import { createHash } from "crypto";

export interface DeclarationForSealing {
  id: string;
  creatorId: string | null;
  invitedId: string | null;
  meetingDate: Date | null;
  meetingPlace: string | null;
  meetingType: string | null;
  signedByAAt: Date | null;
  signedByBAt: Date | null;
  clauses: { type: string; text: string; version: number }[];
  creator: { fullName: string; cedulaNumber: string | null } | null;
  invited: { fullName: string; cedulaNumber: string | null } | null;
}

export function buildCanonicalDocument(declaration: DeclarationForSealing): string {
  const canonical = {
    id: declaration.id,
    creatorId: declaration.creatorId,
    invitedId: declaration.invitedId,
    meetingDate: declaration.meetingDate?.toISOString() ?? null,
    meetingPlace: declaration.meetingPlace,
    meetingType: declaration.meetingType,
    signedByAAt: declaration.signedByAAt?.toISOString() ?? null,
    signedByBAt: declaration.signedByBAt?.toISOString() ?? null,
    clauses: declaration.clauses
      .map((c) => ({ type: c.type, text: c.text, version: c.version }))
      .sort((a, b) => a.type.localeCompare(b.type)),
    creator: declaration.creator
      ? {
          fullName: declaration.creator.fullName,
          cedulaNumber: declaration.creator.cedulaNumber,
        }
      : null,
    invited: declaration.invited
      ? {
          fullName: declaration.invited.fullName,
          cedulaNumber: declaration.invited.cedulaNumber,
        }
      : null,
  };
  return JSON.stringify(canonical);
}

export function computeHash(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

export async function requestTimestamp(hash: string): Promise<Buffer> {
  const tsaUrl = "https://freetsa.org/tsr";
  const hashBuffer = Buffer.from(hash, "hex");

  // Build a minimal TSQ (TimeStamp Query) per RFC 3161
  // For MVP, we store the hash + timestamp as proof
  // Full TSA integration uses ASN.1 encoding
  const header = [
    0x30, 0x29, // SEQUENCE
    0x02, 0x01, 0x01, // version INTEGER 1
    0x30, 0x21, // messageImprint SEQUENCE
    0x30, 0x09, // algorithm SEQUENCE
    0x06, 0x05, 0x60, 0x86, 0x48, 0x01, 0x65, // OID sha256
    0x05, 0x00, // NULL
    0x04, 0x20, // OCTET STRING (32 bytes)
  ];
  const footer = [0x01, 0x01, 0x01]; // certReq BOOLEAN TRUE
  const body = new Uint8Array([...header, ...Array.from(hashBuffer), ...footer]);

  try {
    const response = await fetch(tsaUrl, {
      method: "POST",
      headers: { "Content-Type": "application/timestamp-query" },
      body: body,
    });
    if (!response.ok) throw new Error(`TSA responded with ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    // Fallback: store hash + current timestamp as proof
    const fallback = JSON.stringify({ hash, timestamp: new Date().toISOString(), source: "fallback" });
    return Buffer.from(fallback);
  }
}

export function verifyIntegrity(declaration: DeclarationForSealing, storedHash: string): boolean {
  const doc = buildCanonicalDocument(declaration);
  const currentHash = computeHash(doc);
  return currentHash === storedHash;
}
