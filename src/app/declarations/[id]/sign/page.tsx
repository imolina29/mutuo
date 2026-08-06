"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { DeclarationPreview } from "@/components/declaration/declaration-preview";
import type { DeclarationWithRelations } from "@/types";

export default function SignPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [declaration, setDeclaration] = useState<DeclarationWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ sealed: boolean; hash?: string; status: string } | null>(
    null
  );

  useEffect(() => {
    fetch(`/api/declarations/${id}`)
      .then(async (res) => {
        if (res.ok) {
          setDeclaration(await res.json());
        } else {
          setError("No se pudo cargar la declaración");
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Error de conexión");
        setLoading(false);
      });
  }, [id]);

  async function handleSign() {
    setSigning(true);
    setError(null);
    try {
      const res = await fetch(`/api/declarations/${id}/sign`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
      } else {
        setError(data.error ?? "Error al firmar");
      }
    } catch {
      setError("Error de conexión al firmar");
    }
    setSigning(false);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-[#6b7280]">Cargando...</p>
      </main>
    );
  }

  if (!declaration) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <Alert variant="destructive">{error ?? "Declaración no encontrada"}</Alert>
      </main>
    );
  }

  if (result?.sealed) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-8">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-[#16a34a]">Declaración sellada</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-[#6b7280]">
              La declaración ha sido firmada por ambas partes y sellada con validez probatoria.
            </p>
            <div className="bg-gray-50 p-3 rounded text-xs font-mono break-all">
              <p>
                <strong>Hash SHA-256:</strong> {result.hash}
              </p>
            </div>
            <Button
              onClick={() => router.push(`/declarations/${id}`)}
              className="w-full bg-[#1e3a5f] hover:bg-[#1e3a5f]/90"
            >
              Ver declaración
            </Button>
            <p className="text-xs text-[#6b7280] text-center">
              Si necesitas ayuda, llama a la{" "}
              <a href="tel:155" className="font-semibold underline">
                Línea 155
              </a>
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-[#1e3a5f]">Firmar declaración</h1>

      <DeclarationPreview
        creatorName={declaration.creator.fullName}
        invitedName={declaration.invited?.fullName ?? null}
        meetingDate={
          declaration.meetingDate ? new Date(declaration.meetingDate).toISOString() : null
        }
        meetingPlace={declaration.meetingPlace}
        meetingType={declaration.meetingType}
        clauses={declaration.clauses}
        sealedHash={null}
        sealedAt={null}
      />

      {error && <Alert variant="destructive">{error}</Alert>}

      <div className="space-y-3 p-4 border rounded-lg">
        <div className="flex items-start gap-2">
          <Checkbox
            id="accept"
            checked={accepted}
            onCheckedChange={(v) => setAccepted(v === true)}
            aria-required="true"
          />
          <Label htmlFor="accept" className="text-sm leading-snug cursor-pointer">
            He leído y acepto todas las cláusulas de esta declaración. Entiendo que esta es una
            manifestación de voluntad de encuentro y que el consentimiento es revocable en
            cualquier momento.
          </Label>
        </div>
      </div>

      <Button
        onClick={handleSign}
        className="w-full bg-[#1e3a5f] hover:bg-[#1e3a5f]/90"
        disabled={!accepted || signing}
        aria-busy={signing}
      >
        {signing ? "Firmando..." : "Firmar declaración"}
      </Button>

      <p className="text-xs text-[#6b7280] text-center">
        Si necesitas ayuda, llama a la{" "}
        <a href="tel:155" className="font-semibold text-[#1e3a5f] underline">
          Línea 155
        </a>{" "}
        — atención a víctimas de violencia de género.
      </p>
    </main>
  );
}
