// __tests__/lib/email.test.ts
import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockSend = jest.fn();
jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}));

jest.mock("@/lib/db", () => ({
  db: {
    notification: { create: jest.fn() },
  },
}));

import { db } from "@/lib/db";
import { sendNotification } from "@/lib/email";

describe("sendNotification", () => {
  beforeEach(() => jest.clearAllMocks());

  it("sends an INVITATION_RECEIVED email with the correct subject and content", async () => {
    await sendNotification({
      userId: "user-b",
      declarationId: "decl-1",
      type: "INVITATION_RECEIVED",
      recipientEmail: "b@test.com",
      recipientName: "User B",
      context: {
        senderName: "User A",
        meetingDate: "2026-09-01",
        meetingPlace: "Bogotá",
        inviteUrl: "https://mutuo.co/invite/decl-1",
      },
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
    const call = mockSend.mock.calls[0][0] as { to: string; subject: string; html: string };
    expect(call.to).toBe("b@test.com");
    expect(call.subject).toBe("Has recibido una declaración de intención mutua");
    expect(call.html).toContain("User A");
    expect(call.html).toContain("2026-09-01");
    expect(call.html).toContain("Bogotá");
    expect(call.html).toContain("https://mutuo.co/invite/decl-1");
  });

  it("includes the revocability and Línea 155 disclaimer in every email", async () => {
    await sendNotification({
      userId: "user-a",
      declarationId: "decl-1",
      type: "DECLARATION_REVOKED",
      recipientEmail: "a@test.com",
      recipientName: "User A",
      context: { revokerName: "User B" },
    });

    const call = mockSend.mock.calls[0][0] as { html: string };
    expect(call.html).toContain("revocable en cualquier momento");
    expect(call.html).toContain("Línea 155");
  });

  it("creates a notification record for the recipient user", async () => {
    await sendNotification({
      userId: "user-a",
      declarationId: "decl-1",
      type: "DECLARATION_SIGNED",
      recipientEmail: "a@test.com",
      recipientName: "User A",
      context: { hash: "abc123hash" },
    });

    expect(db.notification.create).toHaveBeenCalledWith({
      data: {
        userId: "user-a",
        declarationId: "decl-1",
        type: "DECLARATION_SIGNED",
        channel: "email",
      },
    });
  });

  it.each([
    "INVITATION_RECEIVED",
    "INVITATION_ACCEPTED",
    "INVITATION_REJECTED",
    "CHANGES_PROPOSED",
    "CHANGES_ACCEPTED",
    "CHANGES_REJECTED",
    "DECLARATION_SIGNED",
    "DECLARATION_CANCELLED",
    "DECLARATION_REVOKED",
    "POST_MEETING_REMINDER",
  ])("has a template for %s", async (type) => {
    await sendNotification({
      userId: "user-a",
      declarationId: "decl-1",
      type: type as never,
      recipientEmail: "a@test.com",
      recipientName: "User A",
      context: {},
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(db.notification.create).toHaveBeenCalledTimes(1);
  });
});
