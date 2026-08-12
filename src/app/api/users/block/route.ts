// src/app/api/users/block/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSessionUser } from "@/lib/session";
import { logAudit, extractRequestMeta } from "@/lib/audit";
import { blockSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const user = await getServerSessionUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

    const parsed = blockSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    if (parsed.data.blockedId === user.id) {
      return NextResponse.json({ error: "No puedes bloquearte a ti mismo" }, { status: 400 });
    }

    await db.userBlock.upsert({
      where: { blockerId_blockedId: { blockerId: user.id, blockedId: parsed.data.blockedId } },
      create: { blockerId: user.id, blockedId: parsed.data.blockedId },
      update: {},
    });

    const meta = extractRequestMeta(req);
    await logAudit({ userId: user.id, action: "USER_BLOCKED", details: { blockedId: parsed.data.blockedId }, ...meta });

    return NextResponse.json({ blocked: true });
  } catch (err) {
    console.error("[block] Error:", err);
    return NextResponse.json({ error: "Error al bloquear usuario" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const user = await getServerSessionUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const blocks = await db.userBlock.findMany({
      where: { blockerId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(blocks);
  } catch (err) {
    console.error("[block/GET] Error:", err);
    return NextResponse.json({ error: "Error al obtener bloqueados" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getServerSessionUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await req.json().catch(() => null);
    if (!body?.blockedId) return NextResponse.json({ error: "blockedId requerido" }, { status: 400 });

    await db.userBlock.deleteMany({
      where: { blockerId: user.id, blockedId: body.blockedId },
    });

    const meta = extractRequestMeta(req);
    await logAudit({ userId: user.id, action: "USER_UNBLOCKED", details: { blockedId: body.blockedId }, ...meta });

    return NextResponse.json({ unblocked: true });
  } catch (err) {
    console.error("[block/DELETE] Error:", err);
    return NextResponse.json({ error: "Error al desbloquear usuario" }, { status: 500 });
  }
}
