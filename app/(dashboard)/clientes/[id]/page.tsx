import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/currency";
import { planMrr } from "@/lib/utils/saas";
import { ArrowLeft, Pencil, Mail, Phone, Building2, FileText, FolderKanban, RefreshCw } from "lucide-react";
import { MensualidadesManager } from "@/components/mensualidades/MensualidadesManager";
import { DeleteClientButton } from "@/components/clientes/DeleteClientButton";
import type { Mensualidad, Project } from "@/types";

interface Props {
  params: { id: string };
  searchParams?: { invoicePage?: string };
}

const INVOICES_PAGE_SIZE = 20;

export default async function ClienteDetailPage({ params, searchParams }: Props) {
  const supabase = await createClient();
  const parsedInvoicePage = Number.parseInt(searchParams?.invoicePage ?? "1", 10);
  const invoicePage = Number.isFinite(parsedInvoicePage) && parsedInvoicePage > 0 ? parsedInvoicePage : 1;
  const invoiceFrom = (invoicePage - 1) * INVOICES_PAGE_SIZE;
  const invoiceTo = invoiceFrom + INVOICES_PAGE_SIZE - 1;

  const [clientRes, projectsRes, invoicesSummaryRes, invoicesRes, mensualidadesRes] = await Promise.all([
    supabase
      .from("clients")
      .select("id,name,email,phone,company,nif,address,status,notes")
      .eq("id", params.id)
      .single(),
    supabase
      .from("projects")
      .select("id,name,status,budget,currency")
      .eq("client_id", params.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("invoices")
      .select("total,status")
      .eq("client_id", params.id),
    supabase
      .from("invoices")
      .select("id,invoice_number,concept,total,currency,status,due_date", { count: "exact" })
      .eq("client_id", params.id)
      .order("issue_date", { ascending: false })
      .range(invoiceFrom, invoiceTo),
    supabase
      .from("mensualidades")
      .select("id,client_id,project_id,name,billing_type,fee,setup_fee,currency,status,start_date,end_date,notes,created_at,client:clients(id,name,company),project:projects(id,name)")
      .eq("client_id", params.id)
      .order("created_at"),
  ]);

  if (clientRes.error || !clientRes.data) notFound();

  const client = clientRes.data;
  const projects = (projectsRes.data ?? []) as Project[];
  const invoices = invoicesRes.data ?? [];
  const invoicesSummary = invoicesSummaryRes.data ?? [];
  const invoicesTotalCount = invoicesRes.count ?? 0;
  const mensualidades = (mensualidadesRes.data ?? []) as Mensualidad[];

  const totalBilled = invoicesSummary.reduce((sum, invoice) => sum + (invoice.total ?? 0), 0);
  const pendingInvoices = invoicesSummary.filter((invoice) =>
    ["pending", "sent", "overdue"].includes(invoice.status)
  );
  const totalInvoicePages = Math.max(1, Math.ceil(invoicesTotalCount / INVOICES_PAGE_SIZE));
  const canGoToPrevInvoicesPage = invoicePage > 1;
  const canGoToNextInvoicesPage = invoicePage < totalInvoicePages;
  const invoicesRangeStart = invoicesTotalCount === 0 ? 0 : invoiceFrom + 1;
  const invoicesRangeEnd = invoiceFrom + invoices.length;
  const getInvoicePageHref = (page: number) => {
    if (page <= 1) return "";
    return `?invoicePage=${page}`;
  };

  // MRR del cliente
  const activeMensualidades = mensualidades.filter((m) => m.status === "active");
  const mrr = activeMensualidades.reduce((sum, m) => sum + planMrr(m as any), 0);

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8">
          <Link href="/clientes"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{client.name}</h1>
            <Badge variant={client.status === "active" ? "success" : "outline"}>
              {client.status === "active" ? "Activo" : "Inactivo"}
            </Badge>
          </div>
          {client.company && <p className="text-sm text-muted-foreground">{client.company}</p>}
          {mrr > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              MRR: <span className="text-income font-medium">{formatCurrency(mrr)}</span>
              {" · "}{activeMensualidades.length} mensualidad{activeMensualidades.length !== 1 ? "es" : ""} activa{activeMensualidades.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/clientes/${client.id}/editar`}><Pencil className="h-4 w-4 mr-2" />Editar</Link>
          </Button>
          <DeleteClientButton clientId={client.id} />
        </div>
      </div>

      {/* Info de contacto + KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="sm:col-span-2">
          <CardContent className="pt-6 space-y-2">
            {client.email && <div className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-muted-foreground" />{client.email}</div>}
            {client.phone && <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-muted-foreground" />{client.phone}</div>}
            {client.nif && <div className="flex items-center gap-2 text-sm"><Building2 className="h-4 w-4 text-muted-foreground" />{client.nif}</div>}
            {client.address && <div className="text-sm text-muted-foreground">{client.address}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Total facturado</p>
            <p className="text-xl font-bold text-income">{formatCurrency(totalBilled)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Pendiente de cobro</p>
            <p className="text-xl font-bold text-pending">
              {formatCurrency(pendingInvoices.reduce((s, i) => s + (i.total ?? 0), 0))}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Mensualidades — el proyecto es OPCIONAL */}
      <div>
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Mensualidades
          {mensualidades.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">({mensualidades.length})</span>
          )}
        </h2>
        <MensualidadesManager
          mensualidades={mensualidades}
          clientId={client.id}
          availableProjects={projects}
          currency="EUR"
        />
      </div>

      {/* Proyectos */}
      {projects.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <FolderKanban className="h-4 w-4" /> Proyectos ({projects.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {projects.map((p) => (
              <Link key={p.id} href={`/proyectos/${p.id}`} className="block rounded-lg border border-border p-4 hover:border-primary/40 transition-colors">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{p.name}</p>
                  <Badge variant={p.status === "active" ? "success" : p.status === "completed" ? "info" : "outline"}>
                    {p.status === "active" ? "Activo" : p.status === "completed" ? "Completado" : p.status}
                  </Badge>
                </div>
                {p.budget && <p className="text-sm text-muted-foreground mt-1">Presupuesto: {formatCurrency(p.budget, p.currency)}</p>}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Facturas */}
      {invoicesTotalCount > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4" /> Facturas ({invoicesTotalCount})
          </h2>
          <div className="rounded-lg border border-border overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Número</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Concepto</th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground">Total</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Estado</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv, i) => (
                  <tr key={inv.id} className={i % 2 === 0 ? "bg-background" : "bg-muted/10"}>
                    <td className="px-4 py-2.5 font-mono text-xs">{inv.invoice_number}</td>
                    <td className="px-4 py-2.5 truncate max-w-xs text-muted-foreground">{inv.concept}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-income">{formatCurrency(inv.total, inv.currency)}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant={inv.status === "paid" ? "success" : inv.status === "overdue" ? "error" : "warning"}>
                        {inv.status === "paid" ? "Pagada" : inv.status === "overdue" ? "Vencida" : "Pendiente"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Mostrando {invoicesRangeStart}-{invoicesRangeEnd} de {invoicesTotalCount}
            </p>
            <div className="flex items-center gap-2">
              {canGoToPrevInvoicesPage ? (
                <Button variant="outline" size="sm" asChild>
                  <Link href={getInvoicePageHref(invoicePage - 1)}>Anterior</Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  Anterior
                </Button>
              )}
              <span className="text-xs text-muted-foreground">
                Página {invoicePage} / {totalInvoicePages}
              </span>
              {canGoToNextInvoicesPage ? (
                <Button variant="outline" size="sm" asChild>
                  <Link href={getInvoicePageHref(invoicePage + 1)}>Siguiente</Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  Siguiente
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {client.notes && (
        <div className="rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">Notas</p>
          <p className="text-sm">{client.notes}</p>
        </div>
      )}
    </div>
  );
}
