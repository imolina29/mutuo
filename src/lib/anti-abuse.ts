// src/lib/anti-abuse.ts
import { db } from "@/lib/db";

export async function checkAbuseLimit(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const activeCount = await db.declaration.count({
    where: {
      creatorId: userId,
      status: { in: ["DRAFT", "PENDING_B", "NEGOTIATING", "PENDING_A", "SIGNED"] },
    },
  });

  if (activeCount >= 3) {
    return { allowed: false, reason: "Has alcanzado el máximo de 3 declaraciones activas simultáneas" };
  }

  // Check daily limit
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dailyCount = await db.declaration.count({
    where: {
      creatorId: userId,
      createdAt: { gte: today },
    },
  });

  if (dailyCount >= 5) {
    return { allowed: false, reason: "Has alcanzado el máximo de 5 declaraciones por día" };
  }

  // Check cooldown: 3+ consecutive rejections
  const recentDeclarations = await db.declaration.findMany({
    where: { creatorId: userId, status: "REJECTED" },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  if (recentDeclarations.length >= 3) {
    const oldestReject = recentDeclarations[2].createdAt;
    const cooldownEnd = new Date(oldestReject.getTime() + 24 * 60 * 60 * 1000);
    if (new Date() < cooldownEnd) {
      return { allowed: false, reason: "Estás en periodo de espera de 24 horas debido a múltiples rechazos" };
    }
  }

  return { allowed: true };
}

export async function isBlocked(userAId: string, userBId: string): Promise<boolean> {
  const block = await db.userBlock.findUnique({
    where: { blockerId_blockedId: { blockerId: userAId, blockedId: userBId } },
  });
  if (block) return true;

  const reverseBlock = await db.userBlock.findUnique({
    where: { blockerId_blockedId: { blockerId: userBId, blockedId: userAId } },
  });
  return !!reverseBlock;
}
