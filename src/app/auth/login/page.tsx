"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await signIn("email", { email, callbackUrl: "/dashboard" });
    setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-mutuo-primary">Iniciar sesión</CardTitle>
          <CardDescription>
            Ingresa tu correo electrónico. Recibirás un código de verificación.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
            <Button
              type="submit"
              className="w-full bg-mutuo-primary hover:bg-mutuo-primary-light"
              disabled={loading}
            >
              {loading ? "Enviando..." : "Enviar código de verificación"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-mutuo-gray">
            ¿No tienes cuenta?{" "}
            <a href="/auth/register" className="text-mutuo-primary underline">
              Regístrate
            </a>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
