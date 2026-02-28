import Link from "next/link";
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfDay,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  isValid,
  parseISO,
  startOfDay,
  startOfMonth,
} from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/dates";
import { getMensualidadDueInRange, getNextMensualidadDue } from "@/lib/utils/mensualidades";
import { BILLING_TYPE_LABELS } from "@/lib/utils/saas";
import { CalendarClock, History, Wallet, AlertTriangle, CalendarRange } from "lucide-react";
import {
  DeletePaymentButton,
  EditPaymentButton,
  RegisterPaymentButton,
} from "@/components/pagos/PaymentActionButtons";
import type { Currency, Mensualidad, MensualidadPayment, PaymentMethod } from "@/types";

type MensualidadWithRelations = Mensualidad & {
  client?: { id: string; name: string; company?: string | null } | null;
  project?: { id: string; name: string } | null;
};

type MensualidadPaymentWithRelations = MensualidadPayment & {
  mensualidad?: { id: string; name: string } | null;
  client?: { id: string; name: string } | null;
  project?: { id: string; name: string } | null;
};

type MensualidadPaymentSchedule = Pick<
  MensualidadPayment,
  "mensualidad_id" | "payment_date" | "is_setup"
>;

type InvoiceWithRelations = {
  id: string;
  invoice_number: string;
  total: number;
  currency: Currency;
  due_date: string;
  status: string;
  client?: { id: string; name: string } | Array<{ id: string; name: string }> | null;
  project?: { id: string; name: string } | Array<{ id: string; name: string }> | null;
};

type IncomeTransactionWithRelations = {
  id: string;
  invoice_id: string | null;
  concept: string;
  amount: number;
  currency: Currency;
  date: string;
  payment_method: PaymentMethod | null;
  client?: { id: string; name: string } | Array<{ id: string; name: string }> | null;
  project?: { id: string; name: string } | Array<{ id: string; name: string }> | null;
  invoice?: { invoice_number: string } | Array<{ invoice_number: string }> | null;
};

type UpcomingRow = {
  id: string;
  source: "mensualidad" | "factura";
  clientName: string;
  projectName: string;
  concept: string;
  subInfo: string;
  dueDate: Date;
  dueDateISO: string;
  amount: number;
  currency: Currency;
  isOverdue: boolean;
  daysDiff: number;
  mensualidadId?: string;
  setupPending?: boolean;
  invoiceId?: string;
};

type HistoryRow = {
  id: string;
  source: "mensualidad" | "factura";
  date: string;
  clientName: string;
  projectName: string;
  concept: string;
  amount: number;
  currency: Currency;
  badge: string;
  paymentMethod?: PaymentMethod | null;
  paymentNotes?: string | null;
  paymentId?: string;
  invoiceId?: string | null;
};

type TrackingRow = {
  id: string;
  source: "mensualidad" | "factura";
  monthLabel: string;
  dueDate: Date;
  dueDateISO: string;
  daysDiff: number;
  clientName: string;
  projectName: string;
  concept: string;
  subInfo: string;
  amount: number;
  currency: Currency;
};

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

const paymentMethodLabel: Record<PaymentMethod, string> = {
  card: "Tarjeta",
  transfer: "Transferencia",
  direct_debit: "Domiciliación",
  cash: "Efectivo",
  otro: "Otro",
};
const HISTORY_MONTHS = 12;
const HISTORY_LIMIT = 250;

export default async function PagosPage() {
  const supabase = await createClient();
  const now = new Date();
  const today = startOfDay(now);
  const next30Days = addDays(today, 30);
  const trackingEnd = endOfDay(addMonths(today, 12));
  const historyStart = startOfDay(addMonths(today, -HISTORY_MONTHS));
  const trackingEndISO = format(trackingEnd, "yyyy-MM-dd");
  const historyStartISO = format(historyStart, "yyyy-MM-dd");
  const monthStartISO = format(startOfMonth(now), "yyyy-MM-dd");
  const monthEndISO = format(endOfMonth(now), "yyyy-MM-dd");

  const { data: mensualidadesData } = await supabase
    .from("mensualidades")
    .select(
      "id,client_id,project_id,name,billing_type,fee,setup_fee,currency,status,start_date,end_date,created_at,client:clients(id,name,company),project:projects(id,name)"
    )
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const mensualidades = (mensualidadesData ?? []) as MensualidadWithRelations[];
  const mensualidadIds = mensualidades.map((m) => m.id);

  let paymentsForSchedule: MensualidadPaymentSchedule[] = [];
  if (mensualidadIds.length > 0) {
    const { data: paymentsScheduleData } = await supabase
      .from("mensualidad_payments")
      .select("mensualidad_id,payment_date,is_setup")
      .in("mensualidad_id", mensualidadIds);
    paymentsForSchedule = (paymentsScheduleData ?? []) as MensualidadPaymentSchedule[];
  }

  const [
    paymentsHistoryRes,
    mensualidadMonthTotalsRes,
    overdueInvoicesRes,
    upcomingInvoicesRes,
    incomeTransactionsRes,
    incomeMonthTotalsRes,
  ] = await Promise.all([
    supabase
      .from("mensualidad_payments")
      .select(
        "id,mensualidad_id,client_id,project_id,payment_date,amount,currency,payment_method,is_setup,notes,mensualidad:mensualidades(id,name),client:clients(id,name),project:projects(id,name)"
      )
      .gte("payment_date", historyStartISO)
      .order("payment_date", { ascending: false })
      .limit(HISTORY_LIMIT),
    supabase
      .from("mensualidad_payments")
      .select("amount")
      .gte("payment_date", monthStartISO)
      .lte("payment_date", monthEndISO),
    supabase
      .from("invoices")
      .select(
        "id,invoice_number,total,currency,due_date,status,client:clients(id,name),project:projects(id,name)"
      )
      .eq("status", "overdue")
      .order("due_date", { ascending: true }),
    supabase
      .from("invoices")
      .select(
        "id,invoice_number,total,currency,due_date,status,client:clients(id,name),project:projects(id,name)"
      )
      .in("status", ["pending", "sent"])
      .lte("due_date", trackingEndISO)
      .order("due_date", { ascending: true }),
    supabase
      .from("income_transactions")
      .select(
        "id,invoice_id,concept,amount,currency,date,payment_method,client:clients(id,name),project:projects(id,name),invoice:invoices(invoice_number)"
      )
      .gte("date", historyStartISO)
      .order("date", { ascending: false })
      .limit(HISTORY_LIMIT),
    supabase
      .from("income_transactions")
      .select("amount")
      .gte("date", monthStartISO)
      .lte("date", monthEndISO),
  ]);

  const payments = (paymentsHistoryRes.data ?? []) as MensualidadPaymentWithRelations[];
  const invoices = [
    ...(overdueInvoicesRes.data ?? []),
    ...(upcomingInvoicesRes.data ?? []),
  ] as unknown as InvoiceWithRelations[];
  const incomeTransactions = (incomeTransactionsRes.data ?? []) as unknown as IncomeTransactionWithRelations[];
  const mensualidadMonthTotals = mensualidadMonthTotalsRes.data ?? [];
  const incomeMonthTotals = incomeMonthTotalsRes.data ?? [];

  const paymentsByMensualidad = paymentsForSchedule.reduce<Record<string, MensualidadPaymentSchedule[]>>(
    (acc, p) => {
      acc[p.mensualidad_id] = acc[p.mensualidad_id] ?? [];
      acc[p.mensualidad_id].push(p);
      return acc;
    },
    {}
  );

  const mensualidadUpcoming = mensualidades
    .map((m) => {
      const due = getNextMensualidadDue(m, paymentsByMensualidad[m.id] ?? []);
      if (!due) return null;
      const dueDateISO = due.dueDate.toISOString().split("T")[0];
      const daysDiff = differenceInCalendarDays(due.dueDate, today);
      return {
        id: `mensualidad-${m.id}`,
        source: "mensualidad" as const,
        clientName: m.client?.name ?? "—",
        projectName: m.project?.name ?? "Sin proyecto",
        concept: m.name,
        subInfo: BILLING_TYPE_LABELS[m.billing_type],
        dueDate: due.dueDate,
        dueDateISO,
        amount: due.expectedAmount,
        currency: m.currency as Currency,
        isOverdue: due.isOverdue,
        daysDiff,
        mensualidadId: m.id,
        setupPending: due.setupPending,
      };
    })
    .filter((item) => item !== null) as UpcomingRow[];

  const invoiceUpcoming = invoices
    .filter((inv) => ["pending", "sent", "overdue"].includes(inv.status))
    .map((inv) => {
      const dueDate = parseISO(inv.due_date);
      if (!isValid(dueDate)) return null;
      const dueDateDay = startOfDay(dueDate);
      const daysDiff = differenceInCalendarDays(dueDateDay, today);
      const client = firstRelation(inv.client);
      const project = firstRelation(inv.project);
      return {
        id: `invoice-${inv.id}`,
        source: "factura" as const,
        clientName: client?.name ?? "—",
        projectName: project?.name ?? "Sin proyecto",
        concept: `Factura ${inv.invoice_number}`,
        subInfo: inv.status === "overdue" ? "Vencida" : "Pendiente",
        dueDate: dueDateDay,
        dueDateISO: inv.due_date,
        amount: inv.total ?? 0,
        currency: inv.currency,
        isOverdue: isBefore(dueDateDay, today),
        daysDiff,
        invoiceId: inv.id,
      };
    })
    .filter((item) => item !== null) as UpcomingRow[];

  const upcomingRows = [...mensualidadUpcoming, ...invoiceUpcoming].sort(
    (a, b) => a.dueDate.getTime() - b.dueDate.getTime()
  );

  const overdueItems = upcomingRows.filter((item) => item.isOverdue);
  const upcoming30Items = upcomingRows.filter((item) => {
    return !isBefore(item.dueDate, today) && !isAfter(item.dueDate, next30Days);
  });

  const mensualidadCollectedThisMonth = mensualidadMonthTotals.reduce(
    (sum, payment) => sum + (payment.amount ?? 0),
    0
  );
  const invoicesCollectedThisMonth = incomeMonthTotals.reduce(
    (sum, income) => sum + (income.amount ?? 0),
    0
  );
  const collectedThisMonth = mensualidadCollectedThisMonth + invoicesCollectedThisMonth;

  const upcoming30Amount = upcoming30Items.reduce(
    (sum, item) => sum + item.amount,
    0
  );
  const overdueAmount = overdueItems.reduce(
    (sum, item) => sum + item.amount,
    0
  );

  const historyRows: HistoryRow[] = [
    ...payments.map((payment) => ({
      id: `mensualidad-payment-${payment.id}`,
      source: "mensualidad" as const,
      date: payment.payment_date,
      clientName: payment.client?.name ?? "—",
      projectName: payment.project?.name ?? "Sin proyecto",
      concept: payment.mensualidad?.name ?? "Mensualidad",
      amount: payment.amount,
      currency: payment.currency as Currency,
      badge: payment.is_setup ? "Setup" : "Mensualidad",
      paymentMethod: payment.payment_method,
      paymentNotes: payment.notes,
      paymentId: payment.id,
    })),
    ...incomeTransactions.map((tx) => {
      const client = firstRelation(tx.client);
      const project = firstRelation(tx.project);
      const invoice = firstRelation(tx.invoice);
      return {
        id: `invoice-income-${tx.id}`,
        source: "factura" as const,
        date: tx.date,
        clientName: client?.name ?? "—",
        projectName: project?.name ?? "Sin proyecto",
        concept: invoice?.invoice_number
          ? `Factura ${invoice.invoice_number}`
          : tx.concept,
        amount: tx.amount,
        currency: tx.currency as Currency,
        badge: "Factura",
        paymentMethod: tx.payment_method,
        invoiceId: tx.invoice_id,
      };
    }),
  ].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());

  const trackingRows: TrackingRow[] = [
    ...mensualidades.flatMap((m) =>
      getMensualidadDueInRange(
        m,
        paymentsByMensualidad[m.id] ?? [],
        today,
        trackingEnd
      ).map((due, index) => ({
        id: `tracking-m-${m.id}-${index}-${due.dueDate.toISOString()}`,
        source: "mensualidad" as const,
        monthLabel: formatDate(due.dueDate, "MMM yyyy"),
        dueDate: due.dueDate,
        dueDateISO: due.dueDate.toISOString().split("T")[0],
        daysDiff: differenceInCalendarDays(due.dueDate, today),
        clientName: m.client?.name ?? "—",
        projectName: m.project?.name ?? "Sin proyecto",
        concept: m.name,
        subInfo: BILLING_TYPE_LABELS[m.billing_type],
        amount: due.expectedAmount,
        currency: m.currency as Currency,
      }))
    ),
    ...invoiceUpcoming
      .filter((row) => !isAfter(row.dueDate, trackingEnd))
      .map((row) => ({
        id: `tracking-i-${row.id}`,
        source: "factura" as const,
        monthLabel: formatDate(row.dueDate, "MMM yyyy"),
        dueDate: row.dueDate,
        dueDateISO: row.dueDateISO,
        daysDiff: differenceInCalendarDays(row.dueDate, today),
        clientName: row.clientName,
        projectName: row.projectName,
        concept: row.concept,
        subInfo: row.subInfo,
        amount: row.amount,
        currency: row.currency,
      })),
  ].sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Cobrado este mes</p>
            <p className="text-xl font-bold text-income">{formatCurrency(collectedThisMonth)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Próximos 30 días</p>
            <p className="text-xl font-bold text-income">{formatCurrency(upcoming30Amount)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {upcoming30Items.length} cobro{upcoming30Items.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
              Vencidos
            </p>
            <p className="text-xl font-bold text-expense">{formatCurrency(overdueAmount)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {overdueItems.length} pendiente{overdueItems.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="upcoming">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
            <TabsTrigger value="upcoming" className="gap-2 shrink-0">
              <CalendarClock className="h-3.5 w-3.5" />
              Próximos cobros
              <Badge variant="secondary" className="ml-1">
                {upcomingRows.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2 shrink-0">
              <History className="h-3.5 w-3.5" />
              Histórico (12m)
              <Badge variant="secondary" className="ml-1">
                {historyRows.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="tracking" className="gap-2 shrink-0">
              <CalendarRange className="h-3.5 w-3.5" />
              Seguimiento (12m)
              <Badge variant="secondary" className="ml-1">
                {trackingRows.length}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="upcoming">
          {upcomingRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 border border-dashed border-border rounded-lg text-center">
              <Wallet className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No hay cobros pendientes.</p>
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cliente</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Proyecto</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Concepto</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Tipo</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Vencimiento</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Importe</th>
                    <th className="px-4 py-3 w-36" />
                  </tr>
                </thead>
                <tbody>
                  {upcomingRows.map((row, i) => {
                    return (
                      <tr
                        key={row.id}
                        className={i % 2 === 0 ? "bg-background" : "bg-muted/10"}
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium truncate max-w-[220px]">{row.clientName}</p>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                          <span className="truncate inline-block max-w-[220px] align-bottom">
                            {row.projectName}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium truncate max-w-[230px]">{row.concept}</p>
                          <p className="text-xs text-muted-foreground">
                            {row.subInfo}
                          </p>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <Badge variant={row.source === "factura" ? "info" : "outline"}>
                            {row.source === "factura" ? "Factura" : "Mensualidad"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{formatDate(row.dueDateISO)}</p>
                          <p className="text-xs text-muted-foreground">
                            {row.daysDiff < 0
                              ? `Vencido hace ${Math.abs(row.daysDiff)} día${Math.abs(row.daysDiff) !== 1 ? "s" : ""}`
                              : row.daysDiff === 0
                                ? "Vence hoy"
                                : `En ${row.daysDiff} día${row.daysDiff !== 1 ? "s" : ""}`}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="font-semibold text-income">
                            {formatCurrency(row.amount, row.currency)}
                          </p>
                          {row.source === "mensualidad" && row.setupPending && (
                            <p className="text-xs text-muted-foreground">Incluye setup</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            {row.source === "mensualidad" && row.mensualidadId ? (
                              <RegisterPaymentButton
                                mensualidadId={row.mensualidadId}
                                dueDate={row.dueDateISO}
                              />
                            ) : row.invoiceId ? (
                              <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
                                <Link href={`/facturas/${row.invoiceId}`}>Ver factura</Link>
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history">
          {historyRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 border border-dashed border-border rounded-lg text-center">
              <History className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No hay cobros registrados todavía.</p>
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fecha</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cliente</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Proyecto</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Concepto</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Importe</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Origen</th>
                    <th className="px-4 py-3 w-24" />
                  </tr>
                </thead>
                <tbody>
                  {historyRows.map((row, i) => (
                    <tr
                      key={row.id}
                      className={i % 2 === 0 ? "bg-background" : "bg-muted/10"}
                    >
                      <td className="px-4 py-3">{formatDate(row.date)}</td>
                      <td className="px-4 py-3">{row.clientName}</td>
                      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                        {row.projectName}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                        {row.concept}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-income">
                        {formatCurrency(row.amount, row.currency)}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <Badge variant={row.source === "factura" ? "info" : "outline"}>
                          {row.badge}
                        </Badge>
                        {row.paymentMethod && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {paymentMethodLabel[row.paymentMethod]}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {row.source === "mensualidad" && row.paymentId ? (
                          <div className="flex items-center justify-end gap-1">
                            <EditPaymentButton
                              paymentId={row.paymentId}
                              paymentDate={row.date}
                              amount={row.amount}
                              paymentMethod={row.paymentMethod}
                              notes={row.paymentNotes}
                            />
                            <DeletePaymentButton paymentId={row.paymentId} />
                          </div>
                        ) : row.invoiceId ? (
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" asChild>
                            <Link href={`/facturas/${row.invoiceId}`}>Ver</Link>
                          </Button>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="tracking">
          {trackingRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 border border-dashed border-border rounded-lg text-center">
              <CalendarRange className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No hay vencimientos planificados en los próximos 12 meses.</p>
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Mes</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cliente</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Proyecto</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Concepto</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Tipo</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Estado</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {trackingRows.map((row, i) => (
                    <tr
                      key={row.id}
                      className={
                        row.daysDiff < 0
                          ? "bg-red-500/5"
                          : row.daysDiff <= 1
                            ? "bg-amber-500/8"
                            : i % 2 === 0
                              ? "bg-background"
                              : "bg-muted/10"
                      }
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium">{row.monthLabel}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(row.dueDateISO)}</p>
                      </td>
                      <td className="px-4 py-3">{row.clientName}</td>
                      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{row.projectName}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{row.concept}</p>
                        <p className="text-xs text-muted-foreground">{row.subInfo}</p>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <Badge variant={row.source === "factura" ? "info" : "outline"}>
                          {row.source === "factura" ? "Factura" : "Mensualidad"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {row.daysDiff < 0 ? (
                          <Badge variant="error">
                            Vencida hace {Math.abs(row.daysDiff)} día{Math.abs(row.daysDiff) !== 1 ? "s" : ""}
                          </Badge>
                        ) : row.daysDiff === 0 ? (
                          <Badge variant="warning">Vence hoy</Badge>
                        ) : row.daysDiff === 1 ? (
                          <Badge variant="warning">Vence en 1 día</Badge>
                        ) : (
                          <Badge variant="outline">
                            En {row.daysDiff} días
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-income">
                        {formatCurrency(row.amount, row.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
