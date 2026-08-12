// src/app/api/admin/metrics/route.ts
// Aggregate metrics for pilot monitoring — no PII exposed.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSessionUser } from "@/lib/session";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

export async function GET() {
  try {
    const user = await getServerSessionUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (!ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      return NextResponse.json({ error: "Acceso restringido" }, { status: 403 });
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    // --- Parallel queries for performance ---
    const [
      totalUsers,
      verifiedUsers,
      declarationsByStatus,
      recentActions,
      dailyActivity,
      totalNotifications,
      unreadNotifications,
      recentErrors,
    ] = await Promise.all([
      // Total registered users
      db.user.count(),

      // Verified users
      db.user.count({ where: { verified: true } }),

      // Declarations grouped by status
      db.declaration.groupBy({
        by: ["status"],
        _count: { id: true },
      }),

      // Last 30 audit actions (no PII — just action + timestamp)
      db.auditLog.findMany({
        select: { action: true, timestamp: true, declarationId: true },
        orderBy: { timestamp: "desc" },
        take: 30,
      }),

      // Daily action counts for last 7 days
      db.$queryRaw<{ day: string; count: bigint }[]>`
        SELECT DATE(timestamp) as day, COUNT(*) as count
        FROM audit_logs
        WHERE timestamp >= ${sevenDaysAgo}
        GROUP BY DATE(timestamp)
        ORDER BY day ASC
      `,

      // Total notifications sent
      db.notification.count(),

      // Unread notifications
      db.notification.count({ where: { readAt: null } }),

      // Errors in last 24h (actions that might indicate issues)
      db.auditLog.count({
        where: {
          timestamp: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
          action: { in: ["ACCOUNT_DELETED", "USER_REPORTED", "USER_BLOCKED"] },
        },
      }),
    ]);

    // --- Build status summary ---
    const statusMap: Record<string, number> = {};
    for (const row of declarationsByStatus) {
      statusMap[row.status] = row._count.id;
    }

    const totalDeclarations = Object.values(statusMap).reduce((a, b) => a + b, 0);
    const activeDeclarations = (statusMap["DRAFT"] ?? 0)
      + (statusMap["PENDING_B"] ?? 0)
      + (statusMap["NEGOTIATING"] ?? 0)
      + (statusMap["PENDING_A"] ?? 0)
      + (statusMap["SIGNED"] ?? 0);
    const completedDeclarations = statusMap["COMPLETED"] ?? 0;
    const sealedDeclarations = statusMap["SIGNED"] ?? 0;

    // --- Funnel: conversion rates ---
    const funnel = {
      created: totalDeclarations,
      accepted: totalDeclarations - (statusMap["PENDING_B"] ?? 0) - (statusMap["EXPIRED"] ?? 0) - (statusMap["REJECTED"] ?? 0),
      signed: sealedDeclarations + completedDeclarations,
      completed: completedDeclarations,
    };

    // --- Daily activity ---
    const daily = dailyActivity.map((row) => ({
      day: String(row.day).slice(0, 10),
      count: Number(row.count),
    }));

    return NextResponse.json({
      generatedAt: now.toISOString(),
      users: {
        total: totalUsers,
        verified: verifiedUsers,
        verificationRate: totalUsers > 0 ? Math.round((verifiedUsers / totalUsers) * 100) : 0,
      },
      declarations: {
        total: totalDeclarations,
        active: activeDeclarations,
        completed: completedDeclarations,
        byStatus: statusMap,
      },
      funnel,
      notifications: {
        total: totalNotifications,
        unread: unreadNotifications,
      },
      activity: {
        last7Days: daily,
        recentActions: recentActions.map((a) => ({
          action: a.action,
          timestamp: a.timestamp,
          hasDeclaration: !!a.declarationId,
        })),
      },
      alerts: {
        reportsAndBlocks24h: recentErrors,
      },
    });
  } catch (err) {
    console.error("[admin/metrics] Error:", err);
    return NextResponse.json({ error: "Error al obtener métricas" }, { status: 500 });
  }
}
