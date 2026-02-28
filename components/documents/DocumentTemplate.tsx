import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/dates";
import { cn } from "@/lib/utils";
import type { Currency } from "@/types";

export interface DocumentTemplateProps {
  type: "invoice" | "quote";
  documentNumber: string;
  issueDate: string;
  dueDate?: string;
  validUntil?: string;
  status: string;

  issuerName: string;
  issuerTaxId?: string;
  issuerAddress?: string;
  issuerEmail?: string;
  issuerPhone?: string;
  issuerLogoUrl?: string;

  clientName: string;
  clientCompany?: string;
  clientTaxId?: string;
  clientAddress?: string;
  clientEmail?: string;

  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    tax_rate: number;
  }>;

  subtotal: number;
  taxAmount: number;
  irpfAmount: number;
  total: number;
  currency: Currency;
  taxRate: number;
  irpfRate: number;

  notes?: string;
  paymentMethod?: string;
  accentColor?: string;
  documentLanguage?: "es" | "en";
  isPdfMode?: boolean;
  hideStatusInPdf?: boolean;
}

const ES_LABELS = {
  invoice: "Factura",
  quote: "Presupuesto",
  status: "Estado",
  issueDate: "Emisión",
  dueDate: "Vencimiento",
  validUntil: "Válido hasta",
  issuer: "Emisor",
  client: "Cliente",
  description: "Descripción",
  quantity: "Cantidad",
  unitPrice: "Precio unit.",
  tax: "IVA",
  lineTotal: "Total línea",
  subtotal: "Subtotal",
  withholding: "IRPF",
  total: "Total",
  notes: "Notas",
  paymentMethod: "Método de pago",
  thanks: "Gracias por su confianza",
};

const EN_LABELS = {
  invoice: "Invoice",
  quote: "Quote",
  status: "Status",
  issueDate: "Issue date",
  dueDate: "Due date",
  validUntil: "Valid until",
  issuer: "Issuer",
  client: "Client",
  description: "Description",
  quantity: "Qty",
  unitPrice: "Unit price",
  tax: "Tax",
  lineTotal: "Line total",
  subtotal: "Subtotal",
  withholding: "Withholding",
  total: "Total",
  notes: "Notes",
  paymentMethod: "Payment method",
  thanks: "Thank you for your business",
};

function statusLabel(status: string, lang: "es" | "en"): string {
  const labelsEs: Record<string, string> = {
    draft: "Borrador",
    sent: "Enviado",
    accepted: "Aceptado",
    rejected: "Rechazado",
    expired: "Expirado",
    invoiced: "Facturado",
    pending: "Pendiente",
    paid: "Pagada",
    overdue: "Vencida",
    cancelled: "Cancelada",
  };

  const labelsEn: Record<string, string> = {
    draft: "Draft",
    sent: "Sent",
    accepted: "Accepted",
    rejected: "Rejected",
    expired: "Expired",
    invoiced: "Invoiced",
    pending: "Pending",
    paid: "Paid",
    overdue: "Overdue",
    cancelled: "Cancelled",
  };

  const source = lang === "en" ? labelsEn : labelsEs;
  return source[status] ?? status;
}

function statusClass(status: string): string {
  const classes: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700",
    sent: "bg-blue-100 text-blue-700",
    accepted: "bg-emerald-100 text-emerald-700",
    rejected: "bg-red-100 text-red-700",
    expired: "bg-amber-100 text-amber-700",
    invoiced: "bg-violet-100 text-violet-700",
    pending: "bg-amber-100 text-amber-700",
    paid: "bg-emerald-100 text-emerald-700",
    overdue: "bg-red-100 text-red-700",
    cancelled: "bg-slate-100 text-slate-700",
  };
  return classes[status] ?? "bg-slate-100 text-slate-700";
}

export function DocumentTemplate({
  type,
  documentNumber,
  issueDate,
  dueDate,
  validUntil,
  status,
  issuerName,
  issuerTaxId,
  issuerAddress,
  issuerEmail,
  issuerPhone,
  issuerLogoUrl,
  clientName,
  clientCompany,
  clientTaxId,
  clientAddress,
  clientEmail,
  items,
  subtotal,
  taxAmount,
  irpfAmount,
  total,
  currency,
  taxRate,
  irpfRate,
  notes,
  paymentMethod,
  accentColor = "#3b82f6",
  documentLanguage = "es",
  isPdfMode = false,
  hideStatusInPdf = true,
}: DocumentTemplateProps) {
  const labels = documentLanguage === "en" ? EN_LABELS : ES_LABELS;
  const typeLabel = type === "invoice" ? labels.invoice : labels.quote;
  const showStatus = !(isPdfMode && hideStatusInPdf);
  const resolvedIssuerLogoUrl = issuerLogoUrl || "/logo-mark.svg";

  return (
    <div
      className={cn(
        "mx-auto w-full bg-white font-sans text-slate-900",
        isPdfMode ? "max-w-none p-8" : "rounded-xl border border-border/70 p-6 shadow-sm"
      )}
      style={{ borderTop: `4px solid ${accentColor}` }}
    >
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <img
              src={resolvedIssuerLogoUrl}
              alt="Logo"
              className="h-12 w-12 rounded-md border border-slate-200 object-contain"
            />
            <p className="text-2xl font-semibold tracking-tight" style={{ color: accentColor }}>
              {issuerName || "Mi empresa"}
            </p>
          </div>
          <div className="mt-2 space-y-1 text-sm text-slate-600">
            {issuerTaxId && <p>NIF/CIF: {issuerTaxId}</p>}
            {issuerAddress && <p>{issuerAddress}</p>}
            {issuerEmail && <p>{issuerEmail}</p>}
            {issuerPhone && <p>{issuerPhone}</p>}
          </div>
        </div>

        <div className="space-y-2 sm:text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{typeLabel}</p>
          <p className="font-mono text-base font-semibold">{documentNumber || "Sin número"}</p>
          {showStatus ? (
            <span
              className={cn(
                "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                statusClass(status)
              )}
            >
              {statusLabel(status, documentLanguage)}
            </span>
          ) : null}
          <div className="space-y-1 text-xs text-slate-500">
            <p>
              {labels.issueDate}: {issueDate ? formatDate(issueDate) : "-"}
            </p>
            {type === "invoice" ? (
              <p>
                {labels.dueDate}: {dueDate ? formatDate(dueDate) : "-"}
              </p>
            ) : (
              <p>
                {labels.validUntil}: {validUntil ? formatDate(validUntil) : "-"}
              </p>
            )}
          </div>
        </div>
      </header>

      <section className="grid gap-6 py-6 sm:grid-cols-2">
        <div className="space-y-2 text-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            {labels.issuer}
          </p>
          <p className="font-medium">{issuerName || "Mi empresa"}</p>
          {issuerTaxId && <p className="text-slate-600">{issuerTaxId}</p>}
          {issuerAddress && <p className="text-slate-600 whitespace-pre-wrap">{issuerAddress}</p>}
          {issuerEmail && <p className="text-slate-600">{issuerEmail}</p>}
          {issuerPhone && <p className="text-slate-600">{issuerPhone}</p>}
        </div>

        <div className="space-y-2 text-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            {labels.client}
          </p>
          <p className="font-medium">{clientName || "Cliente"}</p>
          {clientCompany && <p className="text-slate-600">{clientCompany}</p>}
          {clientTaxId && <p className="text-slate-600">{clientTaxId}</p>}
          {clientAddress && <p className="text-slate-600 whitespace-pre-wrap">{clientAddress}</p>}
          {clientEmail && <p className="text-slate-600">{clientEmail}</p>}
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs uppercase tracking-[0.08em] text-slate-500">
              <th className="px-3 py-2.5 font-semibold">{labels.description}</th>
              <th className="px-3 py-2.5 text-right font-semibold">{labels.quantity}</th>
              <th className="px-3 py-2.5 text-right font-semibold">{labels.unitPrice}</th>
              <th className="px-3 py-2.5 text-right font-semibold">{labels.tax} %</th>
              <th className="px-3 py-2.5 text-right font-semibold">{labels.lineTotal}</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-sm text-slate-500">
                  -
                </td>
              </tr>
            ) : (
              items.map((item, index) => {
                const lineBase = item.quantity * item.unit_price;
                const lineTotal = lineBase + lineBase * (item.tax_rate / 100);
                return (
                  <tr key={`${item.description}-${index}`} className="border-t border-slate-100">
                    <td className="px-3 py-2.5 align-top text-slate-700">{item.description}</td>
                    <td className="px-3 py-2.5 text-right align-top">{item.quantity}</td>
                    <td className="px-3 py-2.5 text-right align-top">
                      {formatCurrency(item.unit_price, currency)}
                    </td>
                    <td className="px-3 py-2.5 text-right align-top">{item.tax_rate}%</td>
                    <td className="px-3 py-2.5 text-right align-top font-medium">
                      {formatCurrency(lineTotal, currency)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>

      <section className="mt-6 grid gap-6 sm:grid-cols-[1fr_320px]">
        <div className="space-y-3 text-sm text-slate-600">
          {notes ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                {labels.notes}
              </p>
              <p className="mt-1 whitespace-pre-wrap">{notes}</p>
            </div>
          ) : null}
          {paymentMethod ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                {labels.paymentMethod}
              </p>
              <p className="mt-1">{paymentMethod}</p>
            </div>
          ) : null}
          <p className="pt-3 text-xs text-slate-500">{labels.thanks}</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-slate-600">
              <span>{labels.subtotal}</span>
              <span>{formatCurrency(subtotal, currency)}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>
                {labels.tax} ({taxRate.toFixed(2)}%)
              </span>
              <span>{formatCurrency(taxAmount, currency)}</span>
            </div>
            {irpfRate > 0 ? (
              <div className="flex items-center justify-between text-slate-600">
                <span>
                  {labels.withholding} ({irpfRate.toFixed(2)}%)
                </span>
                <span>-{formatCurrency(irpfAmount, currency)}</span>
              </div>
            ) : null}
            <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 text-base font-semibold">
              <span>{labels.total}</span>
              <span>{formatCurrency(total, currency)}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
