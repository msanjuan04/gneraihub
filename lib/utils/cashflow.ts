import { parseISO, isValid, format, startOfMonth, endOfMonth, addMonths } from "date-fns";
import type {
  CompanyExpense,
  ExpenseTransaction,
  Invoice,
  IncomeTransaction,
  CashflowMonth,
  Mensualidad,
  MensualidadPayment,
} from "@/types";
import { getPaymentsInRange } from "./dates";
import { getMensualidadDueInRange } from "./mensualidades";

/**
 * Calcula el cashflow mensual combinando datos previstos y reales.
 *
 * Entradas previstas = facturas pending/sent cuyo due_date está en el rango
 * Salidas previstas  = company_expenses activos con próximo pago en el rango
 * Real               = income_transactions + expense_transactions reales en el rango
 */
export function calculateCashflow(
  months: string[], // array de "YYYY-MM"
  data: {
    expenses: CompanyExpense[];
    expenseTransactions: ExpenseTransaction[];
    invoices: Invoice[];
    incomeTransactions: IncomeTransaction[];
    mensualidades?: Mensualidad[];
    mensualidadPayments?: MensualidadPayment[];
  }
): CashflowMonth[] {
  const mensualidadPaymentsByMensualidad = (data.mensualidadPayments ?? []).reduce<
    Record<string, MensualidadPayment[]>
  >((acc, payment) => {
    acc[payment.mensualidad_id] = acc[payment.mensualidad_id] ?? [];
    acc[payment.mensualidad_id].push(payment);
    return acc;
  }, {});

  return months.map((yearMonth) => {
    const [year, month] = yearMonth.split("-").map(Number);
    const rangeStart = startOfMonth(new Date(year, month - 1, 1));
    const rangeEnd = endOfMonth(rangeStart);

    // --- Entradas previstas: facturas pending/sent con due_date en el rango ---
    const invoiceIncomeExpected = data.invoices
      .filter((inv) => {
        if (!["pending", "sent"].includes(inv.status)) return false;
        const due = parseISO(inv.due_date);
        return isValid(due) && due >= rangeStart && due <= rangeEnd;
      })
      .reduce((sum, inv) => sum + (inv.total ?? 0), 0);

    const mensualidadIncomeExpected = (data.mensualidades ?? [])
      .filter((mensualidad) => mensualidad.status === "active")
      .reduce((sum, mensualidad) => {
        const dueList = getMensualidadDueInRange(
          mensualidad,
          mensualidadPaymentsByMensualidad[mensualidad.id] ?? [],
          rangeStart,
          rangeEnd
        );
        return sum + dueList.reduce((dueSum, due) => dueSum + due.expectedAmount, 0);
      }, 0);

    const incomeExpected = invoiceIncomeExpected + mensualidadIncomeExpected;

    // --- Salidas previstas: gastos activos con pagos en el rango ---
    const expenseExpected = data.expenses
      .filter((exp) => exp.status === "active")
      .reduce((sum, exp) => {
        const payments = getPaymentsInRange(exp, rangeStart, rangeEnd);
        return sum + payments.length * exp.amount;
      }, 0);

    // --- Entradas reales: income_transactions en el rango ---
    const invoiceIncomeReal = data.incomeTransactions
      .filter((t) => {
        const d = parseISO(t.date);
        return isValid(d) && d >= rangeStart && d <= rangeEnd;
      })
      .reduce((sum, t) => sum + t.amount, 0);

    const mensualidadIncomeReal = (data.mensualidadPayments ?? [])
      .filter((payment) => {
        const d = parseISO(payment.payment_date);
        return isValid(d) && d >= rangeStart && d <= rangeEnd;
      })
      .reduce((sum, payment) => sum + payment.amount, 0);

    const incomeReal = invoiceIncomeReal + mensualidadIncomeReal;

    // --- Salidas reales: expense_transactions pagadas en el rango ---
    const expenseReal = data.expenseTransactions
      .filter((t) => {
        const d = parseISO(t.date);
        return isValid(d) && d >= rangeStart && d <= rangeEnd && t.status === "paid";
      })
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      month: yearMonth,
      label: format(rangeStart, "MMM yyyy", { locale: undefined }),
      incomeExpected,
      incomeReal,
      expenseExpected,
      expenseReal,
      netExpected: incomeExpected - expenseExpected,
      netReal: incomeReal - expenseReal,
    };
  });
}

/**
 * Agrupa transacciones de gastos por categoría para el desglose.
 */
export function groupExpensesByCategory(
  transactions: ExpenseTransaction[]
): Record<string, number> {
  return transactions.reduce<Record<string, number>>((acc, t) => {
    const cat = t.category ?? "Otro";
    acc[cat] = (acc[cat] ?? 0) + t.amount;
    return acc;
  }, {});
}
