import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DocumentTemplate } from "@/components/documents/DocumentTemplate";
import { DocumentPdfDownloadButton } from "@/components/documents/DocumentPdfDownloadButton";
import { QuoteActionButtons } from "@/components/presupuestos/QuoteActionButtons";
import { DeleteQuoteButton } from "@/components/presupuestos/DeleteQuoteButton";
import { computeDocumentTotals, getDocumentItemsWithFallback } from "@/lib/utils/documents";
import { buildDocumentFilename } from "@/lib/utils/pdf";
import { QUOTE_STATUS_BADGE, QUOTE_STATUS_LABELS } from "@/lib/utils/quotes";
import type { Quote, QuoteStatus, UserSettings } from "@/types";

interface Props {
  params: { id: string };
}

export default async function PresupuestoDetailPage({ params }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [quoteRes, settingsRes] = await Promise.all([
    supabase
      .from("quotes")
      .select("*, client:clients(*)")
      .eq("id", params.id)
      .single(),
    user?.id
      ? supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (quoteRes.error || !quoteRes.data) notFound();

  const quote = quoteRes.data as Quote;
  const status = quote.status as QuoteStatus;
  const items = getDocumentItemsWithFallback(
    quote.items,
    quote.concept,
    quote.amount,
    quote.tax_rate
  );
  const totals = computeDocumentTotals(items, quote.tax_rate, quote.irpf_rate);
  const settings = (settingsRes.data as UserSettings | null) ?? null;
  const clientName =
    quote.client?.name ??
    quote.potential_client_name ??
    quote.potential_client_company ??
    "Cliente potencial";

  const templateProps = {
    type: "quote" as const,
    documentNumber: quote.quote_number,
    issueDate: quote.issue_date,
    validUntil: quote.valid_until ?? undefined,
    status: quote.status,
    issuerName: settings?.company_name || "Mi empresa",
    issuerTaxId: settings?.company_tax_id || undefined,
    issuerAddress: settings?.company_address || undefined,
    issuerEmail: settings?.company_email || undefined,
    issuerPhone: settings?.company_phone || undefined,
    issuerLogoUrl: settings?.company_logo_url || undefined,
    clientName,
    clientCompany: quote.client?.company ?? quote.potential_client_company ?? undefined,
    clientTaxId: quote.client?.nif ?? quote.potential_client_tax_id ?? undefined,
    clientAddress: quote.client?.address ?? quote.potential_client_address ?? undefined,
    clientEmail: quote.client?.email ?? quote.potential_client_email ?? undefined,
    items,
    subtotal: totals.subtotal,
    taxAmount: totals.taxAmount,
    irpfAmount: totals.irpfAmount,
    total: totals.total,
    currency: quote.currency,
    taxRate: totals.effectiveTaxRate,
    irpfRate: quote.irpf_rate,
    notes: quote.notes ?? undefined,
    accentColor: settings?.accent_color || "#3b82f6",
    documentLanguage: settings?.document_language || "es",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start gap-3">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8">
          <Link href="/presupuestos">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold font-mono">{quote.quote_number}</h1>
            <Badge variant={QUOTE_STATUS_BADGE[status]}>{QUOTE_STATUS_LABELS[status]}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{clientName}</p>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          <DocumentPdfDownloadButton
            templateProps={templateProps}
            filename={buildDocumentFilename(quote.quote_number, clientName)}
            className="w-full sm:w-auto"
          />
          <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
            <Link href={`/presupuestos/${quote.id}/editar`}>
              <Pencil className="h-4 w-4" />
              Editar
            </Link>
          </Button>
          <DeleteQuoteButton quoteId={quote.id} />
        </div>
      </div>

      <QuoteActionButtons
        quoteId={quote.id}
        status={quote.status}
        convertedInvoiceId={quote.converted_to_invoice_id}
      />

      <DocumentTemplate {...templateProps} />

      {quote.internal_notes && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Notas internas</p>
            <p className="mt-1 text-sm whitespace-pre-wrap">{quote.internal_notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
