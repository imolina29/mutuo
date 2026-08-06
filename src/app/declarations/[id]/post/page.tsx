"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";

const OPTIONS = [
  {
    value: "OK",
    label: "Encuentro sin novedad",
    description: "El encuentro se realizó con normalidad",
  },
  {
    value: "WITHDREW",
    label: "Me retiré voluntariamente",
    description: "Decidí retirarme durante el encuentro",
  },
  {
    value: "OTHER_WITHDREW",
    label: "La otra parte se retiró",
    description: "La otra persona se retiró durante el encuentro",
  },
  {
    value: "NOT_HELD",
    label: "No se realizó el encuentro",
    description: "El encuentro no tuvo lugar",
  },
] as const;

export default function PostMeetingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    if (!selected) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/declarations/${id}/post-meeting`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: selected, notes: notes || undefined }),
      });
      if (res.ok) {
        setDone(true);
      } else {
        const data = await res.json();
        setError(typeof data.error === "string" ? data.error : "No se pudo registrar el encuentro");
      }
    } catch {
      setError("Error de conexión al registrar el encuentro");
    }
    setLoading(false);
  }

  if (done) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-8">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-[#16a34a]">Registro guardado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-[#6b7280]">
              Tu registro post-encuentro ha quedado guardado con marca de tiempo certificada.
            </p>
            <Button
              onClick={() => router.push(`/declarations/${id}`)}
              className="w-full bg-[#1e3a5f] hover:bg-[#1e3a5f]/90"
            >
              Ver declaración
            </Button>
            <p className="text-xs text-[#6b7280] text-center">
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

  return (
    <main className="max-w-lg mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl text-[#1e3a5f]">Registro post-encuentro</CardTitle>
          <CardDescription>
            Registra cómo fue el encuentro. Esta información queda con marca de tiempo
            certificada.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <Alert variant="destructive">{error}</Alert>}

          <fieldset className="space-y-2">
            <legend className="sr-only">¿Cómo fue el encuentro?</legend>
            {OPTIONS.map((opt) => (
              <label
                key={opt.value}
                htmlFor={`option-${opt.value}`}
                className={`block w-full text-left p-3 rounded-lg border cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-[#1e3a5f] focus-within:ring-offset-2 ${
                  selected === opt.value
                    ? "border-[#1e3a5f] bg-[#1e3a5f]/5"
                    : "border-gray-200 hover:border-[#1e3a5f]/50"
                }`}
              >
                <span className="flex items-start gap-3">
                  <input
                    type="radio"
                    id={`option-${opt.value}`}
                    name="post-meeting-status"
                    value={opt.value}
                    checked={selected === opt.value}
                    onChange={() => setSelected(opt.value)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block font-medium text-sm">{opt.label}</span>
                    <span className="block text-xs text-[#6b7280]">{opt.description}</span>
                  </span>
                </span>
              </label>
            ))}
          </fieldset>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas adicionales (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              placeholder="Agrega detalles si lo consideras necesario..."
            />
          </div>

          <Button
            onClick={handleSubmit}
            className="w-full bg-[#1e3a5f] hover:bg-[#1e3a5f]/90"
            disabled={!selected || loading}
            aria-busy={loading}
          >
            {loading ? "Registrando..." : "Registrar"}
          </Button>

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
