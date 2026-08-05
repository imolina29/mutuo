import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const registerSchema = z.object({
  fullName: z.string().min(3).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
  cedulaNumber: z.string().min(5).max(15),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { fullName, email, phone, cedulaNumber } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Ya existe una cuenta con este correo" }, { status: 409 });
  }

  await db.user.create({
    data: { fullName, email, phone, cedulaNumber },
  });

  return NextResponse.json({ success: true }, { status: 201 });
}
