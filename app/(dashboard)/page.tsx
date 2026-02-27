import { createClient } from "@/lib/supabase/server";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { CashflowChart } from "@/components/dashboard/CashflowChart";
import { UpcomingPayments } from "@/components/dashboard/UpcomingPayments";
import { OverdueAlerts } from "@/components/dashboard/OverdueAlerts";
import { calculateCashflow } from "@/lib/utils/cashflow";
import { getPaymentsInRange, getMonthRange, getCurrentMonthRange } from "@/lib/utils/dates";
import { getMensualidadDueInRange } from "@/lib/utils/mensualidades";
import { addDays, addMonths, endOfDay, format, parseISO, isValid, startOfDay, startOfMonth } from "date-fns";
import type { CalendarEvent, Invoice, MensualidadPayment } from "@/types";

type DashboardMensualidad = {
  id: string;
  name: string;
  billing_type: "monthly" | "annual" | "setup_monthly" | "setup_annual";
  fee: number;
  setup_fee: number | null;
  currency: "EUR" | "USD" | "GBP";
  status: "active" | "paused" | "cancelled";
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  client?: { name: string } | null;
};

/**
 * Dashboard principal — muestra KPIs financieros del mes actual,
 * próximos pagos/cobros y gráfico de cashflow histórico.
 */
export default async function DashboardPage() {
  const supabase = await createClient();
  const lookbackDate = format(startOfMonth(addMonths(new Date(), -5)), "yyyy-MM-dd");

  // Cargar todos los datos necesarios en paralelo
  const [
    expensesRes,
    expenseTransactionsRes,
    invoicesRes,
    incomeTransactionsRes,
    mensualidadesRes,
    mensualidadPaymentsRes,
  ] = await Promise.all([
    supabase
      .from("company_expenses")
      .select("id,name,amount,currency,status,interval,billing_day,billing_date,start_date,end_date")
      .eq("status", "active"),
    supabase
      .from("expense_transactions")
      .select("id,date,status,amount")
      .gte("date", lookbackDate)
      .order("date", { ascending: false }),
    supabase
      .from("invoices")
      .select("id,invoice_number,total,currency,due_date,status,client:clients(name)")
      .or(`status.eq.overdue,due_date.gte.${lookbackDate}`)
      .order("due_date", { ascending: true }),
    supabase
      .from("income_transactions")
      .select("id,date,amount")
      .gte("date", lookbackDate)
      .order("date", { ascending: false }),
    supabase
      .from("mensualidades")
      .select("id,name,billing_type,fee,setup_fee,currency,status,start_date,end_date,created_at,client:clients(name)")
      .eq("status", "active"),
    supabase
      .from("mensualidad_payments")
      .select("id,mensualidad_id,payment_date,amount,currency,is_setup")
      .gte("payment_date", lookbackDate)
      .order("payment_date", { ascending: false }),
  ]);

  const expenses = expensesRes.data ?? [];
  const expenseTransactions = expenseTransactionsRes.data ?? [];
  const invoices = (invoicesRes.data ?? []) as unknown as Invoice[];
  const incomeTransactions = incomeTransactionsRes.data ?? [];
  const mensualidades = (mensualidadesRes.data ?? []) as unknown as DashboardMensualidad[];
  const mensualidadPayments = (mensualidadPaymentsRes.data ?? []) as MensualidadPayment[];
  const mensualidadPaymentsByMensualidad = mensualidadPayments.reduce<Record<string, MensualidadPayment[]>>(
    (acc, payment) => {
      acc[payment.mensualidad_id] = acc[payment.mensualidad_id] ?? [];
      acc[payment.mensualidad_id].push(payment);
      return acc;
    },
    {}
  );

  // --- Calcular stats del mes actual ---
  const { start: monthStart, end: monthEnd } = getCurrentMonthRange();

  // Ingresos previstos: facturas pending/sent con due_date en el mes actual
  const invoiceIncomeExpected = invoices
    .filter((inv) => {
      if (!["pending", "sent"].includes(inv.status)) return false;
      const due = parseISO(inv.due_date);
      return isValid(due) && due >= monthStart && due <= monthEnd;
    })
    .reduce((sum, inv) => sum + (inv.total ?? 0), 0);

  const mensualidadIncomeExpected = mensualidades.reduce((sum, mensualidad) => {
    const dueList = getMensualidadDueInRange(
      mensualidad,
      mensualidadPaymentsByMensualidad[mensualidad.id] ?? [],
      monthStart,
      monthEnd
    );
    return sum + dueList.reduce((dueSum, due) => dueSum + due.expectedAmount, 0);
  }, 0);

  const incomeExpected = invoiceIncomeExpected + mensualidadIncomeExpected;

  // Ingresos reales: cobros registrados este mes
  const invoiceIncomeReal = incomeTransactions
    .filter((t) => {
      const d = parseISO(t.date);
      return isValid(d) && d >= monthStart && d <= monthEnd;
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const mensualidadIncomeReal = mensualidadPayments
    .filter((payment) => {
      const d = parseISO(payment.payment_date);
      return isValid(d) && d >= monthStart && d <= monthEnd;
    })
    .reduce((sum, payment) => sum + payment.amount, 0);

  const incomeReal = invoiceIncomeReal + mensualidadIncomeReal;

  // Gastos previstos: company_expenses con pagos este mes
  const expenseExpected = expenses.reduce((sum, exp) => {
    const payments = getPaymentsInRange(exp as any, monthStart, monthEnd);
    return sum + payments.length * exp.amount;
  }, 0);

  // Gastos reales: transacciones pagadas este mes
  const expenseReal = expenseTransactions
    .filter((t) => {
      const d = parseISO(t.date);
      return isValid(d) && d >= monthStart && d <= monthEnd && t.status === "paid";
    })
    .reduce((sum, t) => sum + t.amount, 0);

  // --- Cashflow de los últimos 6 meses ---
  const months = getMonthRange(5, 0); // 5 meses atrás + mes actual
  const cashflowData = calculateCashflow(months, {
    expenses: expenses as any,
    expenseTransactions: expenseTransactions as any,
    invoices,
    incomeTransactions: incomeTransactions as any,
    mensualidades: mensualidades as any,
    mensualidadPayments: mensualidadPayments as any,
  });

  // --- Próximos 7 días (pagos y cobros) ---
  const today = startOfDay(new Date());
  const nextWeek = endOfDay(addDays(today, 7));
  const upcomingEvents: CalendarEvent[] = [];

  // Pagos previstos próximos 7 días
  for (const expense of expenses) {
    const payments = getPaymentsInRange(expense as any, today, nextWeek);
    payments.forEach((date) => {
      upcomingEvents.push({
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

  // Cobros previstos de mensualidades en los próximos 7 días
  for (const mensualidad of mensualidades as any[]) {
    const dueList = getMensualidadDueInRange(
      mensualidad,
      mensualidadPaymentsByMensualidad[mensualidad.id] ?? [],
      today,
      nextWeek
    );

    dueList.forEach((due) => {
      upcomingEvents.push({
        id: `mensualidad-${mensualidad.id}-${due.dueDate.toISOString()}`,
        type: "income",
        title: `${mensualidad.client?.name ?? "Cliente"} — ${mensualidad.name}`,
        amount: due.expectedAmount,
        currency: mensualidad.currency as any,
        date: due.dueDate.toISOString().split("T")[0],
        status: "pending",
        sourceId: mensualidad.id,
        sourceType: "mensualidad",
      });
    });
  }

  // Cobros previstos: facturas pending/sent con due_date en los próximos 7 días
  invoices
    .filter((inv) => {
      if (!["pending", "sent"].includes(inv.status)) return false;
      const due = parseISO(inv.due_date);
      return isValid(due) && due >= today && due <= nextWeek;
    })
    .forEach((inv) => {
      upcomingEvents.push({
        id: `inv-${inv.id}`,
        type: "income",
        title: `${inv.client?.name ?? "Cliente"} — ${inv.invoice_number}`,
        amount: inv.total ?? 0,
        currency: inv.currency as any,
        date: inv.due_date,
        status: inv.status,
        sourceId: inv.id,
        sourceType: "invoice",
      });
    });

  // --- Facturas vencidas ---
  const overdueInvoices = invoices.filter((inv) => inv.status === "overdue");

  return (
    <div className="space-y-6">
      {/* Alertas de facturas vencidas (si las hay) */}
      {overdueInvoices.length > 0 && (
        <OverdueAlerts overdueInvoices={overdueInvoices} />
      )}

      {/* KPIs del mes */}
      <StatsCards
        incomeExpected={incomeExpected}
        incomeReal={incomeReal}
        expenseExpected={expenseExpected}
        expenseReal={expenseReal}
        netExpected={incomeExpected - expenseExpected}
        netReal={incomeReal - expenseReal}
      />

      {/* Fila: gráfico + próximos pagos */}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <CashflowChart data={cashflowData} />
        </div>
        <div className="lg:col-span-2">
          <UpcomingPayments events={upcomingEvents} />
        </div>
      </div>
    </div>
  );
}
