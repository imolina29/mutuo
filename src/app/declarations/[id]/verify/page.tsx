"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

interface VerifyResult {
  intact: boolean;
  hash: string;
  sealedAt: string | null;
  hasTsaResponse: boolean;
}

export default function VerifyPage() {
  const { id } = useParams<{ id: string }>();
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/declarations/${id}/verify`)
      .then(async (res) => {
        if (res.ok) {
          setResult(await res.json());
        } else {
          const data = await res.json();
          setError(data.error ?? "Error al verificar");
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Error de conexión");
        setLoading(false);
      });
  }, [id]);

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-[#1e3a5f]">
            Verificación de integridad
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && (
            <p className="text-[#6b7280] text-center">Verificando documento...</p>
          )}

          {error && <Alert variant="destructive">{error}</Alert>}

          {result && (
            <div className="space-y-4">
              {result.intact ? (
                <Alert
                  className="border-[#16a34a] text-[#16a34a] bg-green-50"
                  role="status"
                  aria-live="polite"
                >
                  <strong>Documento íntegro.</strong> El documento NO ha sido alterado.
                  Su integridad está verificada.
                </Alert>
              ) : (
                <Alert
                  variant="destructive"
                  role="alert"
                  aria-live="assertive"
                >
                  <strong>ALERTA:</strong> El documento puede haber sido alterado. La
                  verificación de integridad ha fallado.
                </Alert>
              )}

              <div className="text-sm space-y-2 bg-gray-50 p-3 rounded font-mono break-all">
                <p>
                  <strong>Hash SHA-256:</strong> {result.hash}
                </p>
                {result.sealedAt && (
                  <p>
                    <strong>Sellado:</strong>{" "}
                    {new Date(result.sealedAt).toLocaleString("es-CO")}
                  </p>
                )}
                <p>
                  <strong>TSA (Autoridad de sellado de tiempo):</strong>{" "}
                  {result.hasTsaResponse ? "Sí" : "No"}
                </p>
              </div>
            </div>
          )}

          <p className="text-xs text-[#6b7280] text-center pt-2">
            Si necesitas ayuda, llama a la{" "}
            <a href="tel:155" className="font-semibold text-[#1e3a5f] underline">
              Línea 155
            </a>{" "}
            — atención a víctimas de violencia de género.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
