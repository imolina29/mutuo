import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// Valid UUID test constants
const DECL_ID = "00000000-0000-4000-8000-000000000001";
const VALID_TOKEN = "00000000-0000-4000-8000-000000000099";
const MISSING_TOKEN = "00000000-0000-4000-8000-000000000088";

jest.mock("@/lib/db", () => ({
  db: {
    declaration: { findUnique: jest.fn() },
  },
}));

import { db } from "@/lib/db";

describe("GET /api/invite/[token]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 404 for unknown token", async () => {
    (db.declaration.findUnique as jest.Mock).mockResolvedValue(null);

    const { GET } = require("@/app/api/invite/[token]/route");
    const req = new Request(`http://localhost/api/invite/${MISSING_TOKEN}`);
    const res = await GET(req, { params: { token: MISSING_TOKEN } });
    expect(res.status).toBe(404);
  });

  it("returns 410 for expired invite", async () => {
    (db.declaration.findUnique as jest.Mock).mockResolvedValue({
      id: DECL_ID,
      status: "PENDING_B",
      inviteTokenExpiresAt: new Date("2020-01-01"),
      creator: { fullName: "Test User" },
      clauses: [],
    });

    const { GET } = require("@/app/api/invite/[token]/route");
    const req = new Request(`http://localhost/api/invite/${VALID_TOKEN}`);
    const res = await GET(req, { params: { token: VALID_TOKEN } });
    expect(res.status).toBe(410);
  });

  it("returns declaration summary for valid token", async () => {
    (db.declaration.findUnique as jest.Mock).mockResolvedValue({
      id: DECL_ID,
      status: "PENDING_B",
      inviteTokenExpiresAt: new Date("2030-01-01"),
      meetingDate: new Date("2026-09-01"),
      meetingPlace: "Bogotá",
      meetingType: "cena",
      creator: { fullName: "Juan Pérez" },
      clauses: [{ type: "VOLUNTARY_MEETING", text: "Encuentro voluntario", version: 1 }],
    });

    const { GET } = require("@/app/api/invite/[token]/route");
    const req = new Request(`http://localhost/api/invite/${VALID_TOKEN}`);
    const res = await GET(req, { params: { token: VALID_TOKEN } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.creator.fullName).toBe("Juan Pérez");
  });
});
