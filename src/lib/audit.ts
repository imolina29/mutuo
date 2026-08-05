// src/lib/audit.ts
import { db } from "@/lib/db";

interface AuditParams {
  userId: string;
  declarationId?: string;
  action: string;
  details?: object;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAudit(params: AuditParams): Promise<void> {
  await db.auditLog.create({
    data: {
      userId: params.userId,
      declarationId: params.declarationId ?? null,
      action: params.action,
      details: params.details ?? undefined,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
    },
  });
}

export function extractRequestMeta(req: Request): { ipAddress: string; userAgent: string } {
  return {
    ipAddress: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown",
    userAgent: req.headers.get("user-agent") ?? "unknown",
  };
}
