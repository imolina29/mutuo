// src/app/identity/verify/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { CedulaUpload } from "@/components/identity/cedula-upload";
import { SelfieCapture } from "@/components/identity/selfie-capture";

export default function IdentityVerifyPage() {
  const router = useRouter();
  const [cedulaFront, setCedulaFront] = useState<File | null>(null);
  const [cedulaBack, setCedulaBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allReady = cedulaFront && cedulaBack && selfie;

  async function handleSubmit() {
    if (!allReady) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("cedulaFront", cedulaFront);
    formData.append("cedulaBack", cedulaBack);
    formData.append("selfie", selfie);

    try {
      const res = await fetch("/api/identity/verify", { method: "POST", body: formData });
      if (res.ok) {
        router.push("/dashboard");
      } else {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          setError(data.error ?? "Error al verificar identidad");
        } catch {
          setError("Error al verificar identidad. Intenta de nuevo.");
        }
      }
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    }
    setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-mutuo-primary">Verificación de identidad</CardTitle>
          <CardDescription>
            Sube las fotos de tu cédula de ciudadanía (ambos lados) y una selfie para verificar tu
            identidad. Tus documentos se almacenan de forma cifrada.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && <Alert variant="destructive">{error}</Alert>}
          <CedulaUpload side="front" onFileSelected={setCedulaFront} />
          <CedulaUpload side="back" onFileSelected={setCedulaBack} />
          <SelfieCapture onCapture={setSelfie} />
          <Button
            onClick={handleSubmit}
            className="w-full bg-mutuo-primary hover:bg-mutuo-primary-light"
            disabled={!allReady || loading}
          >
            {loading ? "Verificando..." : "Verificar identidad"}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
