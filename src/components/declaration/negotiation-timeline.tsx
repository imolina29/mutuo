// src/components/declaration/negotiation-timeline.tsx
import { Badge } from "@/components/ui/badge";

interface AuditEntry {
  action: string;
  timestamp: string;
  details: { round?: number; role?: string } | null;
}

interface NegotiationTimelineProps {
  auditLogs: AuditEntry[];
}

const ACTION_LABELS: Record<string, string> = {
  DECLARATION_CREATED: "Declaración creada",
  CHANGES_PROPOSED: "Cambios propuestos",
  DECLARATION_SIGNED_A: "Firmada por persona A",
  DECLARATION_SIGNED_B: "Firmada por persona B",
  DECLARATION_SEALED: "Documento sellado",
  DECLARATION_CANCELLED: "Cancelada",
  DECLARATION_REVOKED: "Revocada",
  DECLARATION_REJECTED: "Rechazada",
  POST_MEETING_REGISTERED: "Registro post-encuentro",
};

export function NegotiationTimeline({ auditLogs }: NegotiationTimelineProps) {
  return (
    <div className="space-y-3">
      <p className="font-medium text-sm">Historial</p>
      <ol className="relative border-l border-gray-200 ml-2">
        {auditLogs.map((log, i) => (
          <li key={i} className="mb-4 ml-4">
            <div className="absolute w-3 h-3 bg-mutuo-primary rounded-full -left-1.5 border border-white" />
            <time className="text-xs text-mutuo-gray">
              {new Date(log.timestamp).toLocaleString("es-CO")}
            </time>
            <p className="text-sm font-medium">
              {ACTION_LABELS[log.action] ?? log.action}
            </p>
            {log.details?.round && (
              <Badge variant="secondary" className="text-xs">
                Ronda {log.details.round}
              </Badge>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
