import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/dates";
import { computeDocumentTotals, getDocumentItemsWithFallback } from "@/lib/utils/documents";
import { buildDocumentFilename } from "@/lib/utils/pdf";
import { DocumentTemplate } from "@/components/documents/DocumentTemplate";
import { DocumentPdfDownloadButton } from "@/components/documents/DocumentPdfDownloadButton";
import { MarkInvoicePaidButton } from "@/components/facturas/MarkInvoicePaidButton";
import { DeleteInvoiceButton } from "@/components/facturas/DeleteInvoiceButton";
import type { UserSettings } from "@/types";

const statusConfig: Record<string, any> = {
  pending: { label: "Pendiente", variant: "warning" },
  sent: { label: "Enviada", variant: "info" },
  paid: { label: "Pagada", variant: "success" },
  overdue: { label: "Vencida", variant: "error" },
  cancelled: { label: "Cancelada", variant: "outline" },
};

interface Props {
  params: { id: string };
}

export default async function FacturaDetailPage({ params }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [invoiceRes, settingsRes] = await Promise.all([
    supabase
      .from("invoices")
      .select("*, client:clients(*), project:projects(*)")
      .eq("id", params.id)
      .single(),
    user?.id
      ? supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (invoiceRes.error || !invoiceRes.data) notFound();

  const invoice = invoiceRes.data as any;
  const settings = (settingsRes.data as UserSettings | null) ?? null;
  const convertedFromQuoteId = invoice.converted_from_quote_id as string | null | undefined;

  let convertedFromQuoteNumber: string | null = null;
  if (convertedFromQuoteId) {
    const { data: quoteData } = await supabase
      .from("quotes")
      .select("quote_number")
      .eq("id", convertedFromQuoteId)
      .maybeSingle();
    convertedFromQuoteNumber = quoteData?.quote_number ?? null;
  }

  const sc = statusConfig[invoice.status] ?? { label: invoice.status, variant: "outline" };
  const items = getDocumentItemsWithFallback(invoice.items, invoice.concept, invoice.amount, invoice.tax_rate);
  const totals = computeDocumentTotals(items, invoice.tax_rate, invoice.irpf_rate);
  const clientName = invoice.client?.name ?? "Cliente";

  const templateProps = {
    type: "invoice" as const,
    documentNumber: invoice.invoice_number,
    issueDate: invoice.issue_date,
    dueDate: invoice.due_date,
    status: invoice.status,
    issuerName: settings?.company_name || "Mi empresa",
    issuerTaxId: settings?.company_tax_id || undefined,
    issuerAddress: settings?.company_address || undefined,
    issuerEmail: settings?.company_email || undefined,
    issuerPhone: settings?.company_phone || undefined,
    issuerLogoUrl: settings?.company_logo_url || undefined,
    clientName,
    clientCompany: invoice.client?.company ?? undefined,
    clientTaxId: invoice.client_tax_id ?? invoice.client?.nif ?? undefined,
    clientAddress: invoice.client_address ?? invoice.client?.address ?? undefined,
    clientEmail: invoice.client?.email ?? undefined,
    items,
    subtotal: totals.subtotal,
    taxAmount: totals.taxAmount,
    irpfAmount: totals.irpfAmount,
    total: totals.total,
    currency: invoice.currency,
    taxRate: totals.effectiveTaxRate,
    irpfRate: invoice.irpf_rate ?? 0,
    notes: invoice.notes ?? undefined,
    paymentMethod: invoice.payment_method ?? undefined,
    accentColor: settings?.accent_color || "#3b82f6",
    documentLanguage: settings?.document_language || "es",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start gap-3">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8">
          <Link href="/facturas">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold font-mono">{invoice.invoice_number}</h1>
            <Badge variant={sc.variant}>{sc.label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {clientName} · {formatCurrency(invoice.total, invoice.currency)} · Vence {formatDate(invoice.due_date)}
          </p>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          <DocumentPdfDownloadButton
            templateProps={templateProps}
            filename={buildDocumentFilename(invoice.invoice_number, clientName)}
            className="w-full sm:w-auto"
          />
          <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
            <Link href={`/facturas/${invoice.id}/editar`}>
              <Pencil className="h-4 w-4" />
              Editar
            </Link>
          </Button>
          {invoice.status !== "paid" && invoice.status !== "cancelled" ? (
            <MarkInvoicePaidButton invoiceId={invoice.id} amount={invoice.total} className="w-full sm:w-auto" />
          ) : null}
          <DeleteInvoiceButton invoiceId={invoice.id} />
        </div>
      </div>

      {convertedFromQuoteId ? (
        <Card className="border-violet-200 bg-violet-50">
          <CardContent className="pt-5">
            <p className="text-sm text-violet-700">
              Generada desde Presupuesto{" "}
              <Link href={`/presupuestos/${convertedFromQuoteId}`} className="font-semibold underline">
                {convertedFromQuoteNumber ?? convertedFromQuoteId}
              </Link>
            </p>
          </CardContent>
        </Card>
      ) : null}

      <DocumentTemplate {...templateProps} />
    </div>
  );
}
