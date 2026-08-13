// src/app/identity/verify/page.tsx
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { CedulaUpload } from "@/components/identity/cedula-upload";
import { SelfieCapture } from "@/components/identity/selfie-capture";

interface VerificationCheck {
  field: string;
  passed: boolean;
  message: string;
}

export default function IdentityVerifyPage() {
  const router = useRouter();
  const [cedulaFront, setCedulaFront] = useState<File | null>(null);
  const [cedulaBack, setCedulaBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checks, setChecks] = useState<VerificationCheck[]>([]);
  const [ocrProgress, setOcrProgress] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const allReady = cedulaFront && cedulaBack && selfie;

  const handleSubmit = useCallback(async () => {
    if (!allReady) return;
    setLoading(true);
    setError(null);
    setChecks([]);
    setStatusMessage(null);

    try {
      // --- Step 1: Run OCR in the browser ---
      setStatusMessage("Analizando cédula con OCR...");
      setOcrProgress(0);

      let ocrRawText = "";
      let ocrExtractedNombres: string | null = null;
      let ocrExtractedApellidos: string | null = null;
      let ocrExtractedCedula: string | null = null;

      try {
        const { ocrCedulaClient } = await import("@/lib/ocr-client");
        const ocrResult = await ocrCedulaClient(cedulaFront, (p) => setOcrProgress(p));
        ocrRawText = ocrResult.rawText;
        ocrExtractedNombres = ocrResult.extractedNombres;
        ocrExtractedApellidos = ocrResult.extractedApellidos;
        ocrExtractedCedula = ocrResult.extractedCedula;
      } catch (ocrErr) {
        console.error("OCR client error:", ocrErr);
      }

      setOcrProgress(null);

      // --- Step 2: Send images + OCR data to server ---
      setStatusMessage("Verificando identidad...");

      const formData = new FormData();
      formData.append("cedulaFront", cedulaFront);
      formData.append("cedulaBack", cedulaBack);
      formData.append("selfie", selfie);
      formData.append("ocrRawText", ocrRawText);
      if (ocrExtractedNombres) formData.append("ocrExtractedNombres", ocrExtractedNombres);
      if (ocrExtractedApellidos) formData.append("ocrExtractedApellidos", ocrExtractedApellidos);
      if (ocrExtractedCedula) formData.append("ocrExtractedCedula", ocrExtractedCedula);

      const res = await fetch("/api/identity/verify", { method: "POST", body: formData });

      const text = await res.text();
      let data: { error?: string; checks?: VerificationCheck[]; verified?: boolean } = {};
      try {
        data = JSON.parse(text);
      } catch {
        setError("Error al verificar identidad. Intenta de nuevo.");
        setLoading(false);
        setStatusMessage(null);
        return;
      }

      if (res.ok && data.verified) {
        setStatusMessage("¡Identidad verificada! ✅");
        setChecks(data.checks ?? []);
        setTimeout(() => router.push("/dashboard"), 1500);
      } else {
        setError(data.error ?? "Error al verificar identidad");
        if (data.checks) setChecks(data.checks);
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

          {/* Detailed check results */}
          {checks.length > 0 && (
            <div className="space-y-2 rounded-lg border p-4 bg-muted/30">
              <p className="text-sm font-medium text-foreground">Resultado de la verificación:</p>
              {checks.map((check) => (
                <div key={check.field} className="flex items-start gap-2 text-sm">
                  <span className={`mt-0.5 text-lg leading-none ${check.passed ? "text-green-600" : "text-red-500"}`}>
                    {check.passed ? "✅" : "❌"}
                  </span>
                  <span className={check.passed ? "text-green-700" : "text-red-600"}>
                    {check.message}
                  </span>
                </div>
              ))}
              {checks.some((c) => !c.passed) && (
                <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                  💡 Asegúrate de que la foto de la cédula sea clara, con buena iluminación y sin
                  reflejos. Los datos en tu perfil deben coincidir exactamente con tu cédula.
                </p>
              )}
            </div>
          )}

          {/* Cédula front */}
          <div>
            <CedulaUpload side="front" onFileSelected={setCedulaFront} />
            <p className="text-xs text-muted-foreground mt-1">
              📸 Foto clara del frente de la cédula. Evita reflejos y sombras.
            </p>
          </div>

          {/* Cédula back */}
          <div>
            <CedulaUpload side="back" onFileSelected={setCedulaBack} />
            <p className="text-xs text-muted-foreground mt-1">
              📸 Foto clara del reverso de la cédula.
            </p>
          </div>

          {/* Selfie */}
          <div>
            <SelfieCapture onCapture={setSelfie} />
            <p className="text-xs text-muted-foreground mt-1">
              🤳 Toma una foto de <strong>tu rostro</strong> (no de la cédula).
              Esto confirma que eres tú quien se está registrando.
            </p>
          </div>

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
