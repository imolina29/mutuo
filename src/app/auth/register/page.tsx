"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function RegisterForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "";
  const [form, setForm] = useState({
    nombres: "",
    apellidos: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    cedulaNumber: "",
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!acceptedTerms || !acceptedPrivacy) return;

    if (form.password !== form.confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (form.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombres: form.nombres,
          apellidos: form.apellidos,
          email: form.email,
          password: form.password,
          phone: form.phone,
          cedulaNumber: form.cedulaNumber,
        }),
      });
      if (res.ok) {
        setSuccess(true);
      } else {
        const data = await res.json().catch(() => ({}));
        const msg = typeof data?.error === "string"
          ? data.error
          : "Ocurrió un error al crear tu cuenta. Inténtalo de nuevo.";
        setError(msg);
      }
    } catch {
      setError("No se pudo conectar con el servidor. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  const loginHref = `/auth/login${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`;

  if (success) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-mutuo-primary">Registro exitoso</CardTitle>
          <CardDescription>
            Tu cuenta ha sido creada. Ahora puedes{" "}
            <a href={loginHref} className="text-mutuo-primary underline">iniciar sesión</a>.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl text-mutuo-primary">Crear cuenta</CardTitle>
        <CardDescription>
          Ingresa tus datos <strong>tal como aparecen en tu cédula de ciudadanía</strong>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombres">Nombres <span className="text-xs text-muted-foreground">(como aparecen en tu cédula)</span></Label>
            <Input
              id="nombres"
              placeholder="Ej: MARÍA CAMILA"
              value={form.nombres}
              onChange={(e) => setForm({ ...form, nombres: e.target.value })}
              required
              aria-required="true"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apellidos">Apellidos <span className="text-xs text-muted-foreground">(como aparecen en tu cédula)</span></Label>
            <Input
              id="apellidos"
              placeholder="Ej: GARCÍA LÓPEZ"
              value={form.apellidos}
              onChange={(e) => setForm({ ...form, apellidos: e.target.value })}
              required
              aria-required="true"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cedula">Número de cédula <span className="text-xs text-muted-foreground">(solo números)</span></Label>
            <Input
              id="cedula"
              placeholder="Ej: 1234567890"
              value={form.cedulaNumber}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, "");
                setForm({ ...form, cedulaNumber: val });
              }}
              required
              aria-required="true"
              inputMode="numeric"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              aria-required="true"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña <span className="text-xs text-muted-foreground">(mínimo 8 caracteres)</span></Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              aria-required="true"
              minLength={8}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              required
              aria-required="true"
              minLength={8}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono <span className="text-xs text-muted-foreground">(opcional)</span></Label>
            <Input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <Checkbox id="terms" checked={acceptedTerms} onCheckedChange={(v) => setAcceptedTerms(v === true)} aria-required="true" />
              <Label htmlFor="terms" className="text-sm leading-snug">
                Acepto los <a href="/legal/terms" className="text-mutuo-primary underline" target="_blank" rel="noreferrer">términos y condiciones</a>
              </Label>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox id="privacy" checked={acceptedPrivacy} onCheckedChange={(v) => setAcceptedPrivacy(v === true)} aria-required="true" />
              <Label htmlFor="privacy" className="text-sm leading-snug">
                Autorizo el <a href="/legal/privacy" className="text-mutuo-primary underline" target="_blank" rel="noreferrer">tratamiento de mis datos personales</a> (Ley 1581 de 2012)
              </Label>
            </div>
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full bg-mutuo-primary hover:bg-mutuo-primary-light" disabled={loading || !acceptedTerms || !acceptedPrivacy}>
            {loading ? "Registrando..." : "Crear cuenta"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-mutuo-gray">
          ¿Ya tienes cuenta?{" "}
          <a href={loginHref} className="text-mutuo-primary underline">
            Inicia sesión
          </a>
        </p>
      </CardContent>
    </Card>
  );
}

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Suspense fallback={<p className="text-mutuo-gray">Cargando...</p>}>
        <RegisterForm />
      </Suspense>
    </main>
  );
}
