import Link from "next/link";
import { PlusCircle, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/dates";
import { QUOTE_STATUS_BADGE, QUOTE_STATUS_LABELS } from "@/lib/utils/quotes";
import type { Quote, QuoteStatus } from "@/types";
import { ExportMenu } from "@/components/shared/ExportMenu";
import { DeleteQuoteButton } from "@/components/presupuestos/DeleteQuoteButton";

type QuoteRow = Pick<
  Quote,
  | "id"
  | "quote_number"
  | "status"
  | "concept"
  | "total"
  | "currency"
  | "issue_date"
  | "valid_until"
  | "potential_client_name"
  | "potential_client_company"
  | "converted_to_invoice_id"
> & {
  client?: { name: string } | null;
};

export default async function PresupuestosPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("quotes")
    .select(
      "id,quote_number,status,concept,total,currency,issue_date,valid_until,potential_client_name,potential_client_company,converted_to_invoice_id,client:clients(name),updated_at"
    )
    .order("issue_date", { ascending: false });

  const quotes = (data ?? []) as Array<QuoteRow & { updated_at: string }>;
  const pendingTotal = quotes
    .filter((quote) => quote.status === "draft" || quote.status === "sent")
    .reduce((sum, quote) => sum + (quote.total ?? 0), 0);

  const now = new Date();
  const acceptedThisMonth = quotes
    .filter((quote) => {
      if (quote.status !== "accepted") return false;
      const d = new Date(quote.updated_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, quote) => sum + (quote.total ?? 0), 0);

  const acceptedOrInvoiced = quotes.filter((quote) =>
    quote.status === "accepted" || quote.status === "invoiced"
  ).length;
  const convertedCount = quotes.filter((quote) => quote.status === "invoiced").length;
  const conversionRate = acceptedOrInvoiced > 0 ? (convertedCount / acceptedOrInvoiced) * 100 : 0;
  const exportRows = quotes.map((quote) => ({
    numero: quote.quote_number,
    cliente:
      quote.client?.name ??
      quote.potential_client_name ??
      quote.potential_client_company ??
      "Cliente potencial",
    concepto: quote.concept ?? "",
    total: quote.total ?? 0,
    estado: quote.status ?? "",
    fecha_emision: quote.issue_date ?? "",
    valido_hasta: quote.valid_until ?? "",
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Pendientes (draft + sent)</p>
            <p className="text-xl font-bold">{formatCurrency(pendingTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Aceptados este mes</p>
            <p className="text-xl font-bold text-income">{formatCurrency(acceptedThisMonth)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Tasa de conversión</p>
            <p className="text-xl font-bold">{conversionRate.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-700">
        Los presupuestos son informativos y no impactan cashflow, dashboard ni transacciones reales.
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{quotes.length} presupuestos</p>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          <ExportMenu
            data={exportRows}
            filename="presupuestos"
            sheetName="Presupuestos"
            buttonClassName="w-full sm:w-auto"
          />
          <Button variant="gnerai" size="sm" className="w-full sm:w-auto" asChild>
            <Link href="/presupuestos/nuevo">
              <PlusCircle className="h-4 w-4" />
              Nuevo presupuesto
            </Link>
          </Button>
        </div>
      </div>

      {quotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-center">
          <FileText className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">No hay presupuestos todavía</p>
          <p className="mt-1 text-xs text-muted-foreground/80">
            Crea el primero para gestionar propuestas comerciales
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-x-auto">
          <table className="w-full min-w-[780px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Número</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cliente</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Concepto</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Estado</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Fecha</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Válido hasta</th>
                <th className="px-4 py-3 w-48" />
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote, index) => {
                const status = quote.status as QuoteStatus;
                const clientName =
                  quote.client?.name ??
                  quote.potential_client_name ??
                  quote.potential_client_company ??
                  "Cliente potencial";

                return (
                  <tr
                    key={quote.id}
                    className={index % 2 === 0 ? "bg-background" : "bg-muted/10"}
                  >
                    <td className="px-4 py-3 font-mono text-xs">
                      <Link href={`/presupuestos/${quote.id}`} className="hover:text-primary">
                        {quote.quote_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{clientName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{quote.concept}</td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatCurrency(quote.total, quote.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={QUOTE_STATUS_BADGE[status]}>
                        {QUOTE_STATUS_LABELS[status]}
                      </Badge>
                      {status === "invoiced" && quote.converted_to_invoice_id ? (
                        <p className="mt-1 text-xs">
                          <Link
                            href={`/facturas/${quote.converted_to_invoice_id}`}
                            className="text-violet-600 hover:underline"
                          >
                            Ver factura
                          </Link>
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(quote.issue_date)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {quote.valid_until ? formatDate(quote.valid_until) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" asChild>
                          <Link href={`/presupuestos/${quote.id}`}>Ver</Link>
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/presupuestos/${quote.id}/editar`}>Editar</Link>
                        </Button>
                        <DeleteQuoteButton quoteId={quote.id} compact />
                      </div>
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
