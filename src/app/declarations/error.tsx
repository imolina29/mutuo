// src/app/declarations/error.tsx
"use client";

import { Button } from "@/components/ui/button";

export default function DeclarationError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] px-4 py-8 text-center">
      <h2 className="text-xl font-semibold text-mutuo-primary mb-2">
        Error al cargar la declaración
      </h2>
      <p className="text-sm text-mutuo-gray mb-4 max-w-md">
        No se pudo cargar la información. Verifica tu conexión e intenta de nuevo.
      </p>
      <Button onClick={reset}>Intentar de nuevo</Button>
    </div>
  );
}
