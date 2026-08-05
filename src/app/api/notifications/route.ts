// src/app/api/notifications/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSessionUser } from "@/lib/session";

export async function GET() {
  const user = await getServerSessionUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const notifications = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { sentAt: "desc" },
    take: 50,
  });

  return NextResponse.json(notifications);
}
