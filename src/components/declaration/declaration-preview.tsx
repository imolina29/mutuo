// src/components/declaration/declaration-preview.tsx
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { ClauseData } from "@/types";

interface DeclarationPreviewProps {
  creatorName: string;
  invitedName: string | null;
  meetingDate: string | null;
  meetingPlace: string | null;
  meetingType: string | null;
  clauses: ClauseData[];
  sealedHash: string | null;
  sealedAt: string | null;
}

export function DeclarationPreview({
  creatorName,
  invitedName,
  meetingDate,
  meetingPlace,
  meetingType,
  clauses,
  sealedHash,
  sealedAt,
}: DeclarationPreviewProps) {
  return (
    <div className="space-y-4 p-6 border rounded-lg bg-white">
      <h2 className="text-xl font-bold text-[#1e3a5f] text-center">
        DECLARACIÓN DE INTENCIÓN MUTUA
      </h2>

      <p className="text-sm text-center text-[#6b7280]">
        Documento generado por la plataforma Mutuo — Colombia
      </p>

      <Separator />

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="font-medium text-[#6b7280]">Parte A</p>
          <p className="font-semibold">{creatorName}</p>
        </div>
        <div>
          <p className="font-medium text-[#6b7280]">Parte B</p>
          <p className="font-semibold">{invitedName ?? "Pendiente"}</p>
        </div>
        {meetingDate && (
          <div>
            <p className="font-medium text-[#6b7280]">Fecha del encuentro</p>
            <p>
              {new Date(meetingDate).toLocaleDateString("es-CO", {
                dateStyle: "long",
              })}
            </p>
          </div>
        )}
        {meetingPlace && (
          <div>
            <p className="font-medium text-[#6b7280]">Lugar</p>
            <p>{meetingPlace}</p>
          </div>
        )}
        {meetingType && (
          <div>
            <p className="font-medium text-[#6b7280]">Tipo de encuentro</p>
            <p>{meetingType}</p>
          </div>
        )}
      </div>

      <Separator />

      <div>
        <p className="font-medium mb-3">Cláusulas acordadas:</p>
        <ol className="space-y-3 list-decimal list-inside">
          {clauses.map((clause) => (
            <li key={clause.id} className="text-sm">
              <Badge
                variant={
                  clause.type === "VOLUNTARY_MEETING" ? "default" : "secondary"
                }
                className="mr-2"
              >
                {clause.type === "VOLUNTARY_MEETING" ? "Obligatoria" : "Opcional"}
              </Badge>
              {clause.text}
            </li>
          ))}
        </ol>
      </div>

      {sealedHash && (
        <>
          <Separator />
          <div className="bg-gray-50 p-3 rounded text-xs font-mono break-all">
            <p>
              <strong>Hash SHA-256:</strong> {sealedHash}
            </p>
            {sealedAt && (
              <p>
                <strong>Sellado:</strong>{" "}
                {new Date(sealedAt).toLocaleString("es-CO")}
              </p>
            )}
          </div>
        </>
      )}

      <Separator />

      <p className="text-xs text-[#6b7280] text-center">
        Esta declaración es una manifestación de voluntad de encuentro, no una
        autorización de actividad sexual. El consentimiento es revocable en
        cualquier momento.{" "}
        <a
          href="tel:155"
          className="font-semibold text-[#1e3a5f] underline"
          aria-label="Línea de atención 155"
        >
          Línea 155
        </a>{" "}
        — atención a víctimas de violencia de género.
      </p>
    </div>
  );
}
