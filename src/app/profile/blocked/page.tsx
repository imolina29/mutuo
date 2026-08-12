// src/app/profile/blocked/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface BlockedUser {
  id: string;
  blockedId: string;
  createdAt: string;
}

export default function BlockedUsersPage() {
  const [blocks, setBlocks] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/users/block")
      .then((res) => res.json())
      .then((data) => {
        setBlocks(Array.isArray(data) ? data : []);
      })
      .catch(() => setError("Error al cargar usuarios bloqueados"))
      .finally(() => setLoading(false));
  }, []);

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

          {loading && <p className="text-sm text-mutuo-gray">Cargando...</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          {!loading && !error && blocks.length === 0 && (
            <p className="text-sm text-mutuo-gray">Aún no has bloqueado a ningún usuario.</p>
          )}

          {!loading && blocks.length > 0 && (
            <ul className="space-y-2">
              {blocks.map((block) => (
                <li key={block.id} className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-sm text-foreground">
                    Usuario {block.blockedId.slice(0, 8)}…
                  </span>
                  <Button variant="outline" size="sm" onClick={() => {
                    fetch("/api/users/block", {
                      method: "DELETE",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ blockedId: block.blockedId }),
                    }).then(() => setBlocks((prev) => prev.filter((b) => b.id !== block.id)));
                  }}>
                    Desbloquear
                  </Button>
                </li>
              ))}
            </ul>
          )}

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
