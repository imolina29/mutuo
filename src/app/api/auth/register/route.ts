import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

const registerSchema = z.object({
  nombres: z.string().min(2, "Ingresa tus nombres").max(100),
  apellidos: z.string().min(2, "Ingresa tus apellidos").max(100),
  email: z.string().email("Correo electrónico no válido"),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(72, "La contraseña no puede exceder 72 caracteres"),
  phone: z.string().optional(),
  cedulaNumber: z
    .string()
    .min(6, "Mínimo 6 dígitos")
    .max(10, "Máximo 10 dígitos")
    .regex(/^\d+$/, "Solo números, sin puntos ni espacios"),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { nombres, apellidos, email, password, phone, cedulaNumber } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Ya existe una cuenta con este correo" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const fullName = `${nombres.trim()} ${apellidos.trim()}`;

  await db.user.create({
    data: {
      fullName,
      nombres: nombres.trim().toUpperCase(),
      apellidos: apellidos.trim().toUpperCase(),
      email,
      passwordHash,
      phone,
      cedulaNumber: cedulaNumber.replace(/\D/g, ""),
    },
  });

  return NextResponse.json({ success: true }, { status: 201 });
}
