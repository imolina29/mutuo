// src/components/identity/cedula-upload.tsx
"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface CedulaUploadProps {
  side: "front" | "back";
  onFileSelected: (file: File) => void;
}

export function CedulaUpload({ side, onFileSelected }: CedulaUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    onFileSelected(file);
    setPreview(URL.createObjectURL(file));
  }

  const label = side === "front" ? "Cédula — Lado frontal" : "Cédula — Lado posterior";

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        className="hidden"
        aria-label={label}
      />
      {preview ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt={label} className="w-full rounded-lg border" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => inputRef.current?.click()}
          >
            Cambiar foto
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full h-32 border-dashed"
          onClick={() => inputRef.current?.click()}
        >
          Tomar foto o seleccionar archivo
        </Button>
      )}
    </div>
  );
}
