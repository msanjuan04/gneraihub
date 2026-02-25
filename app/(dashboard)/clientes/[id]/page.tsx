import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/dates";
import { planMrr } from "@/lib/utils/saas";
import { ArrowLeft, Pencil, Mail, Phone, Building2, FileText, FolderKanban, RefreshCw } from "lucide-react";
import { MensualidadesManager } from "@/components/mensualidades/MensualidadesManager";
import type { Mensualidad, Project, Currency } from "@/types";

interface Props { params: { id: string } }

export default async function ClienteDetailPage({ params }: Props) {
  const supabase = await createClient();

  const [clientRes, projectsRes, invoicesRes, mensualidadesRes] = await Promise.all([
    supabase.from("clients").select("*").eq("id", params.id).single(),
    supabase.from("projects").select("*").eq("client_id", params.id).order("created_at", { ascending: false }),
    supabase.from("invoices").select("*").eq("client_id", params.id).order("issue_date", { ascending: false }),
    supabase
      .from("mensualidades")
      .select("*, client:clients(*), project:projects(id,name)")
      .eq("client_id", params.id)
      .order("created_at"),
  ]);

  if (clientRes.error || !clientRes.data) notFound();

  const client = clientRes.data;
  const projects = (projectsRes.data ?? []) as Project[];
  const invoices = invoicesRes.data ?? [];
  const mensualidades = (mensualidadesRes.data ?? []) as Mensualidad[];

  const totalBilled = invoices.reduce((s, i) => s + (i.total ?? 0), 0);
  const pendingInvoices = invoices.filter((i) => ["pending", "sent", "overdue"].includes(i.status));

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
        <Button variant="outline" size="sm" asChild>
          <Link href={`/clientes/${client.id}/editar`}><Pencil className="h-4 w-4 mr-2" />Editar</Link>
        </Button>
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
      {invoices.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4" /> Facturas ({invoices.length})
          </h2>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
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
