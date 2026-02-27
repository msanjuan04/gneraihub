import {
  addMonths,
  isAfter,
  isBefore,
  isValid,
  parseISO,
  startOfDay,
} from "date-fns";
import type { Mensualidad, MensualidadPayment, SaasBillingType } from "@/types";

type MensualidadSchedule = Pick<
  Mensualidad,
  "id" | "status" | "billing_type" | "fee" | "setup_fee" | "start_date" | "end_date" | "created_at"
>;

type MensualidadPaymentSchedule = Pick<MensualidadPayment, "payment_date" | "is_setup">;

export interface MensualidadDueInfo {
  dueDate: Date;
  expectedAmount: number;
  isOverdue: boolean;
  isFirstCycle: boolean;
  setupPending: boolean;
}

function normalizeDate(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = parseISO(value);
  return isValid(d) ? normalizeDate(d) : null;
}

function getAnchorDate(mensualidad: MensualidadSchedule): Date | null {
  const start = parseDate(mensualidad.start_date);
  if (start) return start;
  return parseDate(mensualidad.created_at);
}

export function mensualidadIntervalMonths(billingType: SaasBillingType): number {
  return billingType === "annual" || billingType === "setup_annual" ? 12 : 1;
}

export function mensualidadHasSetupFee(billingType: SaasBillingType): boolean {
  return billingType === "setup_monthly" || billingType === "setup_annual";
}

function hasPaymentInCycle(
  payments: Date[],
  cycleStart: Date,
  cycleEnd: Date
): boolean {
  return payments.some((paymentDate) => {
    if (isBefore(paymentDate, cycleStart)) return false;
    return isBefore(paymentDate, cycleEnd);
  });
}

function parsePaymentDates(payments: MensualidadPaymentSchedule[]): Date[] {
  return payments
    .map((p) => parseDate(p.payment_date))
    .filter((d): d is Date => !!d)
    .sort((a, b) => a.getTime() - b.getTime());
}

function isSetupPending(
  mensualidad: MensualidadSchedule,
  payments: MensualidadPaymentSchedule[]
): boolean {
  if (!mensualidadHasSetupFee(mensualidad.billing_type)) return false;
  if (!mensualidad.setup_fee || mensualidad.setup_fee <= 0) return false;
  return !payments.some((p) => p.is_setup);
}

export function getNextMensualidadDue(
  mensualidad: MensualidadSchedule,
  payments: MensualidadPaymentSchedule[],
  fromDate = new Date()
): MensualidadDueInfo | null {
  if (mensualidad.status !== "active") return null;

  const anchor = getAnchorDate(mensualidad);
  if (!anchor) return null;

  const intervalMonths = mensualidadIntervalMonths(mensualidad.billing_type);
  const endDate = parseDate(mensualidad.end_date);
  const paymentDates = parsePaymentDates(payments);
  const today = startOfDay(fromDate);
  const pendingSetup = isSetupPending(mensualidad, payments);

  let cycleStart = anchor;
  let guard = 0;

  while (guard < 600) {
    if (endDate && isAfter(cycleStart, endDate)) return null;

    const cycleEnd = addMonths(cycleStart, intervalMonths);
    const cycleIsPaid = hasPaymentInCycle(paymentDates, cycleStart, cycleEnd);

    if (!cycleIsPaid) {
      const firstCycle = cycleStart.getTime() === anchor.getTime();
      const setupAmount =
        firstCycle && pendingSetup && mensualidad.setup_fee ? mensualidad.setup_fee : 0;

      return {
        dueDate: cycleStart,
        expectedAmount: mensualidad.fee + setupAmount,
        isOverdue: isBefore(cycleStart, today),
        isFirstCycle: firstCycle,
        setupPending: firstCycle && pendingSetup,
      };
    }

    cycleStart = cycleEnd;
    guard += 1;
  }

  return null;
}

export function getMensualidadDueInRange(
  mensualidad: MensualidadSchedule,
  payments: MensualidadPaymentSchedule[],
  rangeStart: Date,
  rangeEnd: Date
): MensualidadDueInfo[] {
  if (mensualidad.status !== "active") return [];

  const anchor = getAnchorDate(mensualidad);
  if (!anchor) return [];

  const intervalMonths = mensualidadIntervalMonths(mensualidad.billing_type);
  const paymentDates = parsePaymentDates(payments);
  const endDate = parseDate(mensualidad.end_date);
  const pendingSetup = isSetupPending(mensualidad, payments);
  const normalizedStart = startOfDay(rangeStart);
  const normalizedEnd = startOfDay(rangeEnd);
  const dueList: MensualidadDueInfo[] = [];

  let cycleStart = anchor;
  let guard = 0;

  while (guard < 600) {
    if (endDate && isAfter(cycleStart, endDate)) break;
    if (isAfter(cycleStart, normalizedEnd)) break;

    const cycleEnd = addMonths(cycleStart, intervalMonths);
    const cycleIsPaid = hasPaymentInCycle(paymentDates, cycleStart, cycleEnd);

    if (!cycleIsPaid && !isBefore(cycleStart, normalizedStart)) {
      const firstCycle = cycleStart.getTime() === anchor.getTime();
      const setupAmount =
        firstCycle && pendingSetup && mensualidad.setup_fee ? mensualidad.setup_fee : 0;
      dueList.push({
        dueDate: cycleStart,
        expectedAmount: mensualidad.fee + setupAmount,
        isOverdue: isBefore(cycleStart, startOfDay(new Date())),
        isFirstCycle: firstCycle,
        setupPending: firstCycle && pendingSetup,
      });
    }

    cycleStart = cycleEnd;
    guard += 1;
  }

  return dueList;
}
