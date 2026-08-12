import { NextResponse } from "next/server";

// OTP authentication has been replaced by password-based auth.
// This endpoint is kept to return a clear message if called.
export async function POST() {
  return NextResponse.json(
    { error: "La autenticación por OTP ha sido reemplazada. Usa correo y contraseña." },
    { status: 410 }
  );
}
