// src/app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DeclarationCard } from "@/components/declaration/declaration-card";
import type { DeclarationStatus, NotificationType } from "@/types";

interface DashboardDeclaration {
  id: string;
  status: DeclarationStatus;
  creatorId: string;
  creator: { fullName: string };
  invited: { fullName: string } | null;
  meetingDate: string | null;
  meetingPlace: string | null;
  meetingType: string | null;
}

interface DashboardNotification {
  id: string;
  type: NotificationType;
  declarationId: string | null;
  sentAt: string;
  readAt: string | null;
}

const NOTIFICATION_LABELS: Record<NotificationType, string> = {
  INVITATION_RECEIVED: "Recibiste una invitación",
  INVITATION_ACCEPTED: "Tu invitación fue aceptada",
  INVITATION_REJECTED: "Tu invitación fue rechazada",
  CHANGES_PROPOSED: "Se propusieron cambios en una declaración",
  CHANGES_ACCEPTED: "Se aceptaron cambios en una declaración",
  CHANGES_REJECTED: "Se rechazaron cambios en una declaración",
  DECLARATION_SIGNED: "Una declaración fue firmada",
  DECLARATION_CANCELLED: "Una declaración fue cancelada",
  DECLARATION_REVOKED: "Se revocó el consentimiento de una declaración",
  POST_MEETING_REMINDER: "Recordatorio de registro post-encuentro",
};

const ACTIVE_STATUSES: DeclarationStatus[] = ["DRAFT", "PENDING_B", "NEGOTIATING", "PENDING_A", "SIGNED"];

export default function DashboardPage() {
  const { data: session } = useSession();
  const [declarations, setDeclarations] = useState<DashboardDeclaration[]>([]);
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/declarations").then((res) => (res.ok ? res.json() : [])),
      fetch("/api/notifications").then((res) => (res.ok ? res.json() : [])),
    ]).then(([decls, notifs]) => {
      setDeclarations(decls);
      setNotifications(notifs);
      setLoading(false);
    });
  }, []);

  async function markNotificationRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
    await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
  }

  const active = declarations.filter((d) => ACTIVE_STATUSES.includes(d.status));
  const history = declarations.filter((d) => !ACTIVE_STATUSES.includes(d.status));
  const unreadNotifications = notifications.filter((n) => !n.readAt);

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 w-full">
      <div className="flex items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold text-mutuo-primary">Mis declaraciones</h1>
        <Button asChild className="bg-mutuo-primary hover:bg-mutuo-primary-light">
          <Link href="/declarations/new">Crear nueva</Link>
        </Button>
      </div>

      {session && !session.user.verified && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg" role="status">
          <p className="text-sm">
            Debes{" "}
            <Link href="/identity/verify" className="text-mutuo-primary underline font-medium">
              verificar tu identidad
            </Link>{" "}
            antes de firmar declaraciones.
          </p>
        </div>
      )}

      {unreadNotifications.length > 0 && (
        <section className="mb-6" aria-labelledby="notifications-heading">
          <h2 id="notifications-heading" className="text-lg font-medium mb-3">
            Notificaciones ({unreadNotifications.length})
          </h2>
          <div className="space-y-2">
            {unreadNotifications.map((n) => (
              <Card key={n.id}>
                <CardContent className="pt-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{NOTIFICATION_LABELS[n.type] ?? n.type}</p>
                    <p className="text-xs text-mutuo-gray">
                      {new Date(n.sentAt).toLocaleString("es-CO")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {n.declarationId && (
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/declarations/${n.declarationId}`}>Ver</Link>
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => markNotificationRead(n.id)}>
                      Marcar como leída
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {loading ? (
        <p className="text-mutuo-gray" role="status" aria-live="polite">
          Cargando...
        </p>
      ) : declarations.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-mutuo-gray mb-4">No tienes declaraciones aún.</p>
          <Button asChild className="bg-mutuo-primary hover:bg-mutuo-primary-light">
            <Link href="/declarations/new">Crear tu primera declaración</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <section aria-labelledby="active-heading">
              <h2 id="active-heading" className="text-lg font-medium mb-3">
                Activas
              </h2>
              <div className="space-y-3">
                {active.map((d) => (
                  <DeclarationCard
                    key={d.id}
                    id={d.id}
                    status={d.status}
                    creatorName={d.creator.fullName}
                    invitedName={d.invited?.fullName ?? null}
                    meetingDate={d.meetingDate}
                    meetingPlace={d.meetingPlace}
                    meetingType={d.meetingType}
                    isCreator={d.creatorId === session?.user.id}
                  />
                ))}
              </div>
            </section>
          )}
          {history.length > 0 && (
            <section aria-labelledby="history-heading">
              <h2 id="history-heading" className="text-lg font-medium mb-3">
                Historial
              </h2>
              <div className="space-y-3">
                {history.map((d) => (
                  <DeclarationCard
                    key={d.id}
                    id={d.id}
                    status={d.status}
                    creatorName={d.creator.fullName}
                    invitedName={d.invited?.fullName ?? null}
                    meetingDate={d.meetingDate}
                    meetingPlace={d.meetingPlace}
                    meetingType={d.meetingType}
                    isCreator={d.creatorId === session?.user.id}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
