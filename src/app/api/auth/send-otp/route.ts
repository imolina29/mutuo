import { NextRequest, NextResponse } from "next/server";
import { sendOtp } from "@/lib/auth-options";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Correo requerido" }, { status: 400 });
    }

    await sendOtp(email.toLowerCase().trim());
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[send-otp error]", err);
    return NextResponse.json({ error: "Error al enviar código" }, { status: 500 });
  }
}
