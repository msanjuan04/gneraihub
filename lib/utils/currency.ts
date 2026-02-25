import type { Currency } from "@/types";

/**
 * Formatea un número como moneda.
 * @example formatCurrency(1500.5, 'EUR') → "1.500,50 €"
 */
export function formatCurrency(
  amount: number,
  currency: Currency = "EUR",
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(amount);
}

/**
 * Formatea un número compacto para KPIs del dashboard.
 * @example formatCompact(1500000, 'EUR') → "1,5M €"
 */
export function formatCompact(
  amount: number,
  currency: Currency = "EUR"
): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

/**
 * Calcula la variación porcentual entre dos valores.
 * @returns null si no hay valor base
 */
export function calcVariation(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/**
 * Calcula el margen de un proyecto como porcentaje.
 */
export function calcMargin(income: number, expenses: number): number {
  if (income === 0) return 0;
  return ((income - expenses) / income) * 100;
}
