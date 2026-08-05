// src/components/layout/header.tsx
"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="border-b bg-white">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-mutuo-primary">
          Mutuo
        </Link>
        <nav className="flex items-center gap-4" aria-label="Navegación principal">
          {session ? (
            <>
              <Link href="/dashboard" className="text-sm text-mutuo-gray hover:text-mutuo-primary">
                Panel
              </Link>
              <Link
                href="/profile"
                className="text-sm text-mutuo-gray hover:text-mutuo-primary"
                aria-label="Mi perfil"
              >
                {session.user.fullName || session.user.email}
              </Link>
              <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
                Salir
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="outline" size="sm">
                <Link href="/auth/login">Ingresar</Link>
              </Button>
              <Button asChild size="sm" className="bg-mutuo-primary hover:bg-mutuo-primary-light">
                <Link href="/auth/register">Registrarse</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
