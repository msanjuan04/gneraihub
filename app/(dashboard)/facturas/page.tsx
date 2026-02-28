import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate, isOverdue } from "@/lib/utils/dates";
import { PlusCircle, FileText, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { MarkInvoicePaidButton } from "@/components/facturas/MarkInvoicePaidButton";
import { ExportMenu } from "@/components/shared/ExportMenu";

const invoiceStatusConfig: Record<string, { label: string; variant: any }> = {
  pending: { label: "Pendiente", variant: "warning" },
  sent: { label: "Enviada", variant: "info" },
  paid: { label: "Pagada", variant: "success" },
  overdue: { label: "Vencida", variant: "error" },
  cancelled: { label: "Cancelada", variant: "outline" },
};

interface FacturasPageProps {
  searchParams?: {
    status?: string | string[];
  };
}

export default async function FacturasPage({ searchParams }: FacturasPageProps) {
  const supabase = await createClient();
  const rawStatus = searchParams?.status;
  const requestedStatus = Array.isArray(rawStatus) ? rawStatus[0] : rawStatus;
  const validStatuses = new Set(Object.keys(invoiceStatusConfig));
  const activeStatusFilter = requestedStatus && validStatuses.has(requestedStatus)
    ? requestedStatus
    : undefined;

  let invoicesQuery = supabase
    .from("invoices")
    .select("id,invoice_number,concept,amount,tax_rate,irpf_rate,total,currency,issue_date,due_date,status,payment_method,client:clients(name)")
    .order("due_date", { ascending: false });

  if (activeStatusFilter) {
    invoicesQuery = invoicesQuery.eq("status", activeStatusFilter);
  }

  const { data: invoices } = await invoicesQuery;

  const allInvoices = (invoices ?? []) as any[];
  const exportRows = allInvoices.map((invoice) => ({
    numero: invoice.invoice_number,
    cliente: invoice.client?.name ?? "",
    concepto: invoice.concept ?? "",
    importe: invoice.amount ?? 0,
    iva: invoice.tax_rate ?? 0,
    irpf: invoice.irpf_rate ?? 0,
    total: invoice.total ?? 0,
    fecha_emision: invoice.issue_date ?? "",
    fecha_vencimiento: invoice.due_date ?? "",
    estado: invoice.status ?? "",
    metodo_pago: invoice.payment_method ?? "",
  }));

  // KPIs de facturas
  const pendingTotal = allInvoices
    .filter((i) => ["pending", "sent"].includes(i.status))
    .reduce((s, i) => s + (i.total ?? 0), 0);

  const overdueTotal = allInvoices
    .filter((i) => i.status === "overdue")
    .reduce((s, i) => s + (i.total ?? 0), 0);

  const paidThisMonth = (() => {
    const now = new Date();
    return allInvoices
      .filter((i) => {
        if (i.status !== "paid") return false;
        const d = new Date(i.issue_date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, i) => s + (i.total ?? 0), 0);
  })();

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Por cobrar</p>
            <p className="text-xl font-bold text-income">{formatCurrency(pendingTotal)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {allInvoices.filter((i) => ["pending", "sent"].includes(i.status)).length} facturas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-red-500" /> Vencidas
            </p>
            <p className="text-xl font-bold text-expense">{formatCurrency(overdueTotal)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {allInvoices.filter((i) => i.status === "overdue").length} facturas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Cobrado este mes</p>
            <p className="text-xl font-bold text-income">{formatCurrency(paidThisMonth)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Header tabla */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-muted-foreground">{allInvoices.length} facturas en total</p>
          {activeStatusFilter && (
            <Badge variant={invoiceStatusConfig[activeStatusFilter]?.variant ?? "outline"}>
              Filtro: {invoiceStatusConfig[activeStatusFilter]?.label ?? activeStatusFilter}
            </Badge>
          )}
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          <ExportMenu
            data={exportRows}
            filename="facturas"
            sheetName="Facturas"
            buttonClassName="w-full sm:w-auto"
          />
          <Button variant="gnerai" size="sm" className="w-full sm:w-auto" asChild>
            <Link href="/facturas/nueva">
              <PlusCircle className="h-4 w-4" />Nueva factura
            </Link>
          </Button>
        </div>
      </div>

      {/* Tabla de facturas */}
      {allInvoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-lg">
          <FileText className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <p className="text-sm font-medium text-muted-foreground mb-4">No hay facturas todavía</p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/facturas/nueva"><PlusCircle className="h-4 w-4 mr-2" />Crear primera factura</Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Número</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cliente</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Concepto</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Vencimiento</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Estado</th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody>
              {allInvoices.map((inv, i) => {
                const sc = invoiceStatusConfig[inv.status] ?? { label: inv.status, variant: "outline" };
                const overdue = isOverdue(inv.due_date) && ["pending", "sent"].includes(inv.status);

                return (
                  <tr key={inv.id} className={i % 2 === 0 ? "bg-background hover:bg-muted/30" : "bg-muted/10 hover:bg-muted/30"}>
                    <td className="px-4 py-3 font-mono text-xs">
                      <Link href={`/facturas/${inv.id}`} className="hover:text-primary transition-colors">
                        {inv.invoice_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium truncate">{inv.client?.name ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground truncate max-w-xs">{inv.concept}</td>
                    <td className="px-4 py-3 text-right font-semibold text-income">
                      {formatCurrency(inv.total, inv.currency)}
                    </td>
                    <td className={`px-4 py-3 hidden sm:table-cell ${overdue ? "text-red-500" : "text-muted-foreground"}`}>
                      {overdue && <AlertTriangle className="inline h-3.5 w-3.5 mr-1" />}
                      {formatDate(inv.due_date)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={sc.variant}>{sc.label}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {["pending", "sent", "overdue"].includes(inv.status) && (
                        <MarkInvoicePaidButton invoiceId={inv.id} amount={inv.total} />
                      )}
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
