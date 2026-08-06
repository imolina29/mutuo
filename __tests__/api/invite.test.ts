import { describe, it, expect, jest, beforeEach } from "@jest/globals";

jest.mock("@/lib/db", () => ({
  db: {
    declaration: { findUnique: jest.fn() },
  },
}));

import { db } from "@/lib/db";

describe("GET /api/invite/[token]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 404 for invalid token", async () => {
    (db.declaration.findUnique as jest.Mock).mockResolvedValue(null);

    const { GET } = require("@/app/api/invite/[token]/route");
    const req = new Request("http://localhost/api/invite/fake-token");
    const res = await GET(req, { params: { token: "fake-token" } });
    expect(res.status).toBe(404);
  });

  it("returns 410 for expired invite", async () => {
    (db.declaration.findUnique as jest.Mock).mockResolvedValue({
      id: "decl-1",
      status: "PENDING_B",
      inviteTokenExpiresAt: new Date("2020-01-01"),
      creator: { fullName: "Test User" },
      clauses: [],
    });

    const { GET } = require("@/app/api/invite/[token]/route");
    const req = new Request("http://localhost/api/invite/valid-token");
    const res = await GET(req, { params: { token: "valid-token" } });
    expect(res.status).toBe(410);
  });

  it("returns declaration summary for valid token", async () => {
    (db.declaration.findUnique as jest.Mock).mockResolvedValue({
      id: "decl-1",
      status: "PENDING_B",
      inviteTokenExpiresAt: new Date("2030-01-01"),
      meetingDate: new Date("2026-09-01"),
      meetingPlace: "Bogotá",
      meetingType: "cena",
      creator: { fullName: "Juan Pérez" },
      clauses: [{ type: "VOLUNTARY_MEETING", text: "Encuentro voluntario", version: 1 }],
    });

    const { GET } = require("@/app/api/invite/[token]/route");
    const req = new Request("http://localhost/api/invite/valid-token");
    const res = await GET(req, { params: { token: "valid-token" } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.creator.fullName).toBe("Juan Pérez");
  });
});
