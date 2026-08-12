import { NextRequest, NextResponse } from "next/server";
import { sendOtp } from "@/lib/auth-options";
import { checkOtpSendLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Correo requerido" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json({ error: "Formato de correo inválido" }, { status: 400 });
    }

    // Rate limit: max 3 OTP sends per email per 15 minutes
    const limit = checkOtpSendLimit(normalizedEmail);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: `Demasiados intentos. Intenta de nuevo en ${limit.retryAfterSeconds} segundos.` },
        { status: 429 }
      );
    }

    await sendOtp(normalizedEmail);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[send-otp error]", err);
    return NextResponse.json({ error: "Error al enviar código" }, { status: 500 });
  }
}
