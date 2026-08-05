"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function RegisterPage() {
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", cedulaNumber: "" });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!acceptedTerms || !acceptedPrivacy) return;
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-mutuo-primary">Registro exitoso</CardTitle>
            <CardDescription>
              Tu cuenta ha sido creada. Ahora puedes{" "}
              <a href="/auth/login" className="text-mutuo-primary underline">iniciar sesión</a>.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-mutuo-primary">Crear cuenta</CardTitle>
          <CardDescription>Completa tus datos para registrarte en Mutuo.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nombre completo</Label>
              <Input id="fullName" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required aria-required="true" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required aria-required="true" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cedula">Número de cédula</Label>
              <Input id="cedula" value={form.cedulaNumber} onChange={(e) => setForm({ ...form, cedulaNumber: e.target.value })} required aria-required="true" />
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
            <Button type="submit" className="w-full bg-mutuo-primary hover:bg-mutuo-primary-light" disabled={loading || !acceptedTerms || !acceptedPrivacy}>
              {loading ? "Registrando..." : "Crear cuenta"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
