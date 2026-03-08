import Link from "next/link";
import {
  startOfMonth,
  startOfYear,
  format,
  addDays,
  differenceInCalendarDays,
  parseISO,
  isValid,
  isBefore,
  startOfDay,
  endOfDay,
} from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Wallet, CalendarClock } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/dates";
import { getNextMensualidadDue, getMensualidadDueInRange } from "@/lib/utils/mensualidades";
import { BILLING_TYPE_LABELS } from "@/lib/utils/saas";
import { IncomeRowActions } from "@/components/ingresos/IncomeRowActions";
import {
  DeletePaymentButton,
  EditPaymentButton,
  RegisterPaymentButton,
} from "@/components/pagos/PaymentActionButtons";
import { ExportMenu } from "@/components/shared/ExportMenu";
import type { Currency } from "@/types";

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default async function IngresosPage() {
  const supabase = await createClient();
  const now = new Date();
  const today = startOfDay(now);
  const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
  const yearStart = format(startOfYear(now), "yyyy-MM-dd");
  const trackingEnd = endOfDay(addDays(today, 365));

  const [
    transactionsRes,
    monthRes,
    yearRes,
    clientsRes,
    projectsRes,
    mensualidadesRes,
    paymentsScheduleRes,
    overdueInvoicesRes,
    upcomingInvoicesRes,
  ] = await Promise.all([
    supabase
      .from("income_transactions")
      .select(
        "id,invoice_id,client_id,project_id,concept,amount,currency,date,payment_method,notes,is_manual,invoice:invoices(id,invoice_number),client:clients(id,name),project:projects(id,name)"
      )
      .order("date", { ascending: false }),
    supabase.from("income_transactions").select("amount").gte("date", monthStart),
    supabase.from("income_transactions").select("amount").gte("date", yearStart),
    supabase.from("clients").select("id,name").order("name"),
    supabase.from("projects").select("id,name,client_id").order("name"),
    supabase
      .from("mensualidades")
      .select(
        "id,client_id,project_id,name,billing_type,fee,setup_fee,currency,status,start_date,end_date,created_at,client:clients(id,name,company),project:projects(id,name)"
      )
      .eq("status", "active")
      .order("created_at", { ascending: false }),
    supabase
      .from("mensualidad_payments")
      .select("mensualidad_id,payment_date,is_setup")
      .gte("payment_date", format(addDays(today, -730), "yyyy-MM-dd")),
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
      .lte("due_date", format(trackingEnd, "yyyy-MM-dd"))
      .order("due_date", { ascending: true }),
  ]);

  const transactions = (transactionsRes.data ?? []) as any[];
  const clients = (clientsRes.data ?? []) as Array<{ id: string; name: string }>;
  const projects = (projectsRes.data ?? []) as Array<{ id: string; name: string; client_id?: string | null }>;
  const mensualidades = (mensualidadesRes.data ?? []) as any[];
  const paymentsSchedule = (paymentsScheduleRes.data ?? []) as { mensualidad_id: string; payment_date: string; is_setup: boolean }[];
  const invoicesUpcoming = [
    ...(overdueInvoicesRes.data ?? []),
    ...(upcomingInvoicesRes.data ?? []),
  ] as any[];

  const paymentsByMensualidad = paymentsSchedule.reduce<
    Record<string, { payment_date: string; is_setup: boolean }[]>
  >((acc, p) => {
    acc[p.mensualidad_id] = acc[p.mensualidad_id] ?? [];
    acc[p.mensualidad_id].push({ payment_date: p.payment_date, is_setup: p.is_setup });
    return acc;
  }, {});

  const mensualidadUpcoming = mensualidades
    .map((m) => {
      const due = getNextMensualidadDue(m, paymentsByMensualidad[m.id] ?? []);
      if (!due) return null;
      const dueDateISO = due.dueDate.toISOString().split("T")[0];
      const daysDiff = differenceInCalendarDays(due.dueDate, today);
      const client = firstRelation(m.client);
      const project = firstRelation(m.project);
      return {
        id: `mensualidad-${m.id}`,
        source: "mensualidad" as const,
        clientName: client?.name ?? "—",
        projectName: project?.name ?? "Sin proyecto",
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
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const invoiceUpcoming = invoicesUpcoming
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
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const upcomingRows = [...mensualidadUpcoming, ...invoiceUpcoming].sort(
    (a, b) => a.dueDate.getTime() - b.dueDate.getTime()
  );

  const totalMonth = (monthRes.data ?? []).reduce((sum, row) => sum + (row.amount ?? 0), 0);
  const totalYear = (yearRes.data ?? []).reduce((sum, row) => sum + (row.amount ?? 0), 0);

  const monthlyAverage = (() => {
    if ((yearRes.data ?? []).length === 0) return 0;
    const monthsElapsed = now.getMonth() + 1;
    return totalYear / monthsElapsed;
  })();

  const exportRows = transactions.map((row) => {
    const invoice = firstRelation(row.invoice);
    const client = firstRelation(row.client);
    const project = firstRelation(row.project);
    return {
      concepto: row.concept ?? "",
      cliente: client?.name ?? "",
      proyecto: project?.name ?? "",
      importe: row.amount ?? 0,
      divisa: row.currency ?? "EUR",
      fecha: row.date ?? "",
      metodo_pago: row.payment_method ?? "",
      origen: invoice?.invoice_number ? `Factura ${invoice.invoice_number}` : "Manual",
    };
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Total ingresos este mes</p>
            <p className="text-xl font-bold text-income">{formatCurrency(totalMonth)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Total ingresos este año</p>
            <p className="text-xl font-bold text-income">{formatCurrency(totalYear)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Media mensual</p>
            <p className="text-xl font-bold">{formatCurrency(monthlyAverage)}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="ingresos" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
            <TabsTrigger value="ingresos" className="gap-2 shrink-0">
              <Wallet className="h-3.5 w-3.5" />
              Histórico de ingresos
              <Badge variant="secondary" className="ml-1">
                {transactions.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="proximos" className="gap-2 shrink-0">
              <CalendarClock className="h-3.5 w-3.5" />
              Próximos cobros
              <Badge variant="secondary" className="ml-1">
                {upcomingRows.length}
              </Badge>
            </TabsTrigger>
          </TabsList>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            <ExportMenu
              data={exportRows}
              filename="ingresos"
              sheetName="Ingresos"
              buttonClassName="w-full sm:w-auto"
            />
            <Button variant="gnerai" size="sm" className="w-full sm:w-auto" asChild>
              <Link href="/ingresos/nuevo">
                <PlusCircle className="h-4 w-4" />
                Nuevo ingreso
              </Link>
            </Button>
          </div>
        </div>

        <TabsContent value="ingresos" className="space-y-4">
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-center">
              <Wallet className="mb-4 h-12 w-12 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">No hay ingresos todavía</p>
              <p className="mt-1 text-xs text-muted-foreground/80">
                Registra cobros manuales o marca facturas como pagadas
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Concepto</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cliente</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Proyecto</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Importe</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Fecha</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Método</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Origen</th>
                    <th className="px-4 py-3 w-24" />
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((row, index) => {
                    const invoice = firstRelation(row.invoice);
                    const client = firstRelation(row.client);
                    const project = firstRelation(row.project);
                    const isManual = !!row.is_manual && !row.invoice_id;
                    return (
                      <tr key={row.id} className={index % 2 === 0 ? "bg-background" : "bg-muted/10"}>
                        <td className="px-4 py-3">{row.concept}</td>
                        <td className="px-4 py-3">{client?.name ?? "—"}</td>
                        <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{project?.name ?? "—"}</td>
                        <td className="px-4 py-3 text-right font-semibold text-income">
                          {formatCurrency(row.amount, row.currency)}
                        </td>
                        <td className="px-4 py-3">{formatDate(row.date)}</td>
                        <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                          {row.payment_method ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          {invoice?.invoice_number ? (
                            <Badge variant="info" className="gap-1">
                              <Link href={`/facturas/${invoice.id}`}>Factura {invoice.invoice_number}</Link>
                            </Badge>
                          ) : (
                            <Badge variant="outline">Manual</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isManual ? (
                            <IncomeRowActions
                              income={{
                                id: row.id,
                                concept: row.concept,
                                amount: row.amount,
                                currency: row.currency,
                                date: row.date,
                                payment_method: row.payment_method,
                                notes: row.notes,
                                client_id: row.client_id,
                                project_id: row.project_id,
                                is_manual: true,
                              }}
                              clients={clients}
                              projects={projects}
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="proximos" className="space-y-4">
          {upcomingRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 rounded-lg border border-dashed border-border text-center">
              <CalendarClock className="h-10 w-10 text-muted-foreground/40 mb-3" />
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
                  {upcomingRows.map((row, i) => (
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
                        <p className="text-xs text-muted-foreground">{row.subInfo}</p>
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
                        {"setupPending" in row && row.setupPending && (
                          <p className="text-xs text-muted-foreground">Incluye setup</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          {"mensualidadId" in row && row.mensualidadId ? (
                            <RegisterPaymentButton
                              mensualidadId={row.mensualidadId}
                              dueDate={row.dueDateISO}
                            />
                          ) : "invoiceId" in row && row.invoiceId ? (
                            <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
                              <Link href={`/facturas/${row.invoiceId}`}>Ver factura</Link>
                            </Button>
                          ) : null}
                        </div>
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
