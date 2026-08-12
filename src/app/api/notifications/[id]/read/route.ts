// src/app/api/notifications/[id]/read/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSessionUser } from "@/lib/session";
import { isValidUuid } from "@/lib/validate-uuid";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isValidUuid(params.id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    const user = await getServerSessionUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const notification = await db.notification.findUnique({ where: { id: params.id } });
    if (!notification || notification.userId !== user.id) {
      return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    }

    await db.notification.update({
      where: { id: params.id },
      data: { readAt: new Date() },
    });

    return NextResponse.json({ read: true });
  } catch (err) {
    console.error("[notifications/read] Error:", err);
    return NextResponse.json({ error: "Error al marcar como leída" }, { status: 500 });
  }
}
