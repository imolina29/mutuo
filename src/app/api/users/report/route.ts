// src/app/api/users/report/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSessionUser } from "@/lib/session";
import { logAudit, extractRequestMeta } from "@/lib/audit";
import { reportSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const user = await getServerSessionUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

    const parsed = reportSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    if (parsed.data.reportedId === user.id) {
      return NextResponse.json({ error: "No puedes reportarte a ti mismo" }, { status: 400 });
    }

    await db.report.create({
      data: { reporterId: user.id, reportedId: parsed.data.reportedId, reason: parsed.data.reason },
    });

    const meta = extractRequestMeta(req);
    await logAudit({ userId: user.id, action: "USER_REPORTED", details: { reportedId: parsed.data.reportedId }, ...meta });

    return NextResponse.json({ reported: true });
  } catch (err) {
    console.error("[report] Error:", err);
    return NextResponse.json({ error: "Error al reportar usuario" }, { status: 500 });
  }
}
