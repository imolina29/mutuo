// __tests__/api/sign.test.ts
import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockTx = {
  declaration: { findUnique: jest.fn(), update: jest.fn() },
  clause: { updateMany: jest.fn() },
};
jest.mock("@/lib/db", () => ({
  db: {
    declaration: { findUnique: jest.fn(), update: jest.fn() },
    clause: { updateMany: jest.fn() },
    user: { findUnique: jest.fn() },
    $transaction: jest.fn((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
  },
}));
jest.mock("@/lib/session", () => ({
  getServerSessionUser: jest.fn(),
}));
jest.mock("@/lib/audit", () => ({
  logAudit: jest.fn(),
  extractRequestMeta: jest.fn().mockReturnValue({ ipAddress: "127.0.0.1", userAgent: "test" }),
}));
jest.mock("@/lib/seal", () => ({
  buildCanonicalDocument: jest.fn().mockReturnValue('{"test":"doc"}'),
  computeHash: jest.fn().mockReturnValue("abc123hash"),
  requestTimestamp: jest.fn().mockResolvedValue(Buffer.from("tsa-response")),
}));
jest.mock("@/lib/email", () => ({
  sendEmail: jest.fn(),
}));

import { db } from "@/lib/db";
import { getServerSessionUser } from "@/lib/session";

describe("POST /api/declarations/[id]/sign", () => {
  beforeEach(() => jest.clearAllMocks());

  it("rejects if user is not authenticated", async () => {
    (getServerSessionUser as jest.Mock).mockResolvedValue(null);

    const { POST } = require("@/app/api/declarations/[id]/sign/route");
    const req = new Request("http://localhost", { method: "POST" });
    const res = await POST(req, { params: { id: "decl-1" } });
    expect(res.status).toBe(401);
  });

  it("rejects if user is not verified", async () => {
    (getServerSessionUser as jest.Mock).mockResolvedValue({
      id: "user-b", email: "b@test.com", fullName: "User B", verified: false,
    });

    const { POST } = require("@/app/api/declarations/[id]/sign/route");
    const req = new Request("http://localhost", { method: "POST" });
    const res = await POST(req, { params: { id: "decl-1" } });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("verificar tu identidad");
  });

  it("returns 404 if declaration not found", async () => {
    (getServerSessionUser as jest.Mock).mockResolvedValue({
      id: "user-a", email: "a@test.com", fullName: "User A", verified: true,
    });
    (db.declaration.findUnique as jest.Mock).mockResolvedValue(null);

    const { POST } = require("@/app/api/declarations/[id]/sign/route");
    const req = new Request("http://localhost", { method: "POST" });
    const res = await POST(req, { params: { id: "decl-999" } });
    expect(res.status).toBe(404);
  });

  it("creator can sign a DRAFT declaration", async () => {
    (getServerSessionUser as jest.Mock).mockResolvedValue({
      id: "user-a", email: "a@test.com", fullName: "User A", verified: true,
    });

    const baseDecl = {
      id: "decl-1",
      creatorId: "user-a",
      invitedId: "user-b",
      status: "DRAFT",
      signedByAAt: null,
      signedByBAt: null,
      creator: { id: "user-a", fullName: "User A", email: "a@test.com", cedulaNumber: "1234" },
      invited: { id: "user-b", fullName: "User B", email: "b@test.com", cedulaNumber: "5678" },
      clauses: [{ id: "c1", type: "VOLUNTARY_MEETING", text: "Encuentro voluntario", version: 1 }],
    };

    (db.declaration.findUnique as jest.Mock).mockResolvedValueOnce(baseDecl);
    (mockTx.declaration.update as jest.Mock).mockResolvedValue({});

    const { POST } = require("@/app/api/declarations/[id]/sign/route");
    const req = new Request("http://localhost", { method: "POST" });
    const res = await POST(req, { params: { id: "decl-1" } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sealed).toBe(false);
  });

  it("seals document when both parties have signed", async () => {
    (getServerSessionUser as jest.Mock).mockResolvedValue({
      id: "user-b", email: "b@test.com", fullName: "User B", verified: true,
    });

    const baseDecl = {
      id: "decl-1",
      creatorId: "user-a",
      invitedId: "user-b",
      status: "PENDING_B",
      signedByAAt: new Date("2026-08-01T10:00:00Z"),
      signedByBAt: null,
      creator: { id: "user-a", fullName: "User A", email: "a@test.com", cedulaNumber: "1234" },
      invited: { id: "user-b", fullName: "User B", email: "b@test.com", cedulaNumber: "5678" },
      clauses: [{ id: "c1", type: "VOLUNTARY_MEETING", text: "Encuentro voluntario", version: 1 }],
    };

    (db.declaration.findUnique as jest.Mock).mockResolvedValueOnce(baseDecl);
    (mockTx.declaration.update as jest.Mock).mockResolvedValue({});
    (mockTx.clause.updateMany as jest.Mock).mockResolvedValue({});

    const { POST } = require("@/app/api/declarations/[id]/sign/route");
    const req = new Request("http://localhost", { method: "POST" });
    const res = await POST(req, { params: { id: "decl-1" } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sealed).toBe(true);
    expect(body.hash).toBe("abc123hash");
  });

  it("rejects unauthorized user (not creator nor invited)", async () => {
    (getServerSessionUser as jest.Mock).mockResolvedValue({
      id: "user-c", email: "c@test.com", fullName: "User C", verified: true,
    });

    const baseDecl = {
      id: "decl-1",
      creatorId: "user-a",
      invitedId: "user-b",
      status: "PENDING_B",
      signedByAAt: null,
      signedByBAt: null,
      creator: { id: "user-a", fullName: "User A", email: "a@test.com", cedulaNumber: "1234" },
      invited: { id: "user-b", fullName: "User B", email: "b@test.com", cedulaNumber: "5678" },
      clauses: [],
    };

    (db.declaration.findUnique as jest.Mock).mockResolvedValue(baseDecl);

    const { POST } = require("@/app/api/declarations/[id]/sign/route");
    const req = new Request("http://localhost", { method: "POST" });
    const res = await POST(req, { params: { id: "decl-1" } });
    expect(res.status).toBe(403);
  });
});
