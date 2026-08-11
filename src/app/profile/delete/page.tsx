// src/app/profile/delete/page.tsx
"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";

export default function DeleteAccountPage() {
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);

  async function handleDelete() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/account/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation }),
      });
      const data = await res.json();
      if (res.ok) {
        setDeleted(true);
        // Sign out after 3 seconds
        setTimeout(() => signOut({ callbackUrl: "/" }), 3000);
      } else {
        setError(data.error ?? "Error al eliminar la cuenta");
      }
    } catch {
      setError("Error de conexión");
    }
    setLoading(false);
  }

  if (deleted) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="text-4xl">✅</div>
            <h2 className="text-xl font-semibold text-mutuo-primary">Cuenta eliminada</h2>
            <p className="text-sm text-mutuo-gray">
              Tus datos han sido eliminados permanentemente. Recibirás un correo de confirmación.
            </p>
            <p className="text-xs text-mutuo-gray">Serás redirigido al inicio en unos segundos...</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-red-600">Eliminar cuenta</CardTitle>
          <CardDescription>
            Esta acción es permanente e irreversible. Se eliminará toda tu información personal
            conforme a la Ley 1581 de 2012 (Habeas Data).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <p className="text-sm font-medium">Se eliminará permanentemente:</p>
            <ul className="text-sm mt-2 space-y-1 list-disc list-inside">
              <li>Tu información personal (nombre, correo, teléfono, cédula)</li>
              <li>Fotografías de identidad (cédula y selfie)</li>
              <li>Notificaciones, bloqueos y reportes</li>
            </ul>
            <p className="text-sm mt-2 font-medium">Se conservará (obligación legal):</p>
            <ul className="text-sm mt-1 space-y-1 list-disc list-inside">
              <li>Registros de auditoría anonimizados</li>
              <li>Declaraciones selladas (Ley 527/1999)</li>
            </ul>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="confirmation">
              Escribe <span className="font-bold text-red-600">ELIMINAR</span> para confirmar
            </Label>
            <Input
              id="confirmation"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder="ELIMINAR"
              className="font-mono"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert">{error}</p>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => window.history.back()}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              disabled={confirmation !== "ELIMINAR" || loading}
              onClick={handleDelete}
            >
              {loading ? "Eliminando..." : "Eliminar mi cuenta"}
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
