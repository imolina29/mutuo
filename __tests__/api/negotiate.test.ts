// __tests__/api/negotiate.test.ts
import { describe, it, expect, jest, beforeEach } from "@jest/globals";

jest.mock("@/lib/db", () => ({
  db: {
    declaration: { findUnique: jest.fn(), update: jest.fn() },
    clause: { deleteMany: jest.fn(), createMany: jest.fn() },
    $transaction: jest.fn((fn: Function) => fn({
      declaration: { findUnique: jest.fn(), update: jest.fn() },
      clause: { deleteMany: jest.fn(), createMany: jest.fn() },
    })),
  },
}));
jest.mock("@/lib/session", () => ({
  getServerSessionUser: jest.fn(),
}));
jest.mock("@/lib/audit", () => ({
  logAudit: jest.fn(),
  extractRequestMeta: jest.fn().mockReturnValue({ ipAddress: "127.0.0.1", userAgent: "test" }),
}));

import { getServerSessionUser } from "@/lib/session";

describe("POST /api/declarations/[id]/negotiate", () => {
  beforeEach(() => jest.clearAllMocks());

  it("rejects unauthenticated requests", async () => {
    (getServerSessionUser as jest.Mock).mockResolvedValue(null);

    const { POST } = require("@/app/api/declarations/[id]/negotiate/route");
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clauses: [] }),
    });
    const res = await POST(req, { params: { id: "decl-1" } });
    expect(res.status).toBe(401);
  });
});
