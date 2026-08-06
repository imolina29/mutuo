"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

interface InviteData {
  id: string;
  meetingDate: string;
  meetingPlace: string;
  meetingType: string;
  creator: { fullName: string };
  clauses: { id: string; type: string; text: string }[];
}

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const { status: authStatus } = useSession();
  const router = useRouter();
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/invite/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          setError(data.error);
        } else {
          setInvite(await res.json());
        }
        setLoading(false);
      });
  }, [token]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-mutuo-gray">Cargando invitación...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <Alert variant="destructive">{error}</Alert>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!invite) return null;

  const needsAuth = authStatus !== "authenticated";

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-mutuo-primary">
            Declaración de Intención Mutua
          </CardTitle>
          <CardDescription>
            <strong>{invite.creator.fullName}</strong> te invita a firmar una declaración de intención mutua.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-mutuo-gray">Fecha del encuentro</p>
              <p>{new Date(invite.meetingDate).toLocaleDateString("es-CO", { dateStyle: "long" })}</p>
            </div>
            <div>
              <p className="font-medium text-mutuo-gray">Lugar</p>
              <p>{invite.meetingPlace}</p>
            </div>
            <div>
              <p className="font-medium text-mutuo-gray">Tipo de encuentro</p>
              <p>{invite.meetingType}</p>
            </div>
          </div>

          <Separator />

          <div>
            <p className="font-medium mb-2">Cláusulas de la declaración:</p>
            <ul className="space-y-2">
              {invite.clauses.map((clause) => (
                <li key={clause.id} className="flex items-start gap-2">
                  <Badge variant={clause.type === "VOLUNTARY_MEETING" ? "default" : "secondary"} className="mt-0.5 shrink-0">
                    {clause.type === "VOLUNTARY_MEETING" ? "Obligatoria" : "Opcional"}
                  </Badge>
                  <span className="text-sm">{clause.text}</span>
                </li>
              ))}
            </ul>
          </div>

          <Separator />

          <Alert>
            <p className="text-sm">
              <strong>Aviso legal:</strong> Esta declaración es una manifestación de voluntad de encuentro,
              no una autorización de actividad sexual. El consentimiento es revocable en cualquier momento.
            </p>
          </Alert>

          {needsAuth ? (
            <div className="space-y-2">
              <p className="text-sm text-mutuo-gray">Para responder, necesitas iniciar sesión o crear una cuenta.</p>
              <div className="flex gap-2">
                <Button asChild className="flex-1 bg-mutuo-primary hover:bg-mutuo-primary-light">
                  <a href={`/auth/login?callbackUrl=/invite/${token}`}>Iniciar sesión</a>
                </Button>
                <Button asChild variant="outline" className="flex-1">
                  <a href={`/auth/register?callbackUrl=/invite/${token}`}>Crear cuenta</a>
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                className="flex-1 bg-mutuo-success hover:bg-mutuo-success/90"
                onClick={() => router.push(`/declarations/${invite.id}/sign?token=${token}`)}
              >
                Aceptar y firmar
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => router.push(`/declarations/${invite.id}/sign?token=${token}&mode=negotiate`)}
              >
                Proponer cambios
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => router.push(`/declarations/${invite.id}/sign?token=${token}&mode=reject`)}
              >
                Rechazar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
