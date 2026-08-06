// src/app/declarations/new/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { ClauseSelector, type SelectedClause } from "@/components/declaration/clause-selector";
import { CLAUSE_TEMPLATES } from "@/lib/clauses";

const VOLUNTARY_TEMPLATE = CLAUSE_TEMPLATES.find((t) => t.type === "VOLUNTARY_MEETING")!;

export default function NewDeclarationPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingPlace, setMeetingPlace] = useState("");
  const [meetingType, setMeetingType] = useState("");
  const [clauses, setClauses] = useState<SelectedClause[]>([
    { type: VOLUNTARY_TEMPLATE.type, text: VOLUNTARY_TEMPLATE.text },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);

  async function handleCreate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/declarations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetingDate: new Date(meetingDate).toISOString(),
          meetingPlace,
          meetingType,
          clauses,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setInviteToken(data.inviteToken);
        setStep(3);
      } else {
        setError(typeof data.error === "string" ? data.error : "Error al crear la declaración");
      }
    } catch {
      setError("Error de conexión al crear la declaración");
    }
    setLoading(false);
  }

  if (step === 3 && inviteToken) {
    const inviteUrl = `${window.location.origin}/invite/${inviteToken}`;
    return (
      <main className="max-w-lg mx-auto px-4 py-8 w-full">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-mutuo-success">Declaración creada</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">
              Comparte este enlace con la otra persona. Tiene 72 horas para responder.
            </p>
            <div className="flex gap-2">
              <Label htmlFor="invite-url" className="sr-only">
                Enlace de invitación
              </Label>
              <Input id="invite-url" value={inviteUrl} readOnly className="font-mono text-xs" />
              <Button
                type="button"
                variant="outline"
                onClick={() => navigator.clipboard.writeText(inviteUrl)}
              >
                Copiar
              </Button>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline" className="flex-1">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `Te invito a firmar una declaración de intención mutua: ${inviteUrl}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WhatsApp
                </a>
              </Button>
              <Button onClick={() => router.push("/dashboard")} className="flex-1 bg-mutuo-primary hover:bg-mutuo-primary-light">
                Ir al panel
              </Button>
            </div>
            <p className="text-xs text-mutuo-gray text-center pt-2">
              Si necesitas ayuda, llama a la{" "}
              <a href="tel:155" className="font-semibold text-mutuo-primary underline">
                Línea 155
              </a>
              .
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-8 w-full">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl text-mutuo-primary">
            {step === 1 ? "Datos del encuentro" : "Cláusulas de la declaración"}
          </CardTitle>
          <p className="text-sm text-mutuo-gray" aria-live="polite">
            Paso {step} de 2
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <Alert variant="destructive">{error}</Alert>}
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="date">Fecha y hora aproximada</Label>
                <Input
                  id="date"
                  type="datetime-local"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  required
                  aria-required="true"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="place">Lugar del encuentro</Label>
                <Input
                  id="place"
                  value={meetingPlace}
                  onChange={(e) => setMeetingPlace(e.target.value)}
                  placeholder="Ej: Bogotá, Zona T"
                  required
                  aria-required="true"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Tipo de encuentro</Label>
                <Input
                  id="type"
                  value={meetingType}
                  onChange={(e) => setMeetingType(e.target.value)}
                  placeholder="Ej: cena, café, reunión"
                  required
                  aria-required="true"
                />
              </div>
              <Button
                onClick={() => setStep(2)}
                className="w-full bg-mutuo-primary hover:bg-mutuo-primary-light"
                disabled={!meetingDate || !meetingPlace || !meetingType}
              >
                Siguiente
              </Button>
            </>
          )}
          {step === 2 && (
            <>
              <ClauseSelector value={clauses} onChange={setClauses} />
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Atrás
                </Button>
                <Button
                  onClick={handleCreate}
                  className="flex-1 bg-mutuo-primary hover:bg-mutuo-primary-light"
                  disabled={loading}
                  aria-busy={loading}
                >
                  {loading ? "Creando..." : "Crear y enviar invitación"}
                </Button>
              </div>
            </>
          )}
          <p className="text-xs text-mutuo-gray text-center pt-2">
            Si necesitas ayuda, llama a la{" "}
            <a href="tel:155" className="font-semibold text-mutuo-primary underline">
              Línea 155
            </a>
            .
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
