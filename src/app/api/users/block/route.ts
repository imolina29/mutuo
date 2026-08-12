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
