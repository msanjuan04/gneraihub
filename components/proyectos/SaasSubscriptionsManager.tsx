"use client";

import { useState } from "react";
import { PlusCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils/dates";
import { formatCurrency } from "@/lib/utils/currency";
import { formatPlanPricing, planMrr, BILLING_TYPE_LABELS } from "@/lib/utils/saas";
import {
  createSaasSubscription,
  updateSaasSubscription,
  deleteSaasSubscription,
} from "@/app/(dashboard)/proyectos/saas-actions";
import type { SaasPlan, SaasSubscription, Client, Currency } from "@/types";

type SubWithRelations = SaasSubscription & { client: Client; plan: SaasPlan | null };

interface Props {
  projectId: string;
  subscriptions: SubWithRelations[];
  plans: SaasPlan[];
  availableClients: Client[];
  currency: Currency;
}

export function SaasSubscriptionsManager({
  projectId,
  subscriptions: initialSubs,
  plans,
  availableClients: initialAvailable,
  currency,
}: Props) {
  const [subs, setSubs] = useState(initialSubs);
  const [available, setAvailable] = useState(initialAvailable);
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    client_id: "",
    plan_id: "",
    start_date: "",
    is_free: false,
  });

  const activeSubs = subs.filter((s) => s.status === "active");
  const activeFreeSubs = activeSubs.filter((s) => s.is_free);
  const mrr = activeSubs.reduce(
    (sum, s) => sum + (!s.is_free && s.plan ? planMrr(s.plan) : 0),
    0
  );

  const handleAdd = async () => {
    if (!form.client_id) return;
    setLoading(true);
    const result = await createSaasSubscription({
      project_id: projectId,
      client_id: form.client_id,
      plan_id: form.plan_id || null,
      is_free: form.is_free,
      status: "active",
      start_date: form.start_date || null,
      end_date: null,
      notes: null,
    });
    setLoading(false);
    if (result.success && result.data) {
      setSubs([...subs, result.data as SubWithRelations]);
      setAvailable(available.filter((c) => c.id !== form.client_id));
      setForm({ client_id: "", plan_id: "", start_date: "", is_free: false });
      setAdding(false);
      toast.success("Cliente suscrito al proyecto");
    } else {
      toast.error("Error al añadir cliente", { description: result.error });
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    const result = await updateSaasSubscription(id, { status: status as any });
    if (result.success) {
      setSubs(subs.map((s) => (s.id === id ? { ...s, status: status as any } : s)));
      toast.success("Estado actualizado");
    } else {
      toast.error("Error al actualizar estado");
    }
  };

  const handlePlanChange = async (id: string, planId: string) => {
    const planIdVal = planId === "none" ? null : planId;
    const result = await updateSaasSubscription(id, { plan_id: planIdVal });
    if (result.success) {
      const newPlan = plans.find((p) => p.id === planId) ?? null;
      setSubs(
        subs.map((s) =>
          s.id === id ? { ...s, plan_id: planIdVal, plan: newPlan } : s
        )
      );
      toast.success("Plan actualizado");
    } else {
      toast.error("Error al cambiar plan");
    }
  };

  const handleFreeChange = async (id: string, mode: "paid" | "free") => {
    const isFree = mode === "free";
    const result = await updateSaasSubscription(id, { is_free: isFree });
    if (result.success) {
      setSubs(subs.map((s) => (s.id === id ? { ...s, is_free: isFree } : s)));
      toast.success(isFree ? "Cliente marcado como gratis" : "Cliente marcado como de pago");
    } else {
      toast.error("Error al actualizar modo de cobro");
    }
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    const result = await deleteSaasSubscription(id);
    setLoading(false);
    if (result.success) {
      const sub = subs.find((s) => s.id === id);
      if (sub) setAvailable([...available, sub.client]);
      setSubs(subs.filter((s) => s.id !== id));
      toast.success("Suscripción eliminada");
    } else {
      toast.error("Error al eliminar suscripción", { description: result.error });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start sm:items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="text-sm font-medium text-foreground">Suscriptores</h3>
          {subs.length > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {activeSubs.length} activo{activeSubs.length !== 1 ? "s" : ""}
              {mrr > 0 && (
                <>
                  {" · "}MRR:{" "}
                  <span className="text-income font-medium">
                    {formatCurrency(mrr, currency)}
                  </span>
                </>
              )}
              {activeFreeSubs.length > 0 && (
                <>{" · "}{activeFreeSubs.length} gratis</>
              )}
            </p>
          )}
        </div>
        {!adding && available.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => setAdding(true)} className="w-full sm:w-auto">
            <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
            Añadir cliente
          </Button>
        )}
      </div>

      {subs.length === 0 && !adding && (
        <div className="py-6 text-center text-sm text-muted-foreground border border-dashed border-border rounded-lg">
          No hay clientes suscritos. Añade el primero.
        </div>
      )}

      {subs.length > 0 && (
        <div className="rounded-lg border border-border overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Cliente</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Plan · Precio</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Inicio</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Cobro</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Estado</th>
                <th className="px-4 py-2.5 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {subs.map((sub) => (
                <tr key={sub.id} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-medium truncate max-w-[220px]">{sub.client.name}</p>
                      {sub.client.company && (
                        <p className="text-xs text-muted-foreground truncate max-w-[220px]">{sub.client.company}</p>
                      )}
                    </div>
                  </td>

                  {/* Plan con precio y tipo de facturación */}
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {plans.length > 0 ? (
                      <div className="space-y-1">
                        <Select
                          value={sub.plan_id ?? "none"}
                          onValueChange={(v) => handlePlanChange(sub.id, v)}
                        >
                          <SelectTrigger className="h-7 text-xs w-full max-w-[14rem]">
                            <SelectValue placeholder="Sin plan" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sin plan</SelectItem>
                            {plans.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                <div className="max-w-[220px]">
                                  <span className="font-medium inline-block truncate max-w-[120px] align-bottom">{p.name}</span>
                                  <span className="text-muted-foreground ml-1.5 text-xs inline-block truncate max-w-[90px] align-bottom">
                                    {BILLING_TYPE_LABELS[p.billing_type]}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {sub.is_free && (
                          <p className="text-xs pl-0.5">
                            <Badge variant="success" className="text-[10px]">
                              Gratis
                            </Badge>
                          </p>
                        )}
                        {!sub.is_free && sub.plan && (
                          <p className="text-xs text-muted-foreground pl-0.5 truncate max-w-[14rem]">
                            {formatPlanPricing(sub.plan)}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {sub.start_date ? formatDate(sub.start_date) : "—"}
                  </td>

                  <td className="px-4 py-3">
                    <Select
                      value={sub.is_free ? "free" : "paid"}
                      onValueChange={(v) => handleFreeChange(sub.id, v as "paid" | "free")}
                    >
                      <SelectTrigger className="h-7 w-24 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paid">Normal</SelectItem>
                        <SelectItem value="free">Gratis</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>

                  <td className="px-4 py-3">
                    <Select
                      value={sub.status}
                      onValueChange={(v) => handleStatusChange(sub.id, v)}
                    >
                      <SelectTrigger className="h-7 w-28 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Activo</SelectItem>
                        <SelectItem value="paused">Pausado</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>

                  <td className="px-4 py-3">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(sub.id)}
                      disabled={loading}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {adding && (
        <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/10">
          <p className="text-sm font-medium">Añadir cliente</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Cliente *</label>
              <Select
                value={form.client_id}
                onValueChange={(v) => setForm({ ...form, client_id: v })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {available.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="inline-block truncate max-w-[220px] align-bottom">{c.name}</span>
                      {c.company && (
                        <span className="text-muted-foreground ml-1.5 text-xs inline-block truncate max-w-[140px] align-bottom">{c.company}</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Plan</label>
              <Select
                value={form.plan_id || "none"}
                onValueChange={(v) => setForm({ ...form, plan_id: v === "none" ? "" : v })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Sin plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin plan</SelectItem>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex flex-col max-w-[220px]">
                        <span className="font-medium truncate">{p.name}</span>
                        <span className="text-xs text-muted-foreground truncate">
                          {BILLING_TYPE_LABELS[p.billing_type]} · {formatPlanPricing(p)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Preview del plan seleccionado */}
              {form.plan_id && !form.is_free && (() => {
                const selectedPlan = plans.find((p) => p.id === form.plan_id);
                return selectedPlan ? (
                  <p className="text-xs text-muted-foreground pl-0.5">
                    {formatPlanPricing(selectedPlan)}
                  </p>
                ) : null;
              })()}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Cobro</label>
              <Select
                value={form.is_free ? "free" : "paid"}
                onValueChange={(v) => setForm({ ...form, is_free: v === "free" })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Normal</SelectItem>
                  <SelectItem value="free">Gratis</SelectItem>
                </SelectContent>
              </Select>
              {form.is_free && (
                <p className="text-xs text-muted-foreground pl-0.5">
                  Este cliente quedará sin cobro recurrente.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Fecha inicio</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={loading || !form.client_id}
              className="w-full sm:w-auto"
            >
              {loading ? "Guardando..." : "Añadir"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setAdding(false);
                setForm({ client_id: "", plan_id: "", start_date: "", is_free: false });
              }}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
