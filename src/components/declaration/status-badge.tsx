// src/components/declaration/status-badge.tsx
import { Badge } from "@/components/ui/badge";
import type { DeclarationStatus } from "@/types";

const STATUS_CONFIG: Record<
  DeclarationStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  DRAFT: { label: "Borrador", variant: "secondary" },
  PENDING_B: { label: "Pendiente", variant: "outline" },
  NEGOTIATING: { label: "Negociando", variant: "outline" },
  PENDING_A: { label: "Pendiente tu respuesta", variant: "outline" },
  EXPIRED: { label: "Expirada", variant: "secondary" },
  REJECTED: { label: "Rechazada", variant: "destructive" },
  SIGNED: { label: "Firmada", variant: "default" },
  CANCELLED: { label: "Cancelada", variant: "destructive" },
  REVOKED: { label: "Revocada", variant: "destructive" },
  COMPLETED: { label: "Completada", variant: "default" },
};

export function StatusBadge({ status }: { status: DeclarationStatus }) {
  const config = STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
