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
jest.mock("@/lib/anti-abuse", () => ({
  checkAbuseLimit: jest.fn(),
}));

import { db } from "@/lib/db";
import { getServerSessionUser } from "@/lib/session";
import { checkAbuseLimit } from "@/lib/anti-abuse";

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
    (checkAbuseLimit as jest.Mock).mockResolvedValue({ allowed: true });
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

  it("rejects with 429 when checkAbuseLimit disallows", async () => {
    (getServerSessionUser as jest.Mock).mockResolvedValue({
      id: "user-a", email: "a@test.com", fullName: "User A", verified: true,
    });
    (checkAbuseLimit as jest.Mock).mockResolvedValue({
      allowed: false,
      reason: "Has alcanzado el máximo de 5 declaraciones por día",
    });

    const { POST } = require("@/app/api/declarations/route");
    const req = new Request("http://localhost/api/declarations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        meetingDate: "2026-09-01T18:00:00Z",
        meetingPlace: "Bogotá",
        meetingType: "cena",
        clauses: [{ type: "VOLUNTARY_MEETING", text: "Encuentro voluntario" }],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toContain("5 declaraciones por día");
    expect(db.declaration.create).not.toHaveBeenCalled();
  });
});
