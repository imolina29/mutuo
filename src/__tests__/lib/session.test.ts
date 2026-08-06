import { describe, it, expect, jest } from "@jest/globals";

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));
jest.mock("@/lib/auth-options", () => ({
  authOptions: {},
}));

describe("getServerSessionUser", () => {
  it("returns null when no session exists", async () => {
    const { getServerSession } = require("next-auth");
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const { getServerSessionUser } = require("@/lib/session");
    const result = await getServerSessionUser();
    expect(result).toBeNull();
  });

  it("returns user data when session exists", async () => {
    const { getServerSession } = require("next-auth");
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: "abc-123", email: "test@example.com", fullName: "Test User", verified: false, profileComplete: true },
    });

    const { getServerSessionUser } = require("@/lib/session");
    const result = await getServerSessionUser();
    expect(result).toEqual({
      id: "abc-123",
      email: "test@example.com",
      fullName: "Test User",
      verified: false,
      profileComplete: true,
    });
  });
});
