import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils/currency";
import { PlusCircle, Users, Mail, Phone, ExternalLink } from "lucide-react";

export default async function ClientesPage() {
  const supabase = await createClient();

  const { data: clients } = await supabase
    .from("clients")
    .select("id,name,email,phone,company,status")
    .order("name");

  // Obtener métricas por cliente
  const clientIds = (clients ?? []).map((c) => c.id);

  const [projectsRes, invoicesRes] = clientIds.length > 0
    ? await Promise.all([
        supabase.from("projects").select("client_id, status").in("client_id", clientIds),
        supabase.from("invoices").select("client_id, total, status").in("client_id", clientIds),
      ])
    : [{ data: [] }, { data: [] }];

  const projectsByClient = (projectsRes.data ?? []).reduce<Record<string, any[]>>((acc, p) => {
    if (p.client_id) { acc[p.client_id] = acc[p.client_id] ?? []; acc[p.client_id].push(p); }
    return acc;
  }, {});

  const invoicesByClient = (invoicesRes.data ?? []).reduce<Record<string, any[]>>((acc, i) => {
    if (i.client_id) { acc[i.client_id] = acc[i.client_id] ?? []; acc[i.client_id].push(i); }
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {(clients ?? []).filter((c) => c.status === "active").length} clientes activos
        </p>
        <Button variant="gnerai" size="sm" asChild>
          <Link href="/clientes/nuevo">
            <PlusCircle className="h-4 w-4" />Nuevo cliente
          </Link>
        </Button>
      </div>

      {(clients ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-lg">
          <Users className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <p className="text-sm font-medium text-muted-foreground mb-4">No hay clientes todavía</p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/clientes/nuevo"><PlusCircle className="h-4 w-4 mr-2" />Añadir primer cliente</Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cliente</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Contacto</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Proyectos</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Facturado</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Estado</th>
                <th className="px-4 py-3 w-12" />
              </tr>
            </thead>
            <tbody>
              {(clients ?? []).map((client, i) => {
                const clientProjects = projectsByClient[client.id] ?? [];
                const activeProjects = clientProjects.filter((p) => p.status === "active").length;
                const clientInvoices = invoicesByClient[client.id] ?? [];
                const totalBilled = clientInvoices.reduce((s: number, inv: any) => s + (inv.total ?? 0), 0);
                const pendingInvoices = clientInvoices.filter((inv: any) => ["pending", "sent", "overdue"].includes(inv.status)).length;

                return (
                  <tr key={client.id} className={i % 2 === 0 ? "bg-background hover:bg-muted/30" : "bg-muted/10 hover:bg-muted/30"}>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{client.name}</p>
                        {client.company && <p className="text-xs text-muted-foreground">{client.company}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="space-y-0.5">
                        {client.email && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3 w-3" />{client.email}</div>}
                        {client.phone && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{client.phone}</div>}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-center">
                      <span className="font-medium">{activeProjects}</span>
                      <span className="text-muted-foreground">/{clientProjects.length}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="font-semibold">{formatCurrency(totalBilled)}</p>
                      {pendingInvoices > 0 && (
                        <p className="text-xs text-yellow-500">{pendingInvoices} pendiente{pendingInvoices > 1 ? "s" : ""}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={client.status === "active" ? "success" : "outline"}>
                        {client.status === "active" ? "Activo" : "Inactivo"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <Link href={`/clientes/${client.id}`}><ExternalLink className="h-4 w-4" /></Link>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
