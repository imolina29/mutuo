// __tests__/lib/crypto.test.ts
import { describe, it, expect } from "@jest/globals";

process.env.ENCRYPTION_KEY = "a".repeat(64);

import { encrypt, decrypt } from "@/lib/crypto";

describe("crypto", () => {
  it("encrypts and decrypts a string", () => {
    const original = "Cédula de ciudadanía 123456789";
    const encrypted = encrypt(original);
    expect(encrypted).not.toBe(original);
    expect(encrypted).toContain(":");
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  it("produces different ciphertexts for same input", () => {
    const original = "test";
    const a = encrypt(original);
    const b = encrypt(original);
    expect(a).not.toBe(b);
  });
});
