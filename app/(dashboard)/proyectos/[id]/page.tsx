import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, calcMargin } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/dates";
import { planMrr } from "@/lib/utils/saas";
import { ArrowLeft, Pencil, FileText, Receipt, Zap, RefreshCw } from "lucide-react";
import { MensualidadesManager } from "@/components/mensualidades/MensualidadesManager";
import { SaasPlansManager } from "@/components/proyectos/SaasPlansManager";
import { SaasSubscriptionsManager } from "@/components/proyectos/SaasSubscriptionsManager";
import { DeleteProjectButton } from "@/components/proyectos/DeleteProjectButton";
import type {
  Mensualidad,
  Client,
  Currency,
  SaasPlan,
  SaasSubscription,
} from "@/types";

interface Props {
  params: { id: string };
  searchParams?: { invoicePage?: string; expensePage?: string };
}

const DETAIL_TABLE_PAGE_SIZE = 20;

export default async function ProyectoDetailPage({ params, searchParams }: Props) {
  const supabase = await createClient();
  const parsedInvoicePage = Number.parseInt(searchParams?.invoicePage ?? "1", 10);
  const parsedExpensePage = Number.parseInt(searchParams?.expensePage ?? "1", 10);
  const invoicePage = Number.isFinite(parsedInvoicePage) && parsedInvoicePage > 0 ? parsedInvoicePage : 1;
  const expensePage = Number.isFinite(parsedExpensePage) && parsedExpensePage > 0 ? parsedExpensePage : 1;
  const invoiceFrom = (invoicePage - 1) * DETAIL_TABLE_PAGE_SIZE;
  const invoiceTo = invoiceFrom + DETAIL_TABLE_PAGE_SIZE - 1;
  const expenseFrom = (expensePage - 1) * DETAIL_TABLE_PAGE_SIZE;
  const expenseTo = expenseFrom + DETAIL_TABLE_PAGE_SIZE - 1;

  const [projectRes, invoicesRes, expensesRes, incomeRes, expenseTotalsRes, mensualidadesRes, clientsRes, saasPlansRes, saasSubsRes] =
    await Promise.all([
      supabase
        .from("projects")
        .select("id,name,status,is_saas,budget,currency,client:clients(id,name)")
        .eq("id", params.id)
        .single(),
      supabase
        .from("invoices")
        .select("id,invoice_number,concept,total,currency,due_date,status", { count: "exact" })
        .eq("project_id", params.id)
        .order("issue_date", { ascending: false })
        .range(invoiceFrom, invoiceTo),
      supabase
        .from("expense_transactions")
        .select("id,name,category,amount,currency,date", { count: "exact" })
        .eq("project_id", params.id)
        .order("date", { ascending: false })
        .range(expenseFrom, expenseTo),
      supabase
        .from("income_transactions")
        .select("amount")
        .eq("project_id", params.id),
      supabase
        .from("expense_transactions")
        .select("amount")
        .eq("project_id", params.id),
      supabase
        .from("mensualidades")
        .select("id,client_id,project_id,name,billing_type,fee,setup_fee,currency,status,start_date,end_date,notes,created_at,client:clients(id,name,company),project:projects(id,name)")
        .eq("project_id", params.id)
        .order("created_at"),
      supabase.from("clients").select("id,name,company,status").order("name"),
      supabase
        .from("saas_plans")
        .select("id,project_id,name,billing_type,fee,setup_fee,currency,description,created_at")
        .eq("project_id", params.id)
        .order("created_at"),
      supabase
        .from("saas_subscriptions")
        .select(
          "id,project_id,client_id,plan_id,status,start_date,end_date,is_free,created_at,client:clients(id,name,company,status),plan:saas_plans(id,name,billing_type,fee,setup_fee,currency,description)"
        )
        .eq("project_id", params.id)
        .order("created_at"),
    ]);

  if (projectRes.error || !projectRes.data) notFound();

  const project = projectRes.data as any;
  const invoices = invoicesRes.data ?? [];
  const expenses = expensesRes.data ?? [];
  const income = incomeRes.data ?? [];
  const expenseTotals = expenseTotalsRes.data ?? [];
  const invoicesTotalCount = invoicesRes.count ?? 0;
  const expensesTotalCount = expensesRes.count ?? 0;
  const mensualidades = (mensualidadesRes.data ?? []) as Mensualidad[];
  const allClients = (clientsRes.data ?? []) as Client[];
  const saasPlans = (saasPlansRes.data ?? []) as SaasPlan[];
  const saasSubs = (saasSubsRes.data ?? []) as Array<
    SaasSubscription & { client: Client; plan: SaasPlan | null }
  >;
  const subscribedClientIds = new Set(saasSubs.map((s) => s.client_id));
  const availableClientsForSaas = allClients.filter((c) => !subscribedClientIds.has(c.id));
  const invoiceTotalPages = Math.max(1, Math.ceil(invoicesTotalCount / DETAIL_TABLE_PAGE_SIZE));
  const expenseTotalPages = Math.max(1, Math.ceil(expensesTotalCount / DETAIL_TABLE_PAGE_SIZE));
  const canGoToPrevInvoicePage = invoicePage > 1;
  const canGoToNextInvoicePage = invoicePage < invoiceTotalPages;
  const canGoToPrevExpensePage = expensePage > 1;
  const canGoToNextExpensePage = expensePage < expenseTotalPages;
  const invoicesRangeStart = invoicesTotalCount === 0 ? 0 : invoiceFrom + 1;
  const invoicesRangeEnd = invoiceFrom + invoices.length;
  const expensesRangeStart = expensesTotalCount === 0 ? 0 : expenseFrom + 1;
  const expensesRangeEnd = expenseFrom + expenses.length;
  const getPageHref = (kind: "invoice" | "expense", page: number) => {
    const query = new URLSearchParams();
    const nextInvoicePage = kind === "invoice" ? page : invoicePage;
    const nextExpensePage = kind === "expense" ? page : expensePage;
    if (nextInvoicePage > 1) query.set("invoicePage", String(nextInvoicePage));
    if (nextExpensePage > 1) query.set("expensePage", String(nextExpensePage));
    const q = query.toString();
    return q ? `?${q}` : "";
  };

  const totalIncome = income.reduce((sum: number, tx: any) => sum + (tx.amount ?? 0), 0);
  const totalExpenses = expenseTotals.reduce((sum: number, tx: any) => sum + (tx.amount ?? 0), 0);
  const margin = calcMargin(totalIncome, totalExpenses);

  // MRR calculado desde mensualidades activas
  const activeMensualidades = mensualidades.filter((m) => m.status === "active");
  const mensualidadesMrr = activeMensualidades.reduce(
    (sum, m) => sum + planMrr(m as any),
    0
  );
  const activeSaasSubs = saasSubs.filter((s) => s.status === "active");
  const saasMrr = activeSaasSubs.reduce(
    (sum, s) => sum + (!s.is_free && s.plan ? planMrr(s.plan) : 0),
    0
  );

  const recurringCount = project.is_saas ? activeSaasSubs.length : activeMensualidades.length;
  const recurringMrr = project.is_saas ? saasMrr : mensualidadesMrr;

  const statusConfig: Record<string, any> = {
    active: { label: "Activo", variant: "success" },
    paused: { label: "Pausado", variant: "warning" },
    completed: { label: "Completado", variant: "info" },
    cancelled: { label: "Cancelado", variant: "error" },
  };
  const sc = statusConfig[project.status] ?? { label: project.status, variant: "outline" };

  const hasRecurring =
    project.is_saas ? saasPlans.length > 0 || saasSubs.length > 0 : mensualidades.length > 0;

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8">
          <Link href="/proyectos"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold">{project.name}</h1>
            {project.is_saas && (
              <Badge variant="outline" className="gap-1 border-primary/40 text-primary">
                <Zap className="h-3 w-3" />SaaS
              </Badge>
            )}
            <Badge variant={sc.variant}>{sc.label}</Badge>
          </div>
          {project.client?.name && !project.is_saas && (
            <p className="text-sm text-muted-foreground">{project.client.name}</p>
          )}
          {hasRecurring && (
            <p className="text-sm text-muted-foreground">
              {project.is_saas ? (
                <>
                  {activeSaasSubs.length} suscriptor{activeSaasSubs.length !== 1 ? "es" : ""} activo{activeSaasSubs.length !== 1 ? "s" : ""}
                </>
              ) : (
                <>
                  {activeMensualidades.length} mensualidad{activeMensualidades.length !== 1 ? "es" : ""} activa{activeMensualidades.length !== 1 ? "s" : ""}
                </>
              )}
              {recurringMrr > 0 && (
                <> · MRR: <span className="text-income font-medium">{formatCurrency(recurringMrr, project.currency)}</span></>
              )}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/proyectos/${project.id}/editar`}>
              <Pencil className="h-4 w-4 mr-2" />Editar
            </Link>
          </Button>
          <DeleteProjectButton projectId={project.id} />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-4">
        {hasRecurring ? (
          <>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">
                  {project.is_saas ? "Suscriptores activos" : "Mensualidades activas"}
                </p>
                <p className="text-lg font-bold">{recurringCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">MRR</p>
                <p className="text-lg font-bold text-income">{formatCurrency(recurringMrr, project.currency)}</p>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Presupuesto</p>
              <p className="text-lg font-bold">
                {project.budget ? formatCurrency(project.budget, project.currency) : "—"}
              </p>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Ingresos reales</p>
            <p className="text-lg font-bold text-income">{formatCurrency(totalIncome, project.currency)}</p>
          </CardContent>
        </Card>
        {!hasRecurring && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Gastos asignados</p>
              <p className="text-lg font-bold text-expense">{formatCurrency(totalExpenses, project.currency)}</p>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Margen real</p>
            <p className={`text-lg font-bold ${margin >= 0 ? "text-income" : "text-expense"}`}>
              {margin.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        {hasRecurring && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Gastos asignados</p>
              <p className="text-lg font-bold text-expense">{formatCurrency(totalExpenses, project.currency)}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue={project.is_saas ? "suscriptores" : "mensualidades"}>
        <TabsList>
          {project.is_saas ? (
            <>
              <TabsTrigger value="planes" className="gap-2">
                <RefreshCw className="h-3.5 w-3.5" />
                Planes ({saasPlans.length})
              </TabsTrigger>
              <TabsTrigger value="suscriptores" className="gap-2">
                <Zap className="h-3.5 w-3.5" />
                Suscriptores ({saasSubs.length})
              </TabsTrigger>
            </>
          ) : (
              <TabsTrigger value="mensualidades" className="gap-2">
                <RefreshCw className="h-3.5 w-3.5" />
                Mensualidades ({mensualidades.length})
              </TabsTrigger>
          )}
          <TabsTrigger value="facturas" className="gap-2">
            <FileText className="h-3.5 w-3.5" /> Facturas ({invoicesTotalCount})
          </TabsTrigger>
          <TabsTrigger value="gastos" className="gap-2">
            <Receipt className="h-3.5 w-3.5" /> Gastos ({expensesTotalCount})
          </TabsTrigger>
        </TabsList>

        {!project.is_saas && (
          <TabsContent value="mensualidades" className="mt-4">
            <MensualidadesManager
              mensualidades={mensualidades}
              projectId={project.id}
              availableClients={allClients}
              currency={project.currency as Currency}
            />
          </TabsContent>
        )}

        {project.is_saas && (
          <>
            <TabsContent value="planes" className="mt-4">
              <SaasPlansManager
                projectId={project.id}
                plans={saasPlans}
                currency={project.currency as Currency}
              />
            </TabsContent>
            <TabsContent value="suscriptores" className="mt-4">
              <SaasSubscriptionsManager
                projectId={project.id}
                subscriptions={saasSubs as any}
                plans={saasPlans}
                availableClients={availableClientsForSaas}
                currency={project.currency as Currency}
              />
            </TabsContent>
          </>
        )}

        {/* Tab Facturas */}
        <TabsContent value="facturas">
          {invoicesTotalCount === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground border border-dashed border-border rounded-lg mt-4">
              No hay facturas para este proyecto
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <div className="rounded-lg border border-border overflow-x-auto">
                <table className="w-full min-w-[680px] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Número</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Concepto</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Vencimiento</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv: any, i: number) => (
                      <tr key={inv.id} className={i % 2 === 0 ? "bg-background" : "bg-muted/10"}>
                        <td className="px-4 py-3 font-mono text-xs">{inv.invoice_number}</td>
                        <td className="px-4 py-3 truncate max-w-xs">{inv.concept}</td>
                        <td className="px-4 py-3 text-right font-semibold text-income">
                          {formatCurrency(inv.total, inv.currency)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(inv.due_date)}</td>
                        <td className="px-4 py-3">
                          <Badge variant={inv.status === "paid" ? "success" : inv.status === "overdue" ? "error" : "warning"}>
                            {inv.status === "paid" ? "Pagada" : inv.status === "overdue" ? "Vencida" : "Pendiente"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  Mostrando {invoicesRangeStart}-{invoicesRangeEnd} de {invoicesTotalCount}
                </p>
                <div className="flex items-center gap-2">
                  {canGoToPrevInvoicePage ? (
                    <Button size="sm" variant="outline" asChild>
                      <Link href={getPageHref("invoice", invoicePage - 1)}>Anterior</Link>
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" disabled>
                      Anterior
                    </Button>
                  )}
                  <span className="text-xs text-muted-foreground">
                    Página {invoicePage} / {invoiceTotalPages}
                  </span>
                  {canGoToNextInvoicePage ? (
                    <Button size="sm" variant="outline" asChild>
                      <Link href={getPageHref("invoice", invoicePage + 1)}>Siguiente</Link>
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" disabled>
                      Siguiente
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Tab Gastos */}
        <TabsContent value="gastos">
          {expensesTotalCount === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground border border-dashed border-border rounded-lg mt-4">
              No hay gastos asignados a este proyecto
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <div className="rounded-lg border border-border overflow-x-auto">
                <table className="w-full min-w-[680px] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nombre</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Categoría</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Importe</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((exp: any, i: number) => (
                      <tr key={exp.id} className={i % 2 === 0 ? "bg-background" : "bg-muted/10"}>
                        <td className="px-4 py-3 font-medium">{exp.name}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="font-normal">{exp.category ?? "—"}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-expense">
                          {formatCurrency(exp.amount, exp.currency)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(exp.date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  Mostrando {expensesRangeStart}-{expensesRangeEnd} de {expensesTotalCount}
                </p>
                <div className="flex items-center gap-2">
                  {canGoToPrevExpensePage ? (
                    <Button size="sm" variant="outline" asChild>
                      <Link href={getPageHref("expense", expensePage - 1)}>Anterior</Link>
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" disabled>
                      Anterior
                    </Button>
                  )}
                  <span className="text-xs text-muted-foreground">
                    Página {expensePage} / {expenseTotalPages}
                  </span>
                  {canGoToNextExpensePage ? (
                    <Button size="sm" variant="outline" asChild>
                      <Link href={getPageHref("expense", expensePage + 1)}>Siguiente</Link>
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" disabled>
                      Siguiente
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
