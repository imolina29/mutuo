// src/app/profile/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function ProfilePage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <main className="max-w-lg mx-auto px-4 py-8 w-full">
        <p className="text-mutuo-gray" role="status" aria-live="polite">
          Cargando...
        </p>
      </main>
    );
  }

  if (!session) return null;

  return (
    <main className="max-w-lg mx-auto px-4 py-8 w-full">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl text-mutuo-primary">Mi perfil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="inline font-medium">Nombre:</dt>{" "}
              <dd className="inline">{session.user.fullName}</dd>
            </div>
            <div>
              <dt className="inline font-medium">Correo:</dt>{" "}
              <dd className="inline">{session.user.email}</dd>
            </div>
            <div>
              <dt className="inline font-medium">Identidad:</dt>{" "}
              <dd className="inline">
                {session.user.verified ? (
                  <Badge variant="default">Verificada</Badge>
                ) : (
                  <Link href="/identity/verify" className="text-mutuo-primary underline">
                    Verificar ahora
                  </Link>
                )}
              </dd>
            </div>
          </dl>
          <Link
            href="/profile/blocked"
            className="block text-sm text-mutuo-gray hover:text-mutuo-primary underline"
          >
            Usuarios bloqueados
          </Link>
          <div className="pt-4 border-t">
            <Link
              href="/profile/delete"
              className="text-sm text-red-600 hover:text-red-800 underline"
            >
              Eliminar mi cuenta y datos personales
            </Link>
            <p className="text-xs text-mutuo-gray mt-1">
              Conforme a la Ley 1581 de 2012, puedes solicitar la eliminación de tus datos en cualquier momento.
            </p>
          </div>
          <p className="text-xs text-mutuo-gray text-center pt-2 border-t">
            Si necesitas ayuda, llama a la{" "}
            <a href="tel:155" className="font-semibold text-mutuo-primary underline">
              Línea 155
            </a>{" "}
            — atención a víctimas de violencia de género.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
