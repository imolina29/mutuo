// src/app/admin/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Metrics {
  generatedAt: string;
  users: { total: number; verified: number; verificationRate: number };
  declarations: {
    total: number;
    active: number;
    completed: number;
    byStatus: Record<string, number>;
  };
  funnel: { created: number; accepted: number; signed: number; completed: number };
  notifications: { total: number; unread: number };
  activity: {
    last7Days: { day: string; count: number }[];
    recentActions: { action: string; timestamp: string; hasDeclaration: boolean }[];
  };
  alerts: { reportsAndBlocks24h: number };
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Borrador",
  PENDING_B: "Esperando persona B",
  NEGOTIATING: "Negociando",
  PENDING_A: "Esperando persona A",
  SIGNED: "Firmada",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
  REVOKED: "Revocada",
  REJECTED: "Rechazada",
  EXPIRED: "Expirada",
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-200 text-gray-800",
  PENDING_B: "bg-yellow-100 text-yellow-800",
  NEGOTIATING: "bg-blue-100 text-blue-800",
  PENDING_A: "bg-orange-100 text-orange-800",
  SIGNED: "bg-green-100 text-green-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-red-100 text-red-800",
  REVOKED: "bg-red-100 text-red-800",
  REJECTED: "bg-red-100 text-red-800",
  EXPIRED: "bg-gray-100 text-gray-600",
};

const ACTION_LABELS: Record<string, string> = {
  DECLARATION_CREATED: "Declaración creada",
  DECLARATION_SIGNED_A: "Firma persona A",
  DECLARATION_SIGNED_B: "Firma persona B",
  DECLARATION_SEALED: "Documento sellado",
  DECLARATION_CANCELLED: "Declaración cancelada",
  DECLARATION_REVOKED: "Consentimiento revocado",
  CHANGES_PROPOSED: "Cambios propuestos",
  IDENTITY_VERIFIED: "Identidad verificada",
  POST_MEETING_REGISTERED: "Post-encuentro registrado",
  ACCOUNT_DELETED: "Cuenta eliminada",
  USER_BLOCKED: "Usuario bloqueado",
  USER_REPORTED: "Usuario reportado",
  USER_UNBLOCKED: "Usuario desbloqueado",
};

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

export default function AdminPage() {
  useSession(); // Ensures auth redirect
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  function fetchMetrics() {
    setLoading(true);
    setError(null);
    fetch("/api/admin/metrics")
      .then((res) => {
        if (res.status === 403) throw new Error("NO_ACCESS");
        if (!res.ok) throw new Error("FETCH_ERROR");
        return res.json();
      })
      .then((data) => {
        setMetrics(data);
        setLastRefresh(new Date());
      })
      .catch((err) => {
        if (err.message === "NO_ACCESS") {
          setError("No tienes acceso al panel de administración.");
        } else {
          setError("Error al cargar métricas. Verifica tu conexión.");
        }
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchMetrics();
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchMetrics, 60_000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !metrics) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-8">
        <p className="text-mutuo-gray" role="status">Cargando panel de monitoreo...</p>
      </main>
    );
  }

  if (error && !metrics) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-center">
          <p className="text-red-700">{error}</p>
          <Button variant="outline" className="mt-3" onClick={fetchMetrics}>
            Reintentar
          </Button>
        </div>
      </main>
    );
  }

  if (!metrics) return null;

  const maxDaily = Math.max(...metrics.activity.last7Days.map((d) => d.count), 1);

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-mutuo-primary">Panel de Monitoreo — Piloto</h1>
          <p className="text-sm text-mutuo-gray mt-1">
            Última actualización: {lastRefresh?.toLocaleTimeString("es-CO") ?? "—"}
            {loading && " · Actualizando..."}
          </p>
        </div>
        <Button onClick={fetchMetrics} variant="outline" size="sm" disabled={loading}>
          ↻ Refrescar
        </Button>
      </div>

      {/* Alerts */}
      {metrics.alerts.reportsAndBlocks24h > 0 && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-300 rounded-lg" role="alert">
          <p className="text-sm font-medium text-amber-800">
            ⚠️ {metrics.alerts.reportsAndBlocks24h} reportes/bloqueos en las últimas 24 horas
          </p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-mutuo-primary">{metrics.users.total}</p>
            <p className="text-xs text-mutuo-gray mt-1">Usuarios registrados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-green-600">{metrics.users.verified}</p>
            <p className="text-xs text-mutuo-gray mt-1">Verificados ({metrics.users.verificationRate}%)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-mutuo-primary">{metrics.declarations.total}</p>
            <p className="text-xs text-mutuo-gray mt-1">Declaraciones totales</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-emerald-600">{metrics.declarations.completed}</p>
            <p className="text-xs text-mutuo-gray mt-1">Completadas</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Funnel */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Embudo de Conversión</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: "Creadas", value: metrics.funnel.created, color: "bg-blue-500" },
                { label: "Aceptadas", value: metrics.funnel.accepted, color: "bg-yellow-500" },
                { label: "Firmadas", value: metrics.funnel.signed, color: "bg-green-500" },
                { label: "Completadas", value: metrics.funnel.completed, color: "bg-emerald-500" },
              ].map((step) => {
                const pct = metrics.funnel.created > 0 ? (step.value / metrics.funnel.created) * 100 : 0;
                return (
                  <div key={step.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{step.label}</span>
                      <span className="font-medium">{step.value} ({Math.round(pct)}%)</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${step.color} rounded-full transition-all`}
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Declarations by Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Declaraciones por Estado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(metrics.declarations.byStatus)
                .sort(([, a], [, b]) => b - a)
                .map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${STATUS_COLORS[status] ?? "bg-gray-100"}`}>
                      {STATUS_LABELS[status] ?? status}
                    </span>
                    <span className="text-sm font-medium tabular-nums">{count}</span>
                  </div>
                ))}
              {Object.keys(metrics.declarations.byStatus).length === 0 && (
                <p className="text-sm text-mutuo-gray text-center py-4">Sin declaraciones aún</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Daily Activity Chart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Actividad — Últimos 7 Días</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.activity.last7Days.length === 0 ? (
              <p className="text-sm text-mutuo-gray text-center py-4">Sin actividad registrada</p>
            ) : (
              <div className="flex items-end gap-2 h-32">
                {metrics.activity.last7Days.map((day) => (
                  <div key={day.day} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-medium tabular-nums">{day.count}</span>
                    <div
                      className="w-full bg-mutuo-primary/80 rounded-t min-h-[4px] transition-all"
                      style={{ height: `${(day.count / maxDaily) * 100}%` }}
                    />
                    <span className="text-[10px] text-mutuo-gray tabular-nums">
                      {day.day.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Notificaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-mutuo-primary">{metrics.notifications.total}</p>
                <p className="text-xs text-mutuo-gray">Enviadas</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">{metrics.notifications.unread}</p>
                <p className="text-xs text-mutuo-gray">Sin leer</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Actividad Reciente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {metrics.activity.recentActions.map((action, i) => (
              <div
                key={`${action.timestamp}-${i}`}
                className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">
                    {ACTION_LABELS[action.action] ?? action.action}
                  </span>
                  {action.hasDeclaration && (
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                      declaración
                    </span>
                  )}
                </div>
                <span className="text-xs text-mutuo-gray whitespace-nowrap ml-3">
                  {timeAgo(action.timestamp)}
                </span>
              </div>
            ))}
            {metrics.activity.recentActions.length === 0 && (
              <p className="text-sm text-mutuo-gray text-center py-4">Sin actividad reciente</p>
            )}
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-mutuo-gray text-center mt-6">
        Panel de monitoreo para prueba piloto · Auto-refresca cada 60s · Sin datos personales
      </p>
    </main>
  );
}
