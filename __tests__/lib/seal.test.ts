// __tests__/lib/seal.test.ts
import { describe, it, expect } from "@jest/globals";
import { buildCanonicalDocument, computeHash, verifyIntegrity } from "@/lib/seal";

const mockDeclaration = {
  id: "decl-001",
  creatorId: "user-a",
  invitedId: "user-b",
  meetingDate: new Date("2026-09-01T18:00:00Z"),
  meetingPlace: "Bogotá",
  meetingType: "cena",
  signedByAAt: new Date("2026-08-30T10:00:00Z"),
  signedByBAt: new Date("2026-08-30T12:00:00Z"),
  clauses: [
    { type: "VOLUNTARY_MEETING", text: "Encuentro voluntario", version: 1 },
    { type: "NO_RECORDING", text: "No grabación sin consentimiento", version: 1 },
  ],
  creator: { fullName: "Juan Pérez", cedulaNumber: "123456789" },
  invited: { fullName: "María López", cedulaNumber: "987654321" },
};

describe("seal", () => {
  it("builds deterministic canonical document", () => {
    const doc1 = buildCanonicalDocument(mockDeclaration);
    const doc2 = buildCanonicalDocument(mockDeclaration);
    expect(doc1).toBe(doc2);
  });

  it("computes SHA-256 hash", () => {
    const doc = buildCanonicalDocument(mockDeclaration);
    const hash = computeHash(doc);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("verifies integrity with matching hash", () => {
    const doc = buildCanonicalDocument(mockDeclaration);
    const hash = computeHash(doc);
    expect(verifyIntegrity(mockDeclaration, hash)).toBe(true);
  });

  it("rejects integrity with tampered data", () => {
    const doc = buildCanonicalDocument(mockDeclaration);
    const hash = computeHash(doc);
    const tampered = { ...mockDeclaration, meetingPlace: "Medellín" };
    expect(verifyIntegrity(tampered, hash)).toBe(false);
  });
});
