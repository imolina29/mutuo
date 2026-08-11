// src/app/identity/verify/page.tsx
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { CedulaUpload } from "@/components/identity/cedula-upload";
import { SelfieCapture } from "@/components/identity/selfie-capture";
import { ocrCedulaClient } from "@/lib/ocr-client";

export default function IdentityVerifyPage() {
  const router = useRouter();
  const [cedulaFront, setCedulaFront] = useState<File | null>(null);
  const [cedulaBack, setCedulaBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocrProgress, setOcrProgress] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const allReady = cedulaFront && cedulaBack && selfie;

  const handleSubmit = useCallback(async () => {
    if (!allReady) return;
    setLoading(true);
    setError(null);
    setStatusMessage(null);

    try {
      // --- Step 1: Run OCR in the browser ---
      setStatusMessage("Analizando cédula con OCR...");
      setOcrProgress(0);

      let ocrRawText = "";
      let ocrExtractedName: string | null = null;
      let ocrExtractedCedula: string | null = null;

      try {
        const ocrResult = await ocrCedulaClient(cedulaFront, (p) => setOcrProgress(p));
        ocrRawText = ocrResult.rawText;
        ocrExtractedName = ocrResult.extractedName;
        ocrExtractedCedula = ocrResult.extractedCedula;
      } catch (ocrErr) {
        console.error("OCR client error:", ocrErr);
        // OCR failure is not fatal — server will decide if verification can proceed
      }

      setOcrProgress(null);

      // --- Step 2: Send images + OCR data to server ---
      setStatusMessage("Verificando identidad...");

      const formData = new FormData();
      formData.append("cedulaFront", cedulaFront);
      formData.append("cedulaBack", cedulaBack);
      formData.append("selfie", selfie);
      formData.append("ocrRawText", ocrRawText);
      if (ocrExtractedName) formData.append("ocrExtractedName", ocrExtractedName);
      if (ocrExtractedCedula) formData.append("ocrExtractedCedula", ocrExtractedCedula);

      const res = await fetch("/api/identity/verify", { method: "POST", body: formData });

      if (res.ok) {
        setStatusMessage("¡Identidad verificada!");
        setTimeout(() => router.push("/dashboard"), 1000);
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
    setStatusMessage(null);
  }, [allReady, cedulaFront, cedulaBack, selfie, router]);

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

          {/* Progress / status area */}
          {statusMessage && (
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">{statusMessage}</p>
              {ocrProgress !== null && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-mutuo-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${ocrProgress}%` }}
                  />
                </div>
              )}
            </div>
          )}

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
