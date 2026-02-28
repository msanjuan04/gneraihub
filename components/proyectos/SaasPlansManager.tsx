"use client";

import { useState } from "react";
import { PlusCircle, Pencil, Trash2, Check, X, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils/currency";
import {
  BILLING_TYPE_LABELS,
  BILLING_TYPE_DESCRIPTIONS,
  feeLabel,
  feeSuffix,
  formatPlanPricing,
  planMrr,
} from "@/lib/utils/saas";
import {
  createSaasPlan,
  updateSaasPlan,
  deleteSaasPlan,
} from "@/app/(dashboard)/proyectos/saas-actions";
import type { SaasPlan, SaasBillingType, Currency } from "@/types";

interface Props {
  projectId: string;
  plans: SaasPlan[];
  currency: Currency;
}

type PlanForm = {
  name: string;
  billing_type: SaasBillingType;
  fee: string;
  setup_fee: string;
  currency: Currency;
  description: string;
};

const emptyForm = (currency: Currency): PlanForm => ({
  name: "",
  billing_type: "monthly",
  fee: "",
  setup_fee: "",
  currency,
  description: "",
});

const billingBadgeVariant: Record<SaasBillingType, string> = {
  monthly: "bg-blue-500/10 text-blue-600 border-blue-200",
  annual: "bg-purple-500/10 text-purple-600 border-purple-200",
  setup_monthly: "bg-amber-500/10 text-amber-600 border-amber-200",
  setup_annual: "bg-orange-500/10 text-orange-600 border-orange-200",
};

function hasSetupFee(bt: SaasBillingType) {
  return bt === "setup_monthly" || bt === "setup_annual";
}

function getBaseBillingType(bt: SaasBillingType): SaasBillingType {
  return bt === "annual" || bt === "setup_annual" ? "annual" : "monthly";
}

function parseAmount(value: string): number {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return amount;
}

export function SaasPlansManager({ projectId, plans: initialPlans, currency }: Props) {
  const [plans, setPlans] = useState(initialPlans);
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<PlanForm>(emptyForm(currency));
  const [editForm, setEditForm] = useState<PlanForm | null>(null);

  const handleAdd = async () => {
    const fee = parseAmount(form.fee);
    const setupFee = parseAmount(form.setup_fee);
    if (!form.name || (fee <= 0 && setupFee <= 0)) return;
    setLoading(true);
    const result = await createSaasPlan({
      project_id: projectId,
      name: form.name,
      billing_type: getBaseBillingType(form.billing_type),
      fee,
      setup_fee: setupFee > 0 ? setupFee : null,
      currency: form.currency,
      description: form.description || null,
    });
    setLoading(false);
    if (result.success && result.data) {
      setPlans([...plans, result.data]);
      setForm(emptyForm(currency));
      setAdding(false);
      toast.success("Plan creado");
    } else {
      toast.error("Error al crear el plan", { description: result.error });
    }
  };

  const handleEdit = async (id: string) => {
    if (!editForm) return;
    const fee = parseAmount(editForm.fee);
    const setupFee = parseAmount(editForm.setup_fee);
    if (!editForm.name || (fee <= 0 && setupFee <= 0)) return;
    setLoading(true);
    const result = await updateSaasPlan(id, {
      name: editForm.name,
      billing_type: getBaseBillingType(editForm.billing_type),
      fee,
      setup_fee: setupFee > 0 ? setupFee : null,
      currency: editForm.currency,
      description: editForm.description || null,
    });
    setLoading(false);
    if (result.success) {
      setPlans(
        plans.map((p) =>
          p.id === id
            ? {
                ...p,
                name: editForm.name,
                billing_type: setupFee > 0
                  ? getBaseBillingType(editForm.billing_type) === "annual" ? "setup_annual" : "setup_monthly"
                  : getBaseBillingType(editForm.billing_type),
                fee,
                setup_fee: setupFee > 0 ? setupFee : null,
                currency: editForm.currency,
                description: editForm.description || null,
              }
            : p
        )
      );
      setEditId(null);
      setEditForm(null);
      toast.success("Plan actualizado");
    } else {
      toast.error("Error al actualizar", { description: result.error });
    }
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    const result = await deleteSaasPlan(id);
    setLoading(false);
    if (result.success) {
      setPlans(plans.filter((p) => p.id !== id));
      toast.success("Plan eliminado");
    } else {
      toast.error("Error al eliminar", { description: result.error });
    }
  };

  const totalMrr = plans.reduce((sum, p) => sum + planMrr(p), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-start sm:items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="text-sm font-medium text-foreground">Planes de suscripción</h3>
          {plans.length > 0 && totalMrr > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              MRR potencial: <span className="text-income font-medium">{formatCurrency(totalMrr, currency)}</span>
            </p>
          )}
        </div>
        {!adding && (
          <Button variant="outline" size="sm" onClick={() => setAdding(true)} className="w-full sm:w-auto">
            <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
            Añadir plan
          </Button>
        )}
      </div>

      {plans.length === 0 && !adding && (
        <div className="py-6 text-center text-sm text-muted-foreground border border-dashed border-border rounded-lg">
          No hay planes definidos. Añade un plan para asignarlo a tus suscriptores.
        </div>
      )}

      {plans.length > 0 && (
        <div className="rounded-lg border border-border overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Plan</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Tipo de pago</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Precio</th>
                <th className="px-4 py-2.5 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan.id} className="border-b border-border/50 last:border-0">
                  {editId === plan.id && editForm ? (
                    // ── Fila de edición inline ──
                    <td colSpan={4} className="px-4 py-3">
                      <PlanFormFields
                        form={editForm}
                        onChange={setEditForm}
                        onConfirm={() => handleEdit(plan.id)}
                        onCancel={() => { setEditId(null); setEditForm(null); }}
                        loading={loading}
                        mode="edit"
                      />
                    </td>
                  ) : (
                    // ── Fila de lectura ──
                    <>
                      <td className="px-4 py-3">
                        <p className="font-medium truncate max-w-[220px]">{plan.name}</p>
                        {plan.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-[220px]">{plan.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${billingBadgeVariant[plan.billing_type]}`}
                        >
                          {BILLING_TYPE_LABELS[plan.billing_type]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div>
                          {plan.setup_fee != null && plan.setup_fee > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {formatCurrency(plan.setup_fee, plan.currency as Currency)} setup
                            </p>
                          )}
                          <p className="font-semibold text-income">
                            {formatCurrency(plan.fee, plan.currency as Currency)}
                            <span className="text-xs font-normal text-muted-foreground ml-0.5">
                              {feeSuffix(plan.billing_type)}
                            </span>
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => {
                              setEditId(plan.id);
                              setEditForm({
                                name: plan.name,
                                billing_type: getBaseBillingType(plan.billing_type),
                                fee: String(plan.fee),
                                setup_fee: String(plan.setup_fee ?? ""),
                                currency: plan.currency as Currency,
                                description: plan.description ?? "",
                              });
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(plan.id)}
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

      {adding && (
        <div className="border border-border rounded-lg p-4 space-y-4 bg-muted/10">
          <p className="text-sm font-medium">Nuevo plan</p>
          <PlanFormFields
            form={form}
            onChange={setForm}
            onConfirm={handleAdd}
            onCancel={() => { setAdding(false); setForm(emptyForm(currency)); }}
            loading={loading}
            mode="add"
          />
        </div>
      )}
    </div>
  );
}

// ── Sub-componente: campos del formulario de plan ──────────────

interface PlanFormFieldsProps {
  form: PlanForm;
  onChange: (f: PlanForm) => void;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
  mode: "add" | "edit";
}

function PlanFormFields({ form, onChange, onConfirm, onCancel, loading, mode }: PlanFormFieldsProps) {
  const feeAmount = parseAmount(form.fee);
  const setupAmount = parseAmount(form.setup_fee);
  const hasAnyPrice = feeAmount > 0 || setupAmount > 0;
  const canSubmit = !!form.name && hasAnyPrice;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Nombre */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Nombre *</label>
          <Input
            value={form.name}
            onChange={(e) => onChange({ ...form, name: e.target.value })}
            placeholder="Ej. Básico, Pro, Enterprise"
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
              })
            }
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["monthly", "annual"] as SaasBillingType[]).map(
                (bt) => (
                  <SelectItem key={bt} value={bt}>
                    <div>
                      <span className="font-medium">{BILLING_TYPE_LABELS[bt]}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        — {BILLING_TYPE_DESCRIPTIONS[bt]}
                      </span>
                    </div>
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Setup fee */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">
            Setup fee <span className="text-muted-foreground/60">(opcional, pago único)</span>
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

        {/* Cuota recurrente */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">
            {feeLabel(form.billing_type)} <span className="text-muted-foreground/60">(opcional)</span>
          </label>
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
          <p className="text-[11px] text-muted-foreground/80">
            Debes completar cuota, setup fee o ambos.
          </p>
        </div>

        {/* Descripción */}
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-xs text-muted-foreground">Descripción</label>
          <Input
            value={form.description}
            onChange={(e) => onChange({ ...form, description: e.target.value })}
            placeholder="Qué incluye este plan..."
            className="h-8"
          />
        </div>
      </div>

      {/* Resumen de precios */}
      {hasAnyPrice && (
        <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Resumen: </span>
          {setupAmount > 0 && (
            <>
              {formatCurrency(setupAmount, form.currency)} setup
              {feeAmount > 0 ? " + " : ""}
            </>
          )}
          {feeAmount > 0 && (
            <>
              {formatCurrency(feeAmount, form.currency)}
              {feeSuffix(form.billing_type)}
            </>
          )}
          {(form.billing_type === "annual" || form.billing_type === "setup_annual") && feeAmount > 0 && (
            <span className="ml-2 text-muted-foreground/70">
              ≈ {formatCurrency(feeAmount / 12, form.currency)}/mes MRR
            </span>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          size="sm"
          onClick={onConfirm}
          disabled={loading || !canSubmit}
          className="w-full sm:w-auto"
        >
          {loading ? "Guardando..." : mode === "add" ? "Crear plan" : "Guardar cambios"}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} className="w-full sm:w-auto">
          Cancelar
        </Button>
      </div>
    </div>
  );
}
