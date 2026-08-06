// __tests__/lib/anti-abuse.test.ts
import { describe, it, expect, jest, beforeEach } from "@jest/globals";

jest.mock("@/lib/db", () => ({
  db: {
    declaration: { count: jest.fn(), findMany: jest.fn() },
    userBlock: { findUnique: jest.fn() },
  },
}));

import { db } from "@/lib/db";

describe("anti-abuse", () => {
  beforeEach(() => jest.clearAllMocks());

  it("blocks user with 3+ active declarations", async () => {
    (db.declaration.count as jest.Mock).mockResolvedValue(3);

    const { checkAbuseLimit } = require("@/lib/anti-abuse");
    const result = await checkAbuseLimit("user-1");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("máximo");
  });

  it("allows user with < 3 active declarations", async () => {
    (db.declaration.count as jest.Mock).mockResolvedValue(1);
    (db.declaration.findMany as jest.Mock).mockResolvedValue([]);

    const { checkAbuseLimit } = require("@/lib/anti-abuse");
    const result = await checkAbuseLimit("user-1");
    expect(result.allowed).toBe(true);
  });

  it("detects blocked relationship", async () => {
    (db.userBlock.findUnique as jest.Mock).mockResolvedValue({ id: "block-1" });

    const { isBlocked } = require("@/lib/anti-abuse");
    const result = await isBlocked("user-a", "user-b");
    expect(result).toBe(true);
  });
});
