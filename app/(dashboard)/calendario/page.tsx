import { createClient } from "@/lib/supabase/server";
import { CalendarView } from "@/components/calendario/CalendarView";
import { getPaymentsInRange } from "@/lib/utils/dates";
import { getMensualidadDueInRange } from "@/lib/utils/mensualidades";
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

  const rangeStartISO = rangeStart.toISOString().split("T")[0];
  const rangeEndISO = rangeEnd.toISOString().split("T")[0];

  const [
    expensesRes,
    invoicesRes,
    expenseTransactionsRes,
    incomeTransactionsRes,
    mensualidadesRes,
    mensualidadPaymentsRes,
    mensualidadPaymentsRangeRes,
  ] = await Promise.all([
    supabase
      .from("company_expenses")
      .select("id,name,amount,currency,status,interval,billing_day,billing_date,start_date,end_date")
      .eq("status", "active"),
    supabase
      .from("invoices")
      .select("id,invoice_number,total,currency,due_date,status,client:clients(name)")
      .in("status", ["pending", "sent", "overdue"])
      .gte("due_date", rangeStartISO)
      .lte("due_date", rangeEndISO),
    supabase
      .from("expense_transactions")
      .select("id,name,amount,currency,date,status")
      .gte("date", rangeStartISO)
      .lte("date", rangeEndISO),
    supabase
      .from("income_transactions")
      .select("id,concept,amount,currency,date")
      .gte("date", rangeStartISO)
      .lte("date", rangeEndISO),
    supabase
      .from("mensualidades")
      .select("id,name,billing_type,fee,setup_fee,currency,status,start_date,end_date,created_at,client:clients(name)")
      .eq("status", "active"),
    supabase
      .from("mensualidad_payments")
      .select("mensualidad_id,payment_date,is_setup")
      .gte("payment_date", rangeStartISO)
      .lte("payment_date", rangeEndISO),
    supabase
      .from("mensualidad_payments")
      .select("id,mensualidad_id,payment_date,amount,currency,mensualidad:mensualidades(name),client:clients(name)")
      .gte("payment_date", rangeStartISO)
      .lte("payment_date", rangeEndISO),
  ]);

  const expenses = expensesRes.data ?? [];
  const invoices = (invoicesRes.data ?? []) as any[];
  const expenseTransactions = expenseTransactionsRes.data ?? [];
  const incomeTransactions = incomeTransactionsRes.data ?? [];
  const mensualidades = (mensualidadesRes.data ?? []) as any[];
  const mensualidadPayments = (mensualidadPaymentsRes.data ?? []) as any[];
  const mensualidadPaymentsInMonth = (mensualidadPaymentsRangeRes.data ?? []) as any[];
  const mensualidadPaymentsByMensualidad = mensualidadPayments.reduce<Record<string, any[]>>(
    (acc, payment) => {
      acc[payment.mensualidad_id] = acc[payment.mensualidad_id] ?? [];
      acc[payment.mensualidad_id].push(payment);
      return acc;
    },
    {}
  );

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

  // Cobros previstos de mensualidades
  mensualidades.forEach((mensualidad) => {
    const dueList = getMensualidadDueInRange(
      mensualidad,
      mensualidadPaymentsByMensualidad[mensualidad.id] ?? [],
      rangeStart,
      rangeEnd
    );

    dueList.forEach((due) => {
      events.push({
        id: `mensualidad-${mensualidad.id}-${due.dueDate.toISOString()}`,
        type: "income",
        title: `${mensualidad.client?.name ?? "Cliente"} — ${mensualidad.name}`,
        amount: due.expectedAmount,
        currency: mensualidad.currency,
        date: due.dueDate.toISOString().split("T")[0],
        status: due.isOverdue ? "overdue" : "pending",
        sourceId: mensualidad.id,
        sourceType: "mensualidad",
      });
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

  // Cobros reales de mensualidades
  mensualidadPaymentsInMonth.forEach((payment: any) => {
    events.push({
      id: `mensualidad-paid-${payment.id}`,
      type: "paid_income",
      title: `${payment.client?.name ?? "Cliente"} — ${payment.mensualidad?.name ?? "Mensualidad"}`,
      amount: payment.amount,
      currency: payment.currency,
      date: payment.payment_date,
      status: "paid",
      sourceId: payment.id,
      sourceType: "mensualidad_payment",
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
