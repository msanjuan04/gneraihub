import type { SaasBillingType, SaasPlan, Currency } from "@/types";
import { formatCurrency } from "./currency";

// ============================================================
// Labels para billing_type
// ============================================================
export const BILLING_TYPE_LABELS: Record<SaasBillingType, string> = {
  monthly: "Mensual",
  annual: "Anual",
  setup_monthly: "Setup + Mensual",
  setup_annual: "Setup + Anual",
};

export const BILLING_TYPE_DESCRIPTIONS: Record<SaasBillingType, string> = {
  monthly: "Cuota recurrente mensual",
  annual: "Cuota recurrente anual",
  setup_monthly: "Pago único de inicio + cuota mensual",
  setup_annual: "Pago único de inicio + cuota anual",
};

// ============================================================
// Etiqueta del campo "fee" según billing_type
// ============================================================
export function feeLabel(billingType: SaasBillingType): string {
  return billingType === "annual" || billingType === "setup_annual"
    ? "Cuota anual"
    : "Cuota mensual";
}

export function feeSuffix(billingType: SaasBillingType): string {
  return billingType === "annual" || billingType === "setup_annual" ? "/año" : "/mes";
}

// ============================================================
// Contribución al MRR de un plan (normalizada a mensual)
// ============================================================
export function planMrr(plan: SaasPlan): number {
  switch (plan.billing_type) {
    case "monthly":
    case "setup_monthly":
      return plan.fee;
    case "annual":
    case "setup_annual":
      return plan.fee / 12;
    default:
      return 0;
  }
}

// ============================================================
// Precio mostrado de un plan (para selects y listas)
// Ej: "99 €/mes", "500 € setup + 99 €/mes"
// ============================================================
export function formatPlanPricing(plan: SaasPlan): string {
  const cur = plan.currency as Currency;
  const feePart = `${formatCurrency(plan.fee, cur)}${feeSuffix(plan.billing_type)}`;

  if (
    (plan.billing_type === "setup_monthly" || plan.billing_type === "setup_annual") &&
    plan.setup_fee != null && plan.setup_fee > 0
  ) {
    return `${formatCurrency(plan.setup_fee, cur)} setup + ${feePart}`;
  }
  return feePart;
}
