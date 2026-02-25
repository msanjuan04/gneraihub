import { createClient } from "@/lib/supabase/server";
import { CalendarView } from "@/components/calendario/CalendarView";
import { getPaymentsInRange } from "@/lib/utils/dates";
import { parseISO, isValid, startOfMonth, endOfMonth } from "date-fns";
import type { CalendarEvent } from "@/types";

/**
 * Página del calendario unificado.
 * Muestra pagos y cobros del mes actual con indicadores visuales.
 */
export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: { month?: string; year?: string };
}) {
  const supabase = await createClient();

  // Determinar mes a mostrar (por defecto: mes actual)
  const now = new Date();
  const year = parseInt(searchParams.year ?? String(now.getFullYear()));
  const month = parseInt(searchParams.month ?? String(now.getMonth() + 1)) - 1;
  const rangeStart = startOfMonth(new Date(year, month, 1));
  const rangeEnd = endOfMonth(rangeStart);

  const [expensesRes, invoicesRes, expenseTransactionsRes, incomeTransactionsRes] = await Promise.all([
    supabase
      .from("company_expenses")
      .select("id,name,amount,currency,status,interval,billing_day,billing_date,start_date,end_date")
      .eq("status", "active"),
    supabase
      .from("invoices")
      .select("id,invoice_number,total,currency,due_date,status,client:clients(name)")
      .gte("due_date", rangeStart.toISOString().split("T")[0])
      .lte("due_date", rangeEnd.toISOString().split("T")[0]),
    supabase
      .from("expense_transactions")
      .select("id,name,amount,currency,date,status")
      .gte("date", rangeStart.toISOString().split("T")[0])
      .lte("date", rangeEnd.toISOString().split("T")[0]),
    supabase
      .from("income_transactions")
      .select("id,concept,amount,currency,date")
      .gte("date", rangeStart.toISOString().split("T")[0])
      .lte("date", rangeEnd.toISOString().split("T")[0]),
  ]);

  const expenses = expensesRes.data ?? [];
  const invoices = (invoicesRes.data ?? []) as any[];
  const expenseTransactions = expenseTransactionsRes.data ?? [];
  const incomeTransactions = incomeTransactionsRes.data ?? [];

  // Construir eventos del calendario
  const events: CalendarEvent[] = [];

  // Pagos previstos (suscripciones y gastos recurrentes)
  for (const expense of expenses) {
    const payments = getPaymentsInRange(expense as any, rangeStart, rangeEnd);
    payments.forEach((date) => {
      events.push({
        id: `exp-${expense.id}-${date.toISOString()}`,
        type: "payment",
        title: expense.name,
        amount: expense.amount,
        currency: expense.currency as any,
        date: date.toISOString().split("T")[0],
        status: "pending",
        sourceId: expense.id,
        sourceType: "company_expense",
      });
    });
  }

  // Cobros previstos (facturas pendientes/enviadas)
  invoices
    .filter((inv) => ["pending", "sent", "overdue"].includes(inv.status))
    .forEach((inv) => {
      events.push({
        id: `inv-${inv.id}`,
        type: "income",
        title: `${inv.client?.name ?? "Cliente"} — ${inv.invoice_number}`,
        amount: inv.total ?? 0,
        currency: inv.currency,
        date: inv.due_date,
        status: inv.status,
        sourceId: inv.id,
        sourceType: "invoice",
      });
    });

  // Pagos reales registrados
  expenseTransactions.forEach((t: any) => {
    events.push({
      id: `txn-${t.id}`,
      type: "paid_payment",
      title: t.name,
      amount: t.amount,
      currency: t.currency,
      date: t.date,
      status: t.status,
      sourceId: t.id,
      sourceType: "expense_transaction",
    });
  });

  // Cobros reales registrados
  incomeTransactions.forEach((t: any) => {
    events.push({
      id: `inc-${t.id}`,
      type: "paid_income",
      title: t.concept,
      amount: t.amount,
      currency: t.currency,
      date: t.date,
      status: "paid",
      sourceId: t.id,
      sourceType: "income_transaction",
    });
  });

  return (
    <CalendarView
      events={events}
      currentYear={year}
      currentMonth={month + 1}
    />
  );
}
