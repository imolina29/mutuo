"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setStep("otp");
      } else {
        setError("Error al enviar el código. Intenta de nuevo.");
      }
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    }
    setLoading(false);
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("otp", {
      email,
      otp,
      redirect: false,
    });

    if (result?.ok) {
      router.push("/dashboard");
    } else {
      setError("Código incorrecto o expirado. Intenta de nuevo.");
    }
    setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-mutuo-primary">Iniciar sesión</CardTitle>
          <CardDescription>
            {step === "email"
              ? "Ingresa tu correo electrónico. Recibirás un código de verificación."
              : `Enviamos un código de 6 dígitos a ${email}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "email" ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  aria-required="true"
                />
              </div>
              {error && (
                <p className="text-sm text-mutuo-danger" role="alert">{error}</p>
              )}
              <Button
                type="submit"
                className="w-full bg-mutuo-primary hover:bg-mutuo-primary/90"
                disabled={loading}
              >
                {loading ? "Enviando..." : "Enviar código de verificación"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Código de verificación</Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  aria-required="true"
                  className="text-center text-2xl tracking-[0.5em] font-mono"
                  autoFocus
                />
              </div>
              {error && (
                <p className="text-sm text-mutuo-danger" role="alert">{error}</p>
              )}
              <Button
                type="submit"
                className="w-full bg-mutuo-primary hover:bg-mutuo-primary/90"
                disabled={loading || otp.length !== 6}
              >
                {loading ? "Verificando..." : "Verificar código"}
              </Button>
              <button
                type="button"
                onClick={() => { setStep("email"); setOtp(""); setError(""); }}
                className="w-full text-sm text-mutuo-gray hover:text-mutuo-primary"
              >
                ← Cambiar correo o reenviar código
              </button>
            </form>
          )}
          <p className="mt-4 text-center text-sm text-mutuo-gray">
            ¿No tienes cuenta? Ingresa tu correo y se creará automáticamente.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
