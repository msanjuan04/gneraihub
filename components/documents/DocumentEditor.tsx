"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, PlusCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentTemplate } from "@/components/documents/DocumentTemplate";
import { DocumentPdfDownloadButton } from "@/components/documents/DocumentPdfDownloadButton";
import { createInvoice, updateInvoice } from "@/app/(dashboard)/facturas/actions";
import {
  createQuote,
  updateQuote,
} from "@/app/(dashboard)/presupuestos/actions";
import {
  computeDocumentTotals,
  getDocumentItemsWithFallback,
  sanitizeDocumentItems,
} from "@/lib/utils/documents";
import { buildDocumentFilename } from "@/lib/utils/pdf";
import type {
  Client,
  Currency,
  Invoice,
  PaymentMethod,
  Project,
  Quote,
  QuoteStatus,
  UserSettings,
} from "@/types";

const itemSchema = z.object({
  description: z.string().trim().default(""),
  quantity: z.coerce.number().min(0).default(1),
  unit_price: z.coerce.number().min(0).default(0),
  tax_rate: z.coerce.number().min(0).max(100).default(21),
});

const editorSchema = z.object({
  documentNumber: z.string().min(1, "El número del documento es obligatorio"),
  clientMode: z.enum(["existing", "potential"]).default("existing"),
  clientId: z.string().optional().default(""),
  potentialClientName: z.string().optional().default(""),
  potentialClientEmail: z.string().optional().default(""),
  potentialClientCompany: z.string().optional().default(""),
  potentialClientTaxId: z.string().optional().default(""),
  potentialClientAddress: z.string().optional().default(""),
  clientTaxId: z.string().optional().default(""),
  clientAddress: z.string().optional().default(""),
  projectId: z.string().optional().default(""),
  concept: z.string().trim().default(""),
  items: z.array(itemSchema).default([]),
  currency: z.enum(["EUR", "USD", "GBP"]).default("EUR"),
  taxRate: z.coerce.number().min(0).max(100).default(21),
  irpfRate: z.coerce.number().min(0).max(100).default(0),
  issueDate: z.string().min(1, "La fecha de emisión es obligatoria"),
  dueDate: z.string().optional().default(""),
  validUntil: z.string().optional().default(""),
  status: z.string().default("draft"),
  paymentMethod: z.enum(["", "card", "transfer", "direct_debit", "cash", "otro"]).default(""),
  notes: z.string().optional().default(""),
  internalNotes: z.string().optional().default(""),
});

type DocumentEditorValues = z.infer<typeof editorSchema>;

interface DocumentEditorProps {
  type: "invoice" | "quote";
  clients: Client[];
  projects?: Project[];
  issuer: UserSettings | null;
  initialDocumentNumber: string;
  invoice?: Invoice;
  quote?: Quote;
}

const quoteStatusOptions: Array<{ value: QuoteStatus; label: string }> = [
  { value: "draft", label: "Borrador" },
  { value: "sent", label: "Enviado" },
  { value: "accepted", label: "Aceptado" },
  { value: "rejected", label: "Rechazado" },
  { value: "expired", label: "Expirado" },
  { value: "invoiced", label: "Facturado" },
];

const invoiceStatusOptions: Array<{ value: Invoice["status"]; label: string }> = [
  { value: "pending", label: "Pendiente" },
  { value: "sent", label: "Enviada" },
  { value: "paid", label: "Pagada" },
  { value: "overdue", label: "Vencida" },
  { value: "cancelled", label: "Cancelada" },
];

const paymentMethodOptions: Array<{ value: Exclude<PaymentMethod, never>; label: string }> = [
  { value: "transfer", label: "Transferencia" },
  { value: "card", label: "Tarjeta" },
  { value: "direct_debit", label: "Domiciliación" },
  { value: "cash", label: "Efectivo" },
  { value: "otro", label: "Otro" },
];

function normalizeDateValue(value?: string | null): string {
  if (!value) return "";
  return value.slice(0, 10);
}

export function DocumentEditor({
  type,
  clients,
  projects = [],
  issuer,
  initialDocumentNumber,
  invoice,
  quote,
}: DocumentEditorProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const isEditing = type === "invoice" ? !!invoice : !!quote;

  const selectedSource = type === "invoice" ? invoice : quote;
  const initialItems = useMemo(
    () =>
      getDocumentItemsWithFallback(
        selectedSource?.items,
        selectedSource?.concept,
        type === "invoice" ? invoice?.amount : quote?.amount,
        selectedSource?.tax_rate
      ),
    [invoice?.amount, quote?.amount, selectedSource?.concept, selectedSource?.items, selectedSource?.tax_rate, type]
  );

  const defaultValues: DocumentEditorValues = {
    documentNumber:
      (type === "invoice" ? invoice?.invoice_number : quote?.quote_number) ??
      initialDocumentNumber,
    clientMode:
      type === "invoice"
        ? "existing"
        : quote?.client_id
          ? "existing"
          : "potential",
    clientId:
      (type === "invoice" ? invoice?.client_id : quote?.client_id) ?? "",
    potentialClientName: quote?.potential_client_name ?? "",
    potentialClientEmail: quote?.potential_client_email ?? "",
    potentialClientCompany: quote?.potential_client_company ?? "",
    potentialClientTaxId: quote?.potential_client_tax_id ?? "",
    potentialClientAddress: quote?.potential_client_address ?? "",
    clientTaxId:
      (type === "invoice" ? invoice?.client_tax_id : undefined) ??
      quote?.potential_client_tax_id ??
      "",
    clientAddress:
      (type === "invoice" ? invoice?.client_address : undefined) ??
      quote?.potential_client_address ??
      "",
    projectId: type === "invoice" ? invoice?.project_id ?? "" : "",
    concept: selectedSource?.concept ?? "",
    items: initialItems.length > 0 ? initialItems : [{ description: "", quantity: 1, unit_price: 0, tax_rate: 21 }],
    currency: (selectedSource?.currency ?? "EUR") as Currency,
    taxRate: selectedSource?.tax_rate ?? 21,
    irpfRate: selectedSource?.irpf_rate ?? 0,
    issueDate: normalizeDateValue(selectedSource?.issue_date) || new Date().toISOString().slice(0, 10),
    dueDate: normalizeDateValue(invoice?.due_date),
    validUntil: normalizeDateValue(quote?.valid_until),
    status: selectedSource?.status ?? (type === "invoice" ? "pending" : "draft"),
    paymentMethod: (type === "invoice" ? invoice?.payment_method : null) ?? "",
    notes: selectedSource?.notes ?? "",
    internalNotes: quote?.internal_notes ?? "",
  };

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<DocumentEditorValues>({
    resolver: zodResolver(editorSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const watched = useWatch({ control });
  const selectedClient = clients.find((client) => client.id === watched.clientId);
  const selectedProject = projects.find((project) => project.id === watched.projectId);
  const watchedItems = sanitizeDocumentItems(watched.items ?? []);
  const itemsForPreview =
    watchedItems.length > 0
      ? watchedItems
      : getDocumentItemsWithFallback([], watched.concept, 0, watched.taxRate);
  const totals = computeDocumentTotals(itemsForPreview, watched.taxRate, watched.irpfRate);
  const previewClientName =
    watched.clientMode === "existing"
      ? selectedClient?.name ?? "Cliente"
      : watched.potentialClientName || watched.potentialClientCompany || "Cliente potencial";
  const previewClientCompany =
    watched.clientMode === "existing"
      ? selectedClient?.company ?? undefined
      : watched.potentialClientCompany || undefined;
  const previewClientTaxId =
    watched.clientMode === "existing"
      ? watched.clientTaxId || selectedClient?.nif || undefined
      : watched.potentialClientTaxId || undefined;
  const previewClientAddress =
    watched.clientMode === "existing"
      ? watched.clientAddress || selectedClient?.address || undefined
      : watched.potentialClientAddress || undefined;
  const previewClientEmail =
    watched.clientMode === "existing"
      ? selectedClient?.email || undefined
      : watched.potentialClientEmail || undefined;
  const documentFilename = buildDocumentFilename(
    watched.documentNumber,
    previewClientName || "cliente"
  );

  const handleSave = async (values: DocumentEditorValues) => {
    const items = sanitizeDocumentItems(values.items);
    if (items.length === 0) {
      toast.error("Debes añadir al menos una línea válida");
      return;
    }

    const concept = values.concept.trim() || items[0]?.description || "";
    if (!concept) {
      toast.error("Añade un concepto o una descripción de línea");
      return;
    }

    const computed = computeDocumentTotals(items, values.taxRate, values.irpfRate);

    if (type === "invoice" && !values.clientId) {
      toast.error("Selecciona un cliente para la factura");
      return;
    }

    if (type === "quote" && values.clientMode === "potential" && !values.potentialClientName?.trim()) {
      toast.error("Indica al menos el nombre del cliente potencial");
      return;
    }

    setLoading(true);
    try {
      if (type === "invoice") {
        const payload = {
          invoice_number: values.documentNumber,
          client_id: values.clientId,
          project_id: values.projectId || null,
          concept,
          amount: computed.subtotal,
          tax_rate: computed.effectiveTaxRate,
          irpf_rate: values.irpfRate,
          currency: values.currency,
          issue_date: values.issueDate,
          due_date: values.dueDate || values.issueDate,
          status: values.status as Invoice["status"],
          payment_method: (values.paymentMethod || null) as PaymentMethod | null,
          notes: values.notes || null,
          items,
          client_address: values.clientAddress || null,
          client_tax_id: values.clientTaxId || null,
        };

        const result = isEditing && invoice
          ? await updateInvoice(invoice.id, payload)
          : await createInvoice(payload as any);

        if (!result.success) {
          toast.error("Error al guardar la factura", { description: result.error });
          return;
        }

        const invoiceId = invoice?.id ?? result.data?.id;
        toast.success(isEditing ? "Factura actualizada" : "Factura creada");
        if (invoiceId) {
          router.push(`/facturas/${invoiceId}`);
        } else {
          router.push("/facturas");
        }
        router.refresh();
        return;
      }

      const quotePayload = {
        quote_number: values.documentNumber,
        status: values.status as QuoteStatus,
        client_id: values.clientMode === "existing" ? values.clientId || null : null,
        potential_client_name:
          values.clientMode === "potential" ? values.potentialClientName || null : null,
        potential_client_email:
          values.clientMode === "potential" ? values.potentialClientEmail || null : null,
        potential_client_company:
          values.clientMode === "potential" ? values.potentialClientCompany || null : null,
        potential_client_tax_id:
          values.clientMode === "potential" ? values.potentialClientTaxId || null : null,
        potential_client_address:
          values.clientMode === "potential" ? values.potentialClientAddress || null : null,
        concept,
        items,
        amount: computed.subtotal,
        tax_rate: computed.effectiveTaxRate,
        irpf_rate: values.irpfRate,
        total: computed.total,
        currency: values.currency,
        issue_date: values.issueDate,
        valid_until: values.validUntil || null,
        notes: values.notes || null,
        internal_notes: values.internalNotes || null,
      };

      const result = isEditing && quote
        ? await updateQuote(quote.id, quotePayload)
        : await createQuote(quotePayload);

      if (!result.success) {
        toast.error("Error al guardar el presupuesto", { description: result.error });
        return;
      }

      const quoteId = quote?.id ?? result.data?.id;
      toast.success(isEditing ? "Presupuesto actualizado" : "Presupuesto creado");
      if (quoteId) {
        router.push(`/presupuestos/${quoteId}`);
      } else {
        router.push("/presupuestos");
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const backHref = type === "invoice" ? "/facturas" : "/presupuestos";
  const statusOptions = type === "invoice" ? invoiceStatusOptions : quoteStatusOptions;
  const showExistingClientToggle = type === "quote";

  const editorContent = (
    <form onSubmit={handleSubmit(handleSave)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos del documento</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="documentNumber">Número *</Label>
            <Input id="documentNumber" {...register("documentNumber")} />
            {errors.documentNumber && (
              <p className="text-xs text-destructive">{errors.documentNumber.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Estado</Label>
            <Select
              defaultValue={defaultValues.status}
              onValueChange={(value) => setValue("status", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="issueDate">Fecha de emisión *</Label>
            <Input id="issueDate" type="date" {...register("issueDate")} />
          </div>

          {type === "invoice" ? (
            <div className="space-y-2">
              <Label htmlFor="dueDate">Fecha de vencimiento *</Label>
              <Input id="dueDate" type="date" {...register("dueDate")} />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="validUntil">Válido hasta</Label>
              <Input id="validUntil" type="date" {...register("validUntil")} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cliente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {showExistingClientToggle && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant={watched.clientMode === "existing" ? "default" : "outline"}
                size="sm"
                onClick={() => setValue("clientMode", "existing")}
              >
                Cliente existente
              </Button>
              <Button
                type="button"
                variant={watched.clientMode === "potential" ? "default" : "outline"}
                size="sm"
                onClick={() => setValue("clientMode", "potential")}
              >
                Cliente potencial
              </Button>
            </div>
          )}

          {(type === "invoice" || watched.clientMode === "existing") ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <Select
                  defaultValue={defaultValues.clientId || undefined}
                  onValueChange={(value) => setValue("clientId", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {type === "invoice" && (
                <div className="space-y-2">
                  <Label>Proyecto</Label>
                  <Select
                    defaultValue={defaultValues.projectId || "none"}
                    onValueChange={(value) => setValue("projectId", value === "none" ? "" : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sin proyecto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin proyecto</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="clientTaxId">NIF/CIF</Label>
                <Input id="clientTaxId" {...register("clientTaxId")} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="clientAddress">Dirección</Label>
                <Input id="clientAddress" {...register("clientAddress")} />
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="potentialClientName">Nombre *</Label>
                <Input id="potentialClientName" {...register("potentialClientName")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="potentialClientCompany">Empresa</Label>
                <Input id="potentialClientCompany" {...register("potentialClientCompany")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="potentialClientEmail">Email</Label>
                <Input id="potentialClientEmail" {...register("potentialClientEmail")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="potentialClientTaxId">NIF/CIF</Label>
                <Input id="potentialClientTaxId" {...register("potentialClientTaxId")} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="potentialClientAddress">Dirección</Label>
                <Input id="potentialClientAddress" {...register("potentialClientAddress")} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Líneas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Descripción</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Cantidad</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Precio</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">IVA %</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Total</th>
                  <th className="px-3 py-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {fields.map((field, index) => {
                  const quantity = Number(watched.items?.[index]?.quantity ?? 0);
                  const unitPrice = Number(watched.items?.[index]?.unit_price ?? 0);
                  const taxRate = Number(watched.items?.[index]?.tax_rate ?? 0);
                  const lineBase = Number.isFinite(quantity * unitPrice) ? quantity * unitPrice : 0;
                  const lineTotal = lineBase + lineBase * (taxRate / 100);

                  return (
                    <tr key={field.id} className="border-b border-border/50 last:border-0">
                      <td className="px-3 py-2">
                        <Input
                          {...register(`items.${index}.description`)}
                          placeholder="Servicio..."
                          className="h-8"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                          type="number"
                          min="0"
                          step="0.01"
                          className="h-8 text-right"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          {...register(`items.${index}.unit_price`, { valueAsNumber: true })}
                          type="number"
                          min="0"
                          step="0.01"
                          className="h-8 text-right"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          {...register(`items.${index}.tax_rate`, { valueAsNumber: true })}
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          className="h-8 text-right"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-medium">
                        {Number.isFinite(lineTotal) ? lineTotal.toFixed(2) : "0.00"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => remove(index)}
                          disabled={fields.length === 1}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ description: "", quantity: 1, unit_price: 0, tax_rate: 21 })}
          >
            <PlusCircle className="h-4 w-4" />
            Añadir línea
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Totales y extras</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="concept">Concepto general</Label>
            <Input id="concept" {...register("concept")} />
          </div>

          <div className="space-y-2">
            <Label>Divisa</Label>
            <Select
              defaultValue={defaultValues.currency}
              onValueChange={(value) => setValue("currency", value as Currency)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="taxRate">IVA (%)</Label>
            <Input id="taxRate" type="number" min="0" max="100" step="0.01" {...register("taxRate")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="irpfRate">IRPF (%)</Label>
            <Input id="irpfRate" type="number" min="0" max="100" step="0.01" {...register("irpfRate")} />
          </div>

          {type === "invoice" && (
            <div className="space-y-2">
              <Label>Método de pago</Label>
              <Select
                defaultValue={defaultValues.paymentMethod || "none"}
                onValueChange={(value) => setValue("paymentMethod", value === "none" ? "" : (value as any))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin definir" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin definir</SelectItem>
                  {paymentMethodOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="notes">Notas (visibles en documento)</Label>
            <textarea
              id="notes"
              {...register("notes")}
              className="flex min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {type === "quote" && (
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="internalNotes">Notas internas (no visibles en PDF)</Label>
              <textarea
                id="internalNotes"
                {...register("internalNotes")}
                className="flex min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm">
          <p className="text-xs text-muted-foreground">
            Subtotal: {totals.subtotal.toFixed(2)} {watched.currency}
          </p>
          <p className="text-xs text-muted-foreground">
            IVA: {totals.taxAmount.toFixed(2)} {watched.currency}
          </p>
          <p className="text-xs text-muted-foreground">
            IRPF: -{totals.irpfAmount.toFixed(2)} {watched.currency}
          </p>
          <p className="text-base font-semibold">Total: {totals.total.toFixed(2)} {watched.currency}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DocumentPdfDownloadButton
            templateProps={{
              type,
              documentNumber: watched.documentNumber || "—",
              issueDate: watched.issueDate,
              dueDate: type === "invoice" ? watched.dueDate : undefined,
              validUntil: type === "quote" ? watched.validUntil : undefined,
              status: watched.status || (type === "invoice" ? "pending" : "draft"),
              issuerName: issuer?.company_name || "Mi empresa",
              issuerTaxId: issuer?.company_tax_id || undefined,
              issuerAddress: issuer?.company_address || undefined,
              issuerEmail: issuer?.company_email || undefined,
              issuerPhone: issuer?.company_phone || undefined,
              issuerLogoUrl: issuer?.company_logo_url || undefined,
              clientName: previewClientName,
              clientCompany: previewClientCompany,
              clientTaxId: previewClientTaxId,
              clientAddress: previewClientAddress,
              clientEmail: previewClientEmail,
              items: itemsForPreview,
              subtotal: totals.subtotal,
              taxAmount: totals.taxAmount,
              irpfAmount: totals.irpfAmount,
              total: totals.total,
              currency: watched.currency || "EUR",
              taxRate: totals.effectiveTaxRate,
              irpfRate: watched.irpfRate || 0,
              notes: watched.notes,
              paymentMethod:
                paymentMethodOptions.find((method) => method.value === watched.paymentMethod)?.label,
              accentColor: issuer?.accent_color || "#3b82f6",
              documentLanguage: issuer?.document_language || "es",
            }}
            filename={documentFilename}
          />

          <Button type="button" variant="outline" asChild>
            <Link href={backHref}>Cancelar</Link>
          </Button>
          <Button type="submit" variant="gnerai" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isEditing ? "Guardar cambios" : `Crear ${type === "invoice" ? "factura" : "presupuesto"}`}
          </Button>
        </div>
      </div>
    </form>
  );

  const previewContent = (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Vista previa</CardTitle>
      </CardHeader>
      <CardContent>
        <DocumentTemplate
          type={type}
          documentNumber={watched.documentNumber || "—"}
          issueDate={watched.issueDate}
          dueDate={type === "invoice" ? watched.dueDate : undefined}
          validUntil={type === "quote" ? watched.validUntil : undefined}
          status={watched.status || (type === "invoice" ? "pending" : "draft")}
          issuerName={issuer?.company_name || "Mi empresa"}
          issuerTaxId={issuer?.company_tax_id || undefined}
          issuerAddress={issuer?.company_address || undefined}
          issuerEmail={issuer?.company_email || undefined}
          issuerPhone={issuer?.company_phone || undefined}
          issuerLogoUrl={issuer?.company_logo_url || undefined}
          clientName={previewClientName}
          clientCompany={previewClientCompany}
          clientTaxId={previewClientTaxId}
          clientAddress={previewClientAddress}
          clientEmail={previewClientEmail}
          items={itemsForPreview}
          subtotal={totals.subtotal}
          taxAmount={totals.taxAmount}
          irpfAmount={totals.irpfAmount}
          total={totals.total}
          currency={(watched.currency || "EUR") as Currency}
          taxRate={totals.effectiveTaxRate}
          irpfRate={watched.irpfRate || 0}
          notes={watched.notes}
          paymentMethod={
            paymentMethodOptions.find((method) => method.value === watched.paymentMethod)?.label
          }
          accentColor={issuer?.accent_color || "#3b82f6"}
          documentLanguage={issuer?.document_language || "es"}
        />
      </CardContent>
    </Card>
  );

  return (
    <>
      <div className="xl:hidden">
        <Tabs defaultValue="editor" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="preview">Vista previa</TabsTrigger>
          </TabsList>
          <TabsContent value="editor">{editorContent}</TabsContent>
          <TabsContent value="preview">{previewContent}</TabsContent>
        </Tabs>
      </div>

      <div className="hidden gap-6 xl:grid xl:grid-cols-2">
        <div>{editorContent}</div>
        <div className="sticky top-24 h-fit">{previewContent}</div>
      </div>
    </>
  );
}
