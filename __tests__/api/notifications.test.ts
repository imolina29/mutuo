// __tests__/api/notifications.test.ts
import { describe, it, expect, jest, beforeEach } from "@jest/globals";

jest.mock("@/lib/db", () => ({
  db: {
    notification: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  },
}));
jest.mock("@/lib/session", () => ({
  getServerSessionUser: jest.fn(),
}));

import { db } from "@/lib/db";
import { getServerSessionUser } from "@/lib/session";

describe("GET /api/notifications", () => {
  beforeEach(() => jest.clearAllMocks());

  it("rejects unauthenticated requests", async () => {
    (getServerSessionUser as jest.Mock).mockResolvedValue(null);

    const { GET } = require("@/app/api/notifications/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns the authenticated user's notifications, newest first, capped at 50", async () => {
    (getServerSessionUser as jest.Mock).mockResolvedValue({
      id: "user-a", email: "a@test.com", fullName: "User A", verified: true,
    });
    const notifications = [
      { id: "n2", userId: "user-a", type: "DECLARATION_SIGNED", channel: "email", sentAt: new Date("2026-08-02"), readAt: null, declarationId: "decl-1" },
      { id: "n1", userId: "user-a", type: "INVITATION_RECEIVED", channel: "email", sentAt: new Date("2026-08-01"), readAt: null, declarationId: "decl-1" },
    ];
    (db.notification.findMany as jest.Mock).mockResolvedValue(notifications);

    const { GET } = require("@/app/api/notifications/route");
    const res = await GET();
    expect(res.status).toBe(200);
    expect(db.notification.findMany).toHaveBeenCalledWith({
      where: { userId: "user-a" },
      orderBy: { sentAt: "desc" },
      take: 50,
    });
    const body = await res.json();
    expect(body).toHaveLength(2);
    expect(body[0].id).toBe("n2");
  });
});

describe("PATCH /api/notifications/[id]/read", () => {
  beforeEach(() => jest.clearAllMocks());

  it("rejects unauthenticated requests", async () => {
    (getServerSessionUser as jest.Mock).mockResolvedValue(null);

    const { PATCH } = require("@/app/api/notifications/[id]/read/route");
    const req = new Request("http://localhost", { method: "PATCH" });
    const res = await PATCH(req, { params: { id: "notif-1" } });
    expect(res.status).toBe(401);
  });

  it("returns 404 when the notification does not exist", async () => {
    (getServerSessionUser as jest.Mock).mockResolvedValue({
      id: "user-a", email: "a@test.com", fullName: "User A", verified: true,
    });
    (db.notification.findUnique as jest.Mock).mockResolvedValue(null);

    const { PATCH } = require("@/app/api/notifications/[id]/read/route");
    const req = new Request("http://localhost", { method: "PATCH" });
    const res = await PATCH(req, { params: { id: "notif-1" } });
    expect(res.status).toBe(404);
  });

  it("returns 404 when the notification belongs to another user", async () => {
    (getServerSessionUser as jest.Mock).mockResolvedValue({
      id: "user-a", email: "a@test.com", fullName: "User A", verified: true,
    });
    (db.notification.findUnique as jest.Mock).mockResolvedValue({
      id: "notif-1", userId: "user-b",
    });

    const { PATCH } = require("@/app/api/notifications/[id]/read/route");
    const req = new Request("http://localhost", { method: "PATCH" });
    const res = await PATCH(req, { params: { id: "notif-1" } });
    expect(res.status).toBe(404);
  });

  it("marks the notification as read for its owner", async () => {
    (getServerSessionUser as jest.Mock).mockResolvedValue({
      id: "user-a", email: "a@test.com", fullName: "User A", verified: true,
    });
    (db.notification.findUnique as jest.Mock).mockResolvedValue({
      id: "notif-1", userId: "user-a",
    });
    (db.notification.update as jest.Mock).mockResolvedValue({});

    const { PATCH } = require("@/app/api/notifications/[id]/read/route");
    const req = new Request("http://localhost", { method: "PATCH" });
    const res = await PATCH(req, { params: { id: "notif-1" } });
    expect(res.status).toBe(200);
    expect(db.notification.update).toHaveBeenCalledWith({
      where: { id: "notif-1" },
      data: { readAt: expect.any(Date) },
    });
    const body = await res.json();
    expect(body.read).toBe(true);
  });
});
