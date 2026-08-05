// __tests__/api/post-meeting.test.ts
import { describe, it, expect, jest, beforeEach } from "@jest/globals";

jest.mock("@/lib/db", () => ({
  db: {
    declaration: { findUnique: jest.fn(), update: jest.fn() },
    postMeeting: { create: jest.fn(), count: jest.fn() },
  },
}));
jest.mock("@/lib/session", () => ({
  getServerSessionUser: jest.fn(),
}));
jest.mock("@/lib/audit", () => ({
  logAudit: jest.fn(),
  extractRequestMeta: jest.fn().mockReturnValue({ ipAddress: "127.0.0.1", userAgent: "test" }),
}));
jest.mock("@/lib/email", () => ({
  sendEmail: jest.fn(),
}));

import { db } from "@/lib/db";
import { getServerSessionUser } from "@/lib/session";

describe("POST /api/declarations/[id]/post-meeting", () => {
  beforeEach(() => jest.clearAllMocks());

  it("rejects unauthenticated requests", async () => {
    (getServerSessionUser as jest.Mock).mockResolvedValue(null);

    const { POST } = require("@/app/api/declarations/[id]/post-meeting/route");
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "OK" }),
    });
    const res = await POST(req, { params: { id: "decl-1" } });
    expect(res.status).toBe(401);
  });

  it("rejects invalid body", async () => {
    (getServerSessionUser as jest.Mock).mockResolvedValue({
      id: "user-a", email: "a@test.com", fullName: "A", verified: true,
    });

    const { POST } = require("@/app/api/declarations/[id]/post-meeting/route");
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "NOT_A_STATUS" }),
    });
    const res = await POST(req, { params: { id: "decl-1" } });
    expect(res.status).toBe(400);
  });

  it("returns 404 if declaration not found", async () => {
    (getServerSessionUser as jest.Mock).mockResolvedValue({
      id: "user-a", email: "a@test.com", fullName: "A", verified: true,
    });
    (db.declaration.findUnique as jest.Mock).mockResolvedValue(null);

    const { POST } = require("@/app/api/declarations/[id]/post-meeting/route");
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "OK" }),
    });
    const res = await POST(req, { params: { id: "decl-1" } });
    expect(res.status).toBe(404);
  });

  it("rejects users who are not a party to the declaration", async () => {
    (getServerSessionUser as jest.Mock).mockResolvedValue({
      id: "user-c", email: "c@test.com", fullName: "C", verified: true,
    });
    (db.declaration.findUnique as jest.Mock).mockResolvedValue({
      id: "decl-1", status: "SIGNED", creatorId: "user-a", invitedId: "user-b",
    });

    const { POST } = require("@/app/api/declarations/[id]/post-meeting/route");
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "OK" }),
    });
    const res = await POST(req, { params: { id: "decl-1" } });
    expect(res.status).toBe(403);
  });

  it("rejects if declaration is not signed", async () => {
    (getServerSessionUser as jest.Mock).mockResolvedValue({
      id: "user-a", email: "a@test.com", fullName: "A", verified: true,
    });
    (db.declaration.findUnique as jest.Mock).mockResolvedValue({
      id: "decl-1", status: "PENDING_B", creatorId: "user-a", invitedId: "user-b",
    });

    const { POST } = require("@/app/api/declarations/[id]/post-meeting/route");
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "OK" }),
    });
    const res = await POST(req, { params: { id: "decl-1" } });
    expect(res.status).toBe(409);
  });

  it("creates a post-meeting record and keeps status SIGNED when only one party has registered", async () => {
    (getServerSessionUser as jest.Mock).mockResolvedValue({
      id: "user-a", email: "a@test.com", fullName: "A", verified: true,
    });
    (db.declaration.findUnique as jest.Mock).mockResolvedValue({
      id: "decl-1", status: "SIGNED", creatorId: "user-a", invitedId: "user-b",
    });
    (db.postMeeting.create as jest.Mock).mockResolvedValue({});
    (db.postMeeting.count as jest.Mock).mockResolvedValue(1);

    const { POST } = require("@/app/api/declarations/[id]/post-meeting/route");
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "OK", notes: "Todo bien" }),
    });
    const res = await POST(req, { params: { id: "decl-1" } });
    expect(res.status).toBe(200);
    expect(db.postMeeting.create).toHaveBeenCalledWith({
      data: { declarationId: "decl-1", userId: "user-a", status: "OK", notes: "Todo bien" },
    });
    expect(db.declaration.update).not.toHaveBeenCalled();
  });

  it("marks the declaration COMPLETED once both parties have registered", async () => {
    (getServerSessionUser as jest.Mock).mockResolvedValue({
      id: "user-b", email: "b@test.com", fullName: "B", verified: true,
    });
    (db.declaration.findUnique as jest.Mock).mockResolvedValue({
      id: "decl-1", status: "SIGNED", creatorId: "user-a", invitedId: "user-b",
    });
    (db.postMeeting.create as jest.Mock).mockResolvedValue({});
    (db.postMeeting.count as jest.Mock).mockResolvedValue(2);
    (db.declaration.update as jest.Mock).mockResolvedValue({});

    const { POST } = require("@/app/api/declarations/[id]/post-meeting/route");
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "NOT_HELD" }),
    });
    const res = await POST(req, { params: { id: "decl-1" } });
    expect(res.status).toBe(200);
    expect(db.declaration.update).toHaveBeenCalledWith({
      where: { id: "decl-1" },
      data: { status: "COMPLETED" },
    });
  });
});

describe("POST /api/declarations/[id]/cancel", () => {
  beforeEach(() => jest.clearAllMocks());

  it("rejects unauthenticated requests", async () => {
    (getServerSessionUser as jest.Mock).mockResolvedValue(null);

    const { POST } = require("@/app/api/declarations/[id]/cancel/route");
    const req = new Request("http://localhost", { method: "POST" });
    const res = await POST(req, { params: { id: "decl-1" } });
    expect(res.status).toBe(401);
  });

  it("rejects users who are not a party to the declaration", async () => {
    (getServerSessionUser as jest.Mock).mockResolvedValue({
      id: "user-c", email: "c@test.com", fullName: "C", verified: true,
    });
    (db.declaration.findUnique as jest.Mock).mockResolvedValue({
      id: "decl-1", status: "DRAFT", creatorId: "user-a", invitedId: "user-b",
      creator: { id: "user-a", email: "a@test.com", fullName: "A" },
      invited: { id: "user-b", email: "b@test.com", fullName: "B" },
    });

    const { POST } = require("@/app/api/declarations/[id]/cancel/route");
    const req = new Request("http://localhost", { method: "POST" });
    const res = await POST(req, { params: { id: "decl-1" } });
    expect(res.status).toBe(403);
  });

  it.each(["DRAFT", "PENDING_B", "PENDING_A", "NEGOTIATING", "SIGNED"])(
    "allows cancelling a declaration in %s status",
    async (status) => {
      (getServerSessionUser as jest.Mock).mockResolvedValue({
        id: "user-a", email: "a@test.com", fullName: "A", verified: true,
      });
      (db.declaration.findUnique as jest.Mock).mockResolvedValue({
        id: "decl-1", status, creatorId: "user-a", invitedId: "user-b",
        creator: { id: "user-a", email: "a@test.com", fullName: "A" },
        invited: { id: "user-b", email: "b@test.com", fullName: "B" },
      });
      (db.declaration.update as jest.Mock).mockResolvedValue({});

      const { POST } = require("@/app/api/declarations/[id]/cancel/route");
      const req = new Request("http://localhost", { method: "POST" });
      const res = await POST(req, { params: { id: "decl-1" } });
      expect(res.status).toBe(200);
      expect(db.declaration.update).toHaveBeenCalledWith({
        where: { id: "decl-1" },
        data: { status: "CANCELLED" },
      });
    }
  );

  it.each(["CANCELLED", "REVOKED", "REJECTED", "EXPIRED", "COMPLETED"])(
    "rejects cancelling a declaration in %s status",
    async (status) => {
      (getServerSessionUser as jest.Mock).mockResolvedValue({
        id: "user-a", email: "a@test.com", fullName: "A", verified: true,
      });
      (db.declaration.findUnique as jest.Mock).mockResolvedValue({
        id: "decl-1", status, creatorId: "user-a", invitedId: "user-b",
        creator: { id: "user-a", email: "a@test.com", fullName: "A" },
        invited: { id: "user-b", email: "b@test.com", fullName: "B" },
      });

      const { POST } = require("@/app/api/declarations/[id]/cancel/route");
      const req = new Request("http://localhost", { method: "POST" });
      const res = await POST(req, { params: { id: "decl-1" } });
      expect(res.status).toBe(409);
    }
  );
});

describe("POST /api/declarations/[id]/revoke", () => {
  beforeEach(() => jest.clearAllMocks());

  it("rejects unauthenticated requests", async () => {
    (getServerSessionUser as jest.Mock).mockResolvedValue(null);

    const { POST } = require("@/app/api/declarations/[id]/revoke/route");
    const req = new Request("http://localhost", { method: "POST" });
    const res = await POST(req, { params: { id: "decl-1" } });
    expect(res.status).toBe(401);
  });

  it("allows revoking a SIGNED declaration", async () => {
    (getServerSessionUser as jest.Mock).mockResolvedValue({
      id: "user-b", email: "b@test.com", fullName: "B", verified: true,
    });
    (db.declaration.findUnique as jest.Mock).mockResolvedValue({
      id: "decl-1", status: "SIGNED", creatorId: "user-a", invitedId: "user-b",
      creator: { id: "user-a", email: "a@test.com", fullName: "A" },
      invited: { id: "user-b", email: "b@test.com", fullName: "B" },
    });
    (db.declaration.update as jest.Mock).mockResolvedValue({});

    const { POST } = require("@/app/api/declarations/[id]/revoke/route");
    const req = new Request("http://localhost", { method: "POST" });
    const res = await POST(req, { params: { id: "decl-1" } });
    expect(res.status).toBe(200);
    expect(db.declaration.update).toHaveBeenCalledWith({
      where: { id: "decl-1" },
      data: { status: "REVOKED" },
    });
  });

  it.each(["DRAFT", "PENDING_B", "PENDING_A", "NEGOTIATING", "CANCELLED", "REVOKED", "COMPLETED"])(
    "rejects revoking a declaration in %s status",
    async (status) => {
      (getServerSessionUser as jest.Mock).mockResolvedValue({
        id: "user-a", email: "a@test.com", fullName: "A", verified: true,
      });
      (db.declaration.findUnique as jest.Mock).mockResolvedValue({
        id: "decl-1", status, creatorId: "user-a", invitedId: "user-b",
        creator: { id: "user-a", email: "a@test.com", fullName: "A" },
        invited: { id: "user-b", email: "b@test.com", fullName: "B" },
      });

      const { POST } = require("@/app/api/declarations/[id]/revoke/route");
      const req = new Request("http://localhost", { method: "POST" });
      const res = await POST(req, { params: { id: "decl-1" } });
      expect(res.status).toBe(409);
    }
  );
});
