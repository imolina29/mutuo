// src/app/api/identity/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { v4 as uuid } from "uuid";
import { db } from "@/lib/db";
import { getServerSessionUser } from "@/lib/session";
import { logAudit, extractRequestMeta } from "@/lib/audit";
import { encrypt } from "@/lib/crypto";

const UPLOAD_DIR = join(process.cwd(), "uploads", "identity");

export async function POST(req: NextRequest) {
  const user = await getServerSessionUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const formData = await req.formData();
  const cedulaFront = formData.get("cedulaFront") as File | null;
  const cedulaBack = formData.get("cedulaBack") as File | null;
  const selfie = formData.get("selfie") as File | null;

  if (!cedulaFront || !cedulaBack || !selfie) {
    return NextResponse.json(
      { error: "Se requieren las fotos de la cédula (frente y reverso) y una selfie" },
      { status: 400 }
    );
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  async function saveFile(file: File, prefix: string): Promise<string> {
    const ext = file.name.split(".").pop() ?? "jpg";
    const filename = `${prefix}-${uuid()}.${ext}`;
    const path = join(UPLOAD_DIR, filename);
    const bytes = await file.arrayBuffer();
    await writeFile(path, Buffer.from(bytes));
    return path;
  }

  const cedulaFrontPath = await saveFile(cedulaFront, "cedula-front");
  const cedulaBackPath = await saveFile(cedulaBack, "cedula-back");
  const selfiePath = await saveFile(selfie, "selfie");

  await db.identityVerification.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      cedulaFront: encrypt(cedulaFrontPath),
      cedulaBack: encrypt(cedulaBackPath),
      selfie: encrypt(selfiePath),
      matchScore: null,
    },
    update: {
      cedulaFront: encrypt(cedulaFrontPath),
      cedulaBack: encrypt(cedulaBackPath),
      selfie: encrypt(selfiePath),
      verifiedAt: new Date(),
    },
  });

  await db.user.update({
    where: { id: user.id },
    data: { verified: true },
  });

  const meta = extractRequestMeta(req);
  await logAudit({
    userId: user.id,
    action: "IDENTITY_VERIFIED",
    ...meta,
  });

  return NextResponse.json({ verified: true });
}
