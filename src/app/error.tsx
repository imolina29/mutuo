// src/app/error.tsx
// Global error boundary — catches unhandled errors in any page.
"use client";

import { Button } from "@/components/ui/button";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] px-4 py-8 text-center">
      <h2 className="text-xl font-semibold text-mutuo-primary mb-2">
        Algo salió mal
      </h2>
      <p className="text-sm text-mutuo-gray mb-4 max-w-md">
        Ocurrió un error inesperado. Intenta de nuevo.
      </p>
      <Button onClick={reset}>Intentar de nuevo</Button>
      <p className="text-xs text-mutuo-gray mt-6 border-t pt-4">
        Si el problema persiste, llama a la{" "}
        <a href="tel:155" className="font-semibold text-mutuo-primary underline">
          Línea 155
        </a>{" "}
        — atención a víctimas de violencia de género.
      </p>
    </div>
  );
}
