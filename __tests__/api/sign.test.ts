// __tests__/api/sign.test.ts
import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// Valid UUID test constants
const DECL_ID = "00000000-0000-4000-8000-000000000001";
const DECL_ID_MISSING = "00000000-0000-4000-8000-000000000999";
const USER_A = "00000000-0000-4000-8000-00000000000a";
const USER_B = "00000000-0000-4000-8000-00000000000b";
const USER_C = "00000000-0000-4000-8000-00000000000c";
const CLAUSE_ID = "00000000-0000-4000-8000-0000000000c1";

const mockTx = {
  declaration: { findUniqueOrThrow: jest.fn(), update: jest.fn() },
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
  sendNotification: jest.fn(),
}));
jest.mock("@/lib/anti-abuse", () => ({
  isBlocked: jest.fn().mockResolvedValue(false),
}));

import { db } from "@/lib/db";
import { getServerSessionUser } from "@/lib/session";

describe("POST /api/declarations/[id]/sign", () => {
  beforeEach(() => jest.clearAllMocks());

  it("rejects if user is not authenticated", async () => {
    (getServerSessionUser as jest.Mock).mockResolvedValue(null);

    const { POST } = require("@/app/api/declarations/[id]/sign/route");
    const req = new Request("http://localhost", { method: "POST" });
    const res = await POST(req, { params: { id: DECL_ID } });
    expect(res.status).toBe(401);
  });

  it("rejects if user is not verified", async () => {
    (getServerSessionUser as jest.Mock).mockResolvedValue({
      id: USER_B, email: "b@test.com", fullName: "User B", verified: false,
    });

    const { POST } = require("@/app/api/declarations/[id]/sign/route");
    const req = new Request("http://localhost", { method: "POST" });
    const res = await POST(req, { params: { id: DECL_ID } });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("verificar tu identidad");
  });

  it("returns 404 if declaration not found", async () => {
    (getServerSessionUser as jest.Mock).mockResolvedValue({
      id: USER_A, email: "a@test.com", fullName: "User A", verified: true,
    });
    (db.declaration.findUnique as jest.Mock).mockResolvedValue(null);

    const { POST } = require("@/app/api/declarations/[id]/sign/route");
    const req = new Request("http://localhost", { method: "POST" });
    const res = await POST(req, { params: { id: DECL_ID_MISSING } });
    expect(res.status).toBe(404);
  });

  it("creator can sign a DRAFT declaration", async () => {
    (getServerSessionUser as jest.Mock).mockResolvedValue({
      id: USER_A, email: "a@test.com", fullName: "User A", verified: true,
    });

    const baseDecl = {
      id: DECL_ID,
      creatorId: USER_A,
      invitedId: USER_B,
      status: "DRAFT",
      signedByAAt: null,
      signedByBAt: null,
      creator: { id: USER_A, fullName: "User A", email: "a@test.com", cedulaNumber: "1234" },
      invited: { id: USER_B, fullName: "User B", email: "b@test.com", cedulaNumber: "5678" },
      clauses: [{ id: CLAUSE_ID, type: "VOLUNTARY_MEETING", text: "Encuentro voluntario", version: 1 }],
    };

    (db.declaration.findUnique as jest.Mock).mockResolvedValueOnce(baseDecl);
    // Inside transaction: findUniqueOrThrow returns current status
    (mockTx.declaration.findUniqueOrThrow as jest.Mock).mockResolvedValue({
      status: "DRAFT", signedByAAt: null,
    });
    (mockTx.declaration.update as jest.Mock).mockResolvedValue({});

    const { POST } = require("@/app/api/declarations/[id]/sign/route");
    const req = new Request("http://localhost", { method: "POST" });
    const res = await POST(req, { params: { id: DECL_ID } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sealed).toBe(false);
  });

  it("seals document when both parties have signed", async () => {
    (getServerSessionUser as jest.Mock).mockResolvedValue({
      id: USER_B, email: "b@test.com", fullName: "User B", verified: true,
    });

    const baseDecl = {
      id: DECL_ID,
      creatorId: USER_A,
      invitedId: USER_B,
      status: "PENDING_B",
      signedByAAt: new Date("2026-08-01T10:00:00Z"),
      signedByBAt: null,
      creator: { id: USER_A, fullName: "User A", email: "a@test.com", cedulaNumber: "1234" },
      invited: { id: USER_B, fullName: "User B", email: "b@test.com", cedulaNumber: "5678" },
      clauses: [{ id: CLAUSE_ID, type: "VOLUNTARY_MEETING", text: "Encuentro voluntario", version: 1 }],
    };

    (db.declaration.findUnique as jest.Mock).mockResolvedValueOnce(baseDecl);
    // Inside transaction: status is still PENDING_B, signedByAAt exists
    (mockTx.declaration.findUniqueOrThrow as jest.Mock).mockResolvedValue({
      status: "PENDING_B", signedByAAt: new Date("2026-08-01T10:00:00Z"),
    });
    (mockTx.declaration.update as jest.Mock).mockResolvedValue({});
    (mockTx.clause.updateMany as jest.Mock).mockResolvedValue({});
    // TSA + seal happens outside transaction, uses db.declaration.update
    (db.declaration.update as jest.Mock).mockResolvedValue({});

    const { POST } = require("@/app/api/declarations/[id]/sign/route");
    const req = new Request("http://localhost", { method: "POST" });
    const res = await POST(req, { params: { id: DECL_ID } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sealed).toBe(true);
    expect(body.hash).toBe("abc123hash");
  });

  it("rejects unauthorized user (not creator nor invited)", async () => {
    (getServerSessionUser as jest.Mock).mockResolvedValue({
      id: USER_C, email: "c@test.com", fullName: "User C", verified: true,
    });

    const baseDecl = {
      id: DECL_ID,
      creatorId: USER_A,
      invitedId: USER_B,
      status: "PENDING_B",
      signedByAAt: null,
      signedByBAt: null,
      creator: { id: USER_A, fullName: "User A", email: "a@test.com", cedulaNumber: "1234" },
      invited: { id: USER_B, fullName: "User B", email: "b@test.com", cedulaNumber: "5678" },
      clauses: [],
    };

    (db.declaration.findUnique as jest.Mock).mockResolvedValue(baseDecl);

    const { POST } = require("@/app/api/declarations/[id]/sign/route");
    const req = new Request("http://localhost", { method: "POST" });
    const res = await POST(req, { params: { id: DECL_ID } });
    expect(res.status).toBe(403);
  });
});
