import { parseISO, isValid, format, startOfMonth, endOfMonth, addMonths } from "date-fns";
import type {
  CompanyExpense,
  ExpenseTransaction,
  Invoice,
  IncomeTransaction,
  CashflowMonth,
} from "@/types";
import { getPaymentsInRange } from "./dates";

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
  }
): CashflowMonth[] {
  return months.map((yearMonth) => {
    const [year, month] = yearMonth.split("-").map(Number);
    const rangeStart = startOfMonth(new Date(year, month - 1, 1));
    const rangeEnd = endOfMonth(rangeStart);

    // --- Entradas previstas: facturas pending/sent con due_date en el rango ---
    const incomeExpected = data.invoices
      .filter((inv) => {
        if (!["pending", "sent"].includes(inv.status)) return false;
        const due = parseISO(inv.due_date);
        return isValid(due) && due >= rangeStart && due <= rangeEnd;
      })
      .reduce((sum, inv) => sum + (inv.total ?? 0), 0);

    // --- Salidas previstas: gastos activos con pagos en el rango ---
    const expenseExpected = data.expenses
      .filter((exp) => exp.status === "active")
      .reduce((sum, exp) => {
        const payments = getPaymentsInRange(exp, rangeStart, rangeEnd);
        return sum + payments.length * exp.amount;
      }, 0);

    // --- Entradas reales: income_transactions en el rango ---
    const incomeReal = data.incomeTransactions
      .filter((t) => {
        const d = parseISO(t.date);
        return isValid(d) && d >= rangeStart && d <= rangeEnd;
      })
      .reduce((sum, t) => sum + t.amount, 0);

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
