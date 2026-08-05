// src/app/declarations/[id]/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { StatusBadge } from "@/components/declaration/status-badge";
import { DeclarationPreview } from "@/components/declaration/declaration-preview";
import { NegotiationTimeline } from "@/components/declaration/negotiation-timeline";
import type { ClauseData, DeclarationStatus } from "@/types";

interface DeclarationDetail {
  id: string;
  creatorId: string;
  invitedId: string | null;
  status: DeclarationStatus;
  inviteToken: string;
  meetingDate: string | null;
  meetingPlace: string | null;
  meetingType: string | null;
  sealedHash: string | null;
  sealedAt: string | null;
  creator: { id: string; fullName: string; email: string };
  invited: { id: string; fullName: string; email: string } | null;
  clauses: ClauseData[];
  auditLogs: { action: string; timestamp: string; details: { round?: number; role?: string } | null }[];
}

export default function DeclarationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const [decl, setDecl] = useState<DeclarationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/declarations/${id}`);
      if (res.ok) {
        setDecl(await res.json());
      } else {
        const data = await res.json();
        setLoadError(typeof data.error === "string" ? data.error : "No se pudo cargar la declaración");
      }
    } catch {
      setLoadError("Error de conexión");
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAction(action: "cancel" | "revoke") {
    const confirmMessage =
      action === "cancel"
        ? "¿Seguro que deseas cancelar esta declaración?"
        : "¿Seguro que deseas revocar tu consentimiento? Esta acción es irreversible.";
    if (!window.confirm(confirmMessage)) return;

    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/declarations/${id}/${action}`, { method: "POST" });
      if (res.ok) {
        await load();
      } else {
        const data = await res.json();
        setActionError(typeof data.error === "string" ? data.error : "No se pudo completar la acción");
      }
    } catch {
      setActionError("Error de conexión");
    }
    setActionLoading(false);
  }

  if (loading) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-8 w-full">
        <p className="text-mutuo-gray" role="status" aria-live="polite">
          Cargando...
        </p>
      </main>
    );
  }

  if (!decl) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-8 w-full">
        <Alert variant="destructive">{loadError ?? "Declaración no encontrada"}</Alert>
      </main>
    );
  }

  const isCreator = decl.creatorId === session?.user.id;
  const inviteUrl = typeof window !== "undefined" ? `${window.location.origin}/invite/${decl.inviteToken}` : "";

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 w-full space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-mutuo-primary">Declaración</h1>
        <StatusBadge status={decl.status} />
      </div>

      <DeclarationPreview
        creatorName={decl.creator.fullName}
        invitedName={decl.invited?.fullName ?? null}
        meetingDate={decl.meetingDate}
        meetingPlace={decl.meetingPlace}
        meetingType={decl.meetingType}
        clauses={decl.clauses}
        sealedHash={decl.sealedHash}
        sealedAt={decl.sealedAt}
      />

      {actionError && <Alert variant="destructive">{actionError}</Alert>}

      {(decl.status === "PENDING_B" || decl.status === "NEGOTIATING" || decl.status === "PENDING_A") && (
        <div className="p-4 bg-mutuo-gray-light rounded-lg space-y-2">
          {decl.status === "PENDING_B" && isCreator ? (
            <>
              <p className="text-sm text-mutuo-gray">Esperando respuesta de la otra parte.</p>
              {inviteUrl && (
                <p className="text-xs text-mutuo-gray break-all">Enlace de invitación: {inviteUrl}</p>
              )}
            </>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2">
              <p className="text-sm text-mutuo-gray flex-1">
                Hay cambios pendientes de revisión en esta declaración.
              </p>
              <Button asChild size="sm" className="bg-mutuo-primary hover:bg-mutuo-primary-light">
                <Link href={`/declarations/${id}/sign`}>Revisar y responder</Link>
              </Button>
            </div>
          )}
        </div>
      )}

      {decl.status === "SIGNED" && (
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="flex-1 min-w-[8rem]">
            <Link href={`/declarations/${id}/verify`}>Verificar integridad</Link>
          </Button>
          <Button asChild className="flex-1 min-w-[8rem] bg-mutuo-primary hover:bg-mutuo-primary-light">
            <Link href={`/declarations/${id}/post`}>Registrar post-encuentro</Link>
          </Button>
          <Button
            onClick={() => handleAction("cancel")}
            variant="outline"
            className="flex-1 min-w-[8rem] text-mutuo-danger"
            disabled={actionLoading}
            aria-busy={actionLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => handleAction("revoke")}
            variant="destructive"
            className="flex-1 min-w-[8rem]"
            disabled={actionLoading}
            aria-busy={actionLoading}
          >
            Revocar consentimiento
          </Button>
        </div>
      )}

      {["DRAFT", "PENDING_B", "NEGOTIATING", "PENDING_A"].includes(decl.status) && (
        <Button
          onClick={() => handleAction("cancel")}
          variant="outline"
          className="w-full text-mutuo-danger"
          disabled={actionLoading}
          aria-busy={actionLoading}
        >
          Cancelar declaración
        </Button>
      )}

      {decl.auditLogs && decl.auditLogs.length > 0 && <NegotiationTimeline auditLogs={decl.auditLogs} />}

      <p className="text-xs text-mutuo-gray text-center pt-2">
        Si necesitas ayuda, llama a la{" "}
        <a href="tel:155" className="font-semibold text-mutuo-primary underline">
          Línea 155
        </a>{" "}
        — atención a víctimas de violencia de género.
      </p>
    </main>
  );
}
