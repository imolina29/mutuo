// src/app/profile/blocked/page.tsx
"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function BlockedUsersPage() {
  return (
    <main className="max-w-lg mx-auto px-4 py-8 w-full">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl text-mutuo-primary">Usuarios bloqueados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-mutuo-gray">
            Los usuarios que bloquees no podrán enviarte invitaciones.
          </p>
          <p className="text-sm text-mutuo-gray">Aún no has bloqueado a ningún usuario.</p>
          <Link href="/profile" className="text-sm text-mutuo-primary underline">
            Volver a mi perfil
          </Link>
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
