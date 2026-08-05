// __tests__/api/declarations.test.ts
import { describe, it, expect, jest, beforeEach } from "@jest/globals";

jest.mock("@/lib/db", () => ({
  db: {
    declaration: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
  },
}));
jest.mock("@/lib/session", () => ({
  getServerSessionUser: jest.fn(),
}));
jest.mock("@/lib/audit", () => ({
  logAudit: jest.fn(),
  extractRequestMeta: jest.fn().mockReturnValue({ ipAddress: "127.0.0.1", userAgent: "test" }),
}));

import { db } from "@/lib/db";
import { getServerSessionUser } from "@/lib/session";

describe("POST /api/declarations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects unauthenticated requests", async () => {
    (getServerSessionUser as jest.Mock).mockResolvedValue(null);

    const { POST } = require("@/app/api/declarations/route");
    const req = new Request("http://localhost/api/declarations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("creates declaration with clauses", async () => {
    (getServerSessionUser as jest.Mock).mockResolvedValue({
      id: "user-a", email: "a@test.com", fullName: "User A", verified: true,
    });
    (db.declaration.count as jest.Mock).mockResolvedValue(0);
    (db.declaration.create as jest.Mock).mockResolvedValue({
      id: "decl-1",
      inviteToken: "token-123",
    });

    const { POST } = require("@/app/api/declarations/route");
    const req = new Request("http://localhost/api/declarations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        meetingDate: "2026-09-01T18:00:00Z",
        meetingPlace: "Bogotá",
        meetingType: "cena",
        clauses: [
          { type: "VOLUNTARY_MEETING", text: "Encuentro voluntario" },
          { type: "NO_RECORDING", text: "No grabación" },
        ],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe("decl-1");
    expect(body.inviteToken).toBe("token-123");
  });
});
