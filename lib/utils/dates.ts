import {
  addMonths,
  addYears,
  addQuarters,
  setDate,
  isAfter,
  isBefore,
  startOfMonth,
  endOfMonth,
  format,
  parseISO,
  isValid,
} from "date-fns";
import { es } from "date-fns/locale";
import type { CompanyExpense } from "@/types";

/**
 * Calcula la próxima fecha de pago para un gasto recurrente o puntual.
 *
 * Lógica:
 * - one_off     → billing_date exacto
 * - monthly     → próximo mes con billing_day (o el actual si aún no ha pasado)
 * - yearly      → próximo año con billing_date, o billing_day en el mes de start_date
 * - quarterly   → próximos 3 meses con billing_day
 *
 * billing_day siempre entre 1-28 para evitar problemas con febrero.
 */
export function getNextPaymentDate(expense: CompanyExpense): Date | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Gasto puntual (one_off)
  if (expense.interval === "one_off") {
    if (!expense.billing_date) return null;
    const date = parseISO(expense.billing_date);
    return isValid(date) ? date : null;
  }

  // Para recurrentes, necesitamos billing_day
  const billingDay = expense.billing_day ?? 1;
  const clampedDay = Math.min(Math.max(billingDay, 1), 28);

  if (expense.interval === "monthly") {
    // Crear fecha en el mes actual con el día de cobro
    let candidate = setDate(new Date(today.getFullYear(), today.getMonth(), 1), clampedDay);

    // Si ya pasó este mes, ir al siguiente
    if (!isAfter(candidate, today) && candidate.getTime() !== today.getTime()) {
      candidate = addMonths(candidate, 1);
      candidate = setDate(candidate, clampedDay);
    }

    // Respetar end_date
    if (expense.end_date) {
      const endDate = parseISO(expense.end_date);
      if (isAfter(candidate, endDate)) return null;
    }

    return candidate;
  }

  if (expense.interval === "quarterly") {
    // Calcular desde start_date o hoy cuál es el próximo trimestre
    const baseDate = expense.start_date ? parseISO(expense.start_date) : today;
    let candidate = setDate(
      new Date(baseDate.getFullYear(), baseDate.getMonth(), 1),
      clampedDay
    );

    // Avanzar por trimestres hasta encontrar una fecha futura
    while (!isAfter(candidate, today)) {
      candidate = addQuarters(candidate, 1);
      candidate = setDate(candidate, clampedDay);
    }

    if (expense.end_date) {
      const endDate = parseISO(expense.end_date);
      if (isAfter(candidate, endDate)) return null;
    }

    return candidate;
  }

  if (expense.interval === "yearly") {
    // Si tiene billing_date exacto, usar ese pero en el próximo año si ya pasó
    if (expense.billing_date) {
      let candidate = parseISO(expense.billing_date);
      if (!isValid(candidate)) return null;

      while (!isAfter(candidate, today)) {
        candidate = addYears(candidate, 1);
      }

      if (expense.end_date) {
        const endDate = parseISO(expense.end_date);
        if (isAfter(candidate, endDate)) return null;
      }

      return candidate;
    }

    // Sin billing_date, usar billing_day en el mes de start_date
    const baseDate = expense.start_date ? parseISO(expense.start_date) : today;
    let candidate = setDate(
      new Date(today.getFullYear(), baseDate.getMonth(), 1),
      clampedDay
    );

    while (!isAfter(candidate, today)) {
      candidate = addYears(candidate, 1);
      candidate = setDate(candidate, clampedDay);
    }

    if (expense.end_date) {
      const endDate = parseISO(expense.end_date);
      if (isAfter(candidate, endDate)) return null;
    }

    return candidate;
  }

  return null;
}

/**
 * Obtiene todos los pagos previstos de un gasto en un rango de fechas.
 * Útil para el calendario y cashflow.
 */
export function getPaymentsInRange(
  expense: CompanyExpense,
  rangeStart: Date,
  rangeEnd: Date
): Date[] {
  const payments: Date[] = [];

  if (expense.status !== "active") return payments;

  const endDate = expense.end_date ? parseISO(expense.end_date) : null;

  if (expense.interval === "one_off") {
    if (!expense.billing_date) return payments;
    const date = parseISO(expense.billing_date);
    if (
      isValid(date) &&
      !isBefore(date, rangeStart) &&
      !isAfter(date, rangeEnd)
    ) {
      payments.push(date);
    }
    return payments;
  }

  const billingDay = Math.min(Math.max(expense.billing_day ?? 1, 1), 28);

  // Punto de inicio: el mayor entre start_date del gasto y rangeStart
  const startBase = expense.start_date
    ? isAfter(parseISO(expense.start_date), rangeStart)
      ? parseISO(expense.start_date)
      : rangeStart
    : rangeStart;

  // Encontrar la primera ocurrencia en o después de startBase
  let current: Date;

  if (expense.interval === "monthly") {
    current = setDate(startOfMonth(startBase), billingDay);
    if (isBefore(current, startBase)) {
      current = setDate(startOfMonth(addMonths(startBase, 1)), billingDay);
    }

    while (!isAfter(current, rangeEnd)) {
      if (!isBefore(current, rangeStart)) {
        if (!endDate || !isAfter(current, endDate)) {
          payments.push(new Date(current));
        }
      }
      current = setDate(addMonths(current, 1), billingDay);
    }
  }

  if (expense.interval === "quarterly") {
    current = setDate(startOfMonth(startBase), billingDay);
    if (isBefore(current, startBase)) {
      current = setDate(startOfMonth(addQuarters(startBase, 1)), billingDay);
    }

    while (!isAfter(current, rangeEnd)) {
      if (!isBefore(current, rangeStart)) {
        if (!endDate || !isAfter(current, endDate)) {
          payments.push(new Date(current));
        }
      }
      current = setDate(addQuarters(current, 1), billingDay);
    }
  }

  if (expense.interval === "yearly") {
    if (expense.billing_date) {
      current = parseISO(expense.billing_date);
      while (isBefore(current, rangeStart)) {
        current = addYears(current, 1);
      }
      while (!isAfter(current, rangeEnd)) {
        if (!endDate || !isAfter(current, endDate)) {
          payments.push(new Date(current));
        }
        current = addYears(current, 1);
      }
    } else {
      const baseDate = expense.start_date ? parseISO(expense.start_date) : new Date();
      current = setDate(
        new Date(rangeStart.getFullYear(), baseDate.getMonth(), 1),
        billingDay
      );
      if (isBefore(current, rangeStart)) {
        current = addYears(current, 1);
      }
      while (!isAfter(current, rangeEnd)) {
        if (!endDate || !isAfter(current, endDate)) {
          payments.push(new Date(current));
        }
        current = addYears(current, 1);
      }
    }
  }

  return payments;
}

/**
 * Formatea una fecha en español.
 * @example formatDate('2024-01-15') → "15 ene 2024"
 */
export function formatDate(date: string | Date, pattern = "d MMM yyyy"): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  if (!isValid(d)) return "-";
  return format(d, pattern, { locale: es });
}

/**
 * Formatea un mes para etiquetas de gráficos.
 * @example formatMonthLabel('2024-01') → "Ene 24"
 */
export function formatMonthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return format(date, "MMM yy", { locale: es });
}

/**
 * Genera un array de los últimos N meses + N meses hacia adelante.
 * @returns Array de strings "YYYY-MM"
 */
export function getMonthRange(pastMonths = 3, futureMonths = 3): string[] {
  const today = new Date();
  const months: string[] = [];

  for (let i = -pastMonths; i <= futureMonths; i++) {
    const date = addMonths(today, i);
    months.push(format(date, "yyyy-MM"));
  }

  return months;
}

/**
 * Devuelve inicio y fin del mes actual.
 */
export function getCurrentMonthRange(): { start: Date; end: Date } {
  const today = new Date();
  return {
    start: startOfMonth(today),
    end: endOfMonth(today),
  };
}

/**
 * Etiqueta de intervalo en español.
 */
export function intervalLabel(interval: string): string {
  const labels: Record<string, string> = {
    one_off: "Puntual",
    monthly: "Mensual",
    yearly: "Anual",
    quarterly: "Trimestral",
  };
  return labels[interval] ?? interval;
}

/**
 * Comprueba si una fecha está vencida (antes de hoy).
 */
export function isOverdue(dateStr: string): boolean {
  const date = parseISO(dateStr);
  return isValid(date) && isBefore(date, new Date());
}
