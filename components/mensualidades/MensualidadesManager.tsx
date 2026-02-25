"use client";

import { useState } from "react";
import { PlusCircle, Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/dates";
import {
  BILLING_TYPE_LABELS,
  BILLING_TYPE_DESCRIPTIONS,
  feeLabel,
  feeSuffix,
  formatPlanPricing,
  planMrr,
} from "@/lib/utils/saas";
import {
  createMensualidad,
  updateMensualidad,
  deleteMensualidad,
} from "@/app/(dashboard)/mensualidades/actions";
import type { Mensualidad, MensualidadInsert, SaasBillingType, Currency, Client, Project } from "@/types";

// ── Tipos ────────────────────────────────────────────────────

type MensualidadWithRelations = Mensualidad & {
  client?: Client;
  project?: { id: string; name: string } | null;
};

type FormData = {
  name: string;
  billing_type: SaasBillingType;
  fee: string;
  setup_fee: string;
  currency: Currency;
  client_id: string;
  project_id: string;
  start_date: string;
  notes: string;
};

// ── Props ─────────────────────────────────────────────────────

interface Props {
  mensualidades: MensualidadWithRelations[];
  // Contexto proyecto: el project_id ya está fijado, se elige cliente
  projectId?: string;
  availableClients?: Client[]; // clientes disponibles (para contexto proyecto)
  // Contexto cliente: el client_id ya está fijado, proyecto es opcional
  clientId?: string;
  availableProjects?: Project[]; // proyectos para vincular opcionalmente
  currency: Currency;
}

// ── Helpers ───────────────────────────────────────────────────

function hasSetupFee(bt: SaasBillingType) {
  return bt === "setup_monthly" || bt === "setup_annual";
}

const emptyForm = (currency: Currency, clientId?: string, projectId?: string): FormData => ({
  name: "",
  billing_type: "monthly",
  fee: "",
  setup_fee: "",
  currency,
  client_id: clientId ?? "",
  project_id: projectId ?? "",
  start_date: "",
  notes: "",
});

const billingColors: Record<SaasBillingType, string> = {
  monthly: "text-blue-600 bg-blue-50 border-blue-200",
  annual: "text-purple-600 bg-purple-50 border-purple-200",
  setup_monthly: "text-amber-600 bg-amber-50 border-amber-200",
  setup_annual: "text-orange-600 bg-orange-50 border-orange-200",
};

// ── Componente principal ──────────────────────────────────────

export function MensualidadesManager({
  mensualidades: initialData,
  projectId,
  availableClients = [],
  clientId,
  availableProjects = [],
  currency,
}: Props) {
  const [items, setItems] = useState(initialData);
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<FormData>(emptyForm(currency, clientId, projectId));
  const [editForm, setEditForm] = useState<FormData | null>(null);

  // MRR de activos
  const activeMrr = items
    .filter((m) => m.status === "active")
    .reduce((sum, m) => sum + planMrr(m as any), 0);

  const activeCount = items.filter((m) => m.status === "active").length;

  // ── Acciones ─────────────────────────────────────────────

  const handleAdd = async () => {
    if (!form.name || !form.fee || (!form.client_id && !clientId)) return;
    setLoading(true);

    const payload: MensualidadInsert = {
      client_id: clientId ?? form.client_id,
      project_id: projectId ?? (form.project_id || null),
      name: form.name,
      billing_type: form.billing_type,
      fee: parseFloat(form.fee),
      setup_fee: hasSetupFee(form.billing_type) && form.setup_fee
        ? parseFloat(form.setup_fee)
        : null,
      currency: form.currency,
      status: "active",
      start_date: form.start_date || null,
      end_date: null,
      notes: form.notes || null,
    };

    const result = await createMensualidad(payload);
    setLoading(false);

    if (result.success && result.data) {
      setItems([...items, result.data as MensualidadWithRelations]);
      setForm(emptyForm(currency, clientId, projectId));
      setAdding(false);
      toast.success("Mensualidad creada");
    } else {
      toast.error("Error al crear mensualidad", { description: result.error });
    }
  };

  const handleSaveEdit = async (id: string) => {
    if (!editForm) return;
    setLoading(true);

    const result = await updateMensualidad(id, {
      name: editForm.name,
      billing_type: editForm.billing_type,
      fee: parseFloat(editForm.fee),
      setup_fee: hasSetupFee(editForm.billing_type) && editForm.setup_fee
        ? parseFloat(editForm.setup_fee)
        : null,
      currency: editForm.currency,
      project_id: projectId !== undefined ? projectId : (editForm.project_id || null),
      start_date: editForm.start_date || null,
      notes: editForm.notes || null,
    });

    setLoading(false);

    if (result.success) {
      setItems(items.map((m) =>
        m.id === id
          ? {
              ...m,
              name: editForm.name,
              billing_type: editForm.billing_type,
              fee: parseFloat(editForm.fee),
              setup_fee: hasSetupFee(editForm.billing_type) && editForm.setup_fee
                ? parseFloat(editForm.setup_fee)
                : null,
              currency: editForm.currency,
              start_date: editForm.start_date || null,
              notes: editForm.notes || null,
            }
          : m
      ));
      setEditId(null);
      setEditForm(null);
      toast.success("Mensualidad actualizada");
    } else {
      toast.error("Error al guardar", { description: result.error });
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    const result = await updateMensualidad(id, { status: status as any });
    if (result.success) {
      setItems(items.map((m) => m.id === id ? { ...m, status: status as any } : m));
      toast.success("Estado actualizado");
    } else {
      toast.error("Error al actualizar estado");
    }
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    const result = await deleteMensualidad(id);
    setLoading(false);
    if (result.success) {
      setItems(items.filter((m) => m.id !== id));
      toast.success("Mensualidad eliminada");
    } else {
      toast.error("Error al eliminar", { description: result.error });
    }
  };

  // ── Render ────────────────────────────────────────────────

  const canAdd =
    (projectId && availableClients.length > 0) ||
    (clientId);

  return (
    <div className="space-y-3">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">Mensualidades</h3>
          {items.length > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {activeCount} activa{activeCount !== 1 ? "s" : ""}
              {activeMrr > 0 && (
                <> · MRR: <span className="text-income font-medium">{formatCurrency(activeMrr, currency)}</span></>
              )}
            </p>
          )}
        </div>
        {!adding && (canAdd || clientId) && (
          <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
            <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
            Nueva mensualidad
          </Button>
        )}
      </div>

      {/* Lista vacía */}
      {items.length === 0 && !adding && (
        <div className="py-8 text-center text-sm text-muted-foreground border border-dashed border-border rounded-lg">
          <p>No hay mensualidades.</p>
          <p className="text-xs mt-1 text-muted-foreground/70">
            Añade una para gestionar la facturación recurrente.
          </p>
        </div>
      )}

      {/* Tabla de mensualidades */}
      {items.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {/* Mostrar cliente si estamos en contexto proyecto */}
                {projectId && (
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Cliente</th>
                )}
                {/* Mostrar proyecto si estamos en contexto cliente */}
                {clientId && (
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Proyecto</th>
                )}
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Concepto</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Tipo</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Importe</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Estado</th>
                <th className="px-4 py-2.5 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((m) => (
                <tr key={m.id} className="border-b border-border/50 last:border-0">
                  {editId === m.id && editForm ? (
                    /* ── Fila edición ── */
                    <td colSpan={projectId ? 6 : clientId ? 6 : 5} className="px-4 py-3">
                      <MensualidadForm
                        form={editForm}
                        onChange={setEditForm}
                        onConfirm={() => handleSaveEdit(m.id)}
                        onCancel={() => { setEditId(null); setEditForm(null); }}
                        loading={loading}
                        mode="edit"
                        showProjectSelector={!!clientId}
                        availableProjects={availableProjects}
                      />
                    </td>
                  ) : (
                    /* ── Fila lectura ── */
                    <>
                      {projectId && (
                        <td className="px-4 py-3">
                          <p className="font-medium">{m.client?.name ?? "—"}</p>
                          {m.client?.company && (
                            <p className="text-xs text-muted-foreground">{m.client.company}</p>
                          )}
                        </td>
                      )}
                      {clientId && (
                        <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground text-xs">
                          {m.project?.name ?? <span className="italic">Sin proyecto</span>}
                        </td>
                      )}
                      <td className="px-4 py-3 font-medium">{m.name}</td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${billingColors[m.billing_type]}`}>
                          {BILLING_TYPE_LABELS[m.billing_type]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {m.setup_fee != null && m.setup_fee > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(m.setup_fee, m.currency as Currency)} setup
                          </p>
                        )}
                        <p className="font-semibold text-income">
                          {formatCurrency(m.fee, m.currency as Currency)}
                          <span className="text-xs font-normal text-muted-foreground ml-0.5">
                            {feeSuffix(m.billing_type)}
                          </span>
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          value={m.status}
                          onValueChange={(v) => handleStatusChange(m.id, v)}
                        >
                          <SelectTrigger className="h-7 w-28 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Activa</SelectItem>
                            <SelectItem value="paused">Pausada</SelectItem>
                            <SelectItem value="cancelled">Cancelada</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => {
                              setEditId(m.id);
                              setEditForm({
                                name: m.name,
                                billing_type: m.billing_type,
                                fee: String(m.fee),
                                setup_fee: String(m.setup_fee ?? ""),
                                currency: m.currency as Currency,
                                client_id: m.client_id,
                                project_id: m.project_id ?? "",
                                start_date: m.start_date ?? "",
                                notes: m.notes ?? "",
                              });
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(m.id)}
                            disabled={loading}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Formulario de nueva mensualidad */}
      {adding && (
        <div className="border border-border rounded-lg p-4 space-y-4 bg-muted/10">
          <p className="text-sm font-medium">Nueva mensualidad</p>

          {/* Selector de cliente — solo si estamos en contexto proyecto */}
          {projectId && (
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Cliente *</label>
              <Select
                value={form.client_id}
                onValueChange={(v) => setForm({ ...form, client_id: v })}
              >
                <SelectTrigger className="h-8 max-w-xs">
                  <SelectValue placeholder="Seleccionar cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {availableClients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                      {c.company && (
                        <span className="text-muted-foreground ml-1.5 text-xs">{c.company}</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <MensualidadForm
            form={form}
            onChange={setForm}
            onConfirm={handleAdd}
            onCancel={() => { setAdding(false); setForm(emptyForm(currency, clientId, projectId)); }}
            loading={loading}
            mode="add"
            showProjectSelector={!!clientId}
            availableProjects={availableProjects}
            requireClient={!!projectId && !form.client_id}
          />
        </div>
      )}
    </div>
  );
}

// ── Sub-componente: campos del formulario ─────────────────────

interface FormProps {
  form: FormData;
  onChange: (f: FormData) => void;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
  mode: "add" | "edit";
  showProjectSelector: boolean;
  availableProjects?: Project[];
  requireClient?: boolean;
}

function MensualidadForm({
  form,
  onChange,
  onConfirm,
  onCancel,
  loading,
  mode,
  showProjectSelector,
  availableProjects = [],
  requireClient = false,
}: FormProps) {
  const showSetup = hasSetupFee(form.billing_type);

  const canSave = form.name && form.fee && !requireClient;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Nombre / concepto */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Concepto *</label>
          <Input
            value={form.name}
            onChange={(e) => onChange({ ...form, name: e.target.value })}
            placeholder="Ej. Mantenimiento web, Plan Pro, Retainer SEO"
            className="h-8"
          />
        </div>

        {/* Tipo de pago */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Tipo de pago *</label>
          <Select
            value={form.billing_type}
            onValueChange={(v) =>
              onChange({
                ...form,
                billing_type: v as SaasBillingType,
                setup_fee: hasSetupFee(v as SaasBillingType) ? form.setup_fee : "",
              })
            }
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["monthly", "annual", "setup_monthly", "setup_annual"] as SaasBillingType[]).map(
                (bt) => (
                  <SelectItem key={bt} value={bt}>
                    <span className="font-medium">{BILLING_TYPE_LABELS[bt]}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      — {BILLING_TYPE_DESCRIPTIONS[bt]}
                    </span>
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Setup fee */}
        {showSetup && (
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">
              Setup fee <span className="text-muted-foreground/60">(pago único inicial)</span>
            </label>
            <Input
              type="number"
              value={form.setup_fee}
              onChange={(e) => onChange({ ...form, setup_fee: e.target.value })}
              placeholder="0.00"
              className="h-8"
              min="0"
              step="0.01"
            />
          </div>
        )}

        {/* Cuota recurrente + moneda */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">{feeLabel(form.billing_type)} *</label>
          <div className="flex gap-2">
            <Input
              type="number"
              value={form.fee}
              onChange={(e) => onChange({ ...form, fee: e.target.value })}
              placeholder="0.00"
              className="h-8 flex-1"
              min="0"
              step="0.01"
            />
            <Select
              value={form.currency}
              onValueChange={(v) => onChange({ ...form, currency: v as Currency })}
            >
              <SelectTrigger className="h-8 w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Proyecto (solo en contexto cliente) */}
        {showProjectSelector && (
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">
              Proyecto <span className="text-muted-foreground/60">(opcional)</span>
            </label>
            <Select
              value={form.project_id || "none"}
              onValueChange={(v) => onChange({ ...form, project_id: v === "none" ? "" : v })}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Sin proyecto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin proyecto</SelectItem>
                {availableProjects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Fecha de inicio */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Fecha inicio</label>
          <input
            type="date"
            value={form.start_date}
            onChange={(e) => onChange({ ...form, start_date: e.target.value })}
            className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      {/* Resumen de precios */}
      {form.fee && parseFloat(form.fee) > 0 && (
        <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Resumen: </span>
          {showSetup && form.setup_fee && parseFloat(form.setup_fee) > 0 && (
            <>{formatCurrency(parseFloat(form.setup_fee), form.currency)} setup + </>
          )}
          {formatCurrency(parseFloat(form.fee), form.currency)}
          {feeSuffix(form.billing_type)}
          {(form.billing_type === "annual" || form.billing_type === "setup_annual") && (
            <span className="ml-2 text-muted-foreground/70">
              ≈ {formatCurrency(parseFloat(form.fee) / 12, form.currency)}/mes MRR
            </span>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <Button size="sm" onClick={onConfirm} disabled={loading || !canSave}>
          {loading ? "Guardando..." : mode === "add" ? "Crear mensualidad" : "Guardar cambios"}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
