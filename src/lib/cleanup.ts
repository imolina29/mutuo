// src/lib/cleanup.ts
// Periodic cleanup tasks for expired data.

import { db } from "@/lib/db";

/**
 * Deletes expired verification tokens (OTP codes).
 * Should be called periodically (e.g., daily cron or on each auth request).
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const result = await db.verificationToken.deleteMany({
    where: { expires: { lt: new Date() } },
  });
  return result.count;
}

/**
 * Expires PENDING_B declarations whose invite token has expired.
 * Prevents stale invitations from lingering indefinitely.
 */
export async function expireStaleInvitations(): Promise<number> {
  const result = await db.declaration.updateMany({
    where: {
      status: "PENDING_B",
      inviteTokenExpiresAt: { lt: new Date() },
    },
    data: { status: "EXPIRED" },
  });
  return result.count;
}

/**
 * Runs all cleanup tasks. Returns a summary.
 */
export async function runCleanup(): Promise<{ tokens: number; invitations: number }> {
  const [tokens, invitations] = await Promise.all([
    cleanupExpiredTokens(),
    expireStaleInvitations(),
  ]);
  return { tokens, invitations };
}
