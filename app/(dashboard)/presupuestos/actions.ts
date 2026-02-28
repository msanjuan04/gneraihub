"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getNextInvoiceNumber, getNextQuoteNumber } from "@/lib/utils/document-numbers";
import { computeDocumentTotals, getDocumentItemsWithFallback, sanitizeDocumentItems } from "@/lib/utils/documents";
import type {
  ActionResult,
  Currency,
  QuoteItem,
  QuoteStatus,
} from "@/types";

type QuotePayload = {
  quote_number?: string;
  status?: QuoteStatus;
  client_id?: string | null;
  potential_client_name?: string | null;
  potential_client_email?: string | null;
  potential_client_company?: string | null;
  potential_client_tax_id?: string | null;
  potential_client_address?: string | null;
  concept: string;
  items: QuoteItem[];
  amount?: number;
  tax_rate?: number;
  irpf_rate?: number;
  total?: number;
  currency: Currency;
  issue_date: string;
  valid_until?: string | null;
  notes?: string | null;
  internal_notes?: string | null;
};

async function getAuthenticatedUserId(supabase: any): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

function normalizeNullableText(value?: string | null): string | null {
  const text = (value ?? "").trim();
  return text.length > 0 ? text : null;
}

function normalizeQuoteStatus(status?: string): QuoteStatus {
  const allowed: QuoteStatus[] = [
    "draft",
    "sent",
    "accepted",
    "rejected",
    "expired",
    "invoiced",
  ];
  return allowed.includes(status as QuoteStatus) ? (status as QuoteStatus) : "draft";
}

function revalidateQuotePaths(id?: string) {
  revalidatePath("/presupuestos");
  if (id) {
    revalidatePath(`/presupuestos/${id}`);
    revalidatePath(`/presupuestos/${id}/editar`);
  }
}

export async function createQuote(input: QuotePayload): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient();
    const userId = await getAuthenticatedUserId(supabase);
    if (!userId) return { success: false, error: "Sesión no válida" };

    const items = sanitizeDocumentItems(input.items);
    if (items.length === 0) {
      return { success: false, error: "Debes añadir al menos una línea válida" };
    }

    const concept = input.concept?.trim() || items[0]?.description || "";
    if (!concept) {
      return { success: false, error: "El concepto es obligatorio" };
    }

    const totals = computeDocumentTotals(items, input.tax_rate ?? 21, input.irpf_rate ?? 0);
    const quoteNumber = normalizeNullableText(input.quote_number) ?? await getNextQuoteNumber(supabase);
    const status = normalizeQuoteStatus(input.status);

    const { data, error } = await supabase
      .from("quotes")
      .insert({
        user_id: userId,
        quote_number: quoteNumber,
        status,
        client_id: input.client_id || null,
        potential_client_name: normalizeNullableText(input.potential_client_name),
        potential_client_email: normalizeNullableText(input.potential_client_email),
        potential_client_company: normalizeNullableText(input.potential_client_company),
        potential_client_tax_id: normalizeNullableText(input.potential_client_tax_id),
        potential_client_address: normalizeNullableText(input.potential_client_address),
        concept,
        items,
        amount: totals.subtotal,
        tax_rate: totals.effectiveTaxRate,
        irpf_rate: input.irpf_rate ?? 0,
        total: totals.total,
        currency: input.currency,
        issue_date: input.issue_date,
        valid_until: input.valid_until || null,
        notes: normalizeNullableText(input.notes),
        internal_notes: normalizeNullableText(input.internal_notes),
      })
      .select("id")
      .single();

    if (error) return { success: false, error: error.message };

    revalidateQuotePaths(data.id);
    return { success: true, data: { id: data.id } };
  } catch {
    return { success: false, error: "Error inesperado al crear el presupuesto" };
  }
}

export async function updateQuote(
  id: string,
  input: Partial<QuotePayload>
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient();
    const userId = await getAuthenticatedUserId(supabase);
    if (!userId) return { success: false, error: "Sesión no válida" };

    const { data: existing, error: existingError } = await supabase
      .from("quotes")
      .select("id,user_id,quote_number,items,concept,tax_rate,irpf_rate,status")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (existingError || !existing) {
      return { success: false, error: "Presupuesto no encontrado" };
    }

    const items = sanitizeDocumentItems(input.items ?? existing.items ?? []);
    if (items.length === 0) {
      return { success: false, error: "Debes añadir al menos una línea válida" };
    }

    const concept = (input.concept ?? existing.concept)?.trim() || items[0]?.description || "";
    if (!concept) {
      return { success: false, error: "El concepto es obligatorio" };
    }

    const irpfRate = input.irpf_rate ?? existing.irpf_rate ?? 0;
    const totals = computeDocumentTotals(items, input.tax_rate ?? existing.tax_rate ?? 21, irpfRate);
    const status = normalizeQuoteStatus(input.status ?? existing.status);

    const { error } = await supabase
      .from("quotes")
      .update({
        quote_number:
          input.quote_number === undefined
            ? undefined
            : normalizeNullableText(input.quote_number) ?? existing.quote_number,
        status,
        client_id: input.client_id === undefined ? undefined : input.client_id || null,
        potential_client_name:
          input.potential_client_name === undefined
            ? undefined
            : normalizeNullableText(input.potential_client_name),
        potential_client_email:
          input.potential_client_email === undefined
            ? undefined
            : normalizeNullableText(input.potential_client_email),
        potential_client_company:
          input.potential_client_company === undefined
            ? undefined
            : normalizeNullableText(input.potential_client_company),
        potential_client_tax_id:
          input.potential_client_tax_id === undefined
            ? undefined
            : normalizeNullableText(input.potential_client_tax_id),
        potential_client_address:
          input.potential_client_address === undefined
            ? undefined
            : normalizeNullableText(input.potential_client_address),
        concept,
        items,
        amount: totals.subtotal,
        tax_rate: totals.effectiveTaxRate,
        irpf_rate: irpfRate,
        total: totals.total,
        currency: input.currency,
        issue_date: input.issue_date,
        valid_until: input.valid_until === undefined ? undefined : input.valid_until || null,
        notes: input.notes === undefined ? undefined : normalizeNullableText(input.notes),
        internal_notes:
          input.internal_notes === undefined
            ? undefined
            : normalizeNullableText(input.internal_notes),
      })
      .eq("id", id)
      .eq("user_id", userId);

    if (error) return { success: false, error: error.message };

    revalidateQuotePaths(id);
    return { success: true, data: { id } };
  } catch {
    return { success: false, error: "Error inesperado al actualizar el presupuesto" };
  }
}

export async function deleteQuote(id: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const userId = await getAuthenticatedUserId(supabase);
    if (!userId) return { success: false, error: "Sesión no válida" };

    const { error } = await supabase.from("quotes").delete().eq("id", id).eq("user_id", userId);
    if (error) return { success: false, error: error.message };

    revalidateQuotePaths(id);
    return { success: true };
  } catch {
    return { success: false, error: "Error inesperado al eliminar el presupuesto" };
  }
}

export async function updateQuoteStatus(
  id: string,
  status: QuoteStatus
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const userId = await getAuthenticatedUserId(supabase);
    if (!userId) return { success: false, error: "Sesión no válida" };

    const normalized = normalizeQuoteStatus(status);
    const { error } = await supabase
      .from("quotes")
      .update({ status: normalized })
      .eq("id", id)
      .eq("user_id", userId);

    if (error) return { success: false, error: error.message };
    revalidateQuotePaths(id);
    return { success: true };
  } catch {
    return { success: false, error: "Error inesperado al actualizar estado" };
  }
}

export async function convertQuoteToInvoice(
  quoteId: string
): Promise<ActionResult<{ invoiceId: string }>> {
  try {
    const supabase = await createClient();
    const userId = await getAuthenticatedUserId(supabase);
    if (!userId) return { success: false, error: "Sesión no válida" };

    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .select("*")
      .eq("id", quoteId)
      .eq("user_id", userId)
      .single();

    if (quoteError || !quote) {
      return { success: false, error: "Presupuesto no encontrado" };
    }

    if (quote.converted_to_invoice_id) {
      return { success: true, data: { invoiceId: quote.converted_to_invoice_id } };
    }

    let clientId: string | null = quote.client_id ?? null;

    if (!clientId) {
      const clientName =
        normalizeNullableText(quote.potential_client_name) ??
        normalizeNullableText(quote.potential_client_company) ??
        "Cliente sin nombre";

      const { data: createdClient, error: clientError } = await supabase
        .from("clients")
        .insert({
          name: clientName,
          email: normalizeNullableText(quote.potential_client_email),
          phone: null,
          company: normalizeNullableText(quote.potential_client_company),
          nif: normalizeNullableText(quote.potential_client_tax_id),
          address: normalizeNullableText(quote.potential_client_address),
          notes: `Creado automáticamente desde presupuesto ${quote.quote_number}`,
          status: "active",
        })
        .select("id")
        .single();

      if (clientError || !createdClient) {
        return {
          success: false,
          error: clientError?.message ?? "No se pudo crear el cliente desde el presupuesto",
        };
      }

      clientId = createdClient.id;
    }

    const items = getDocumentItemsWithFallback(
      quote.items,
      quote.concept,
      quote.amount,
      quote.tax_rate
    );
    const totals = computeDocumentTotals(items, quote.tax_rate ?? 21, quote.irpf_rate ?? 0);
    const invoiceNumber = await getNextInvoiceNumber(supabase);

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        project_id: null,
        client_id: clientId,
        invoice_number: invoiceNumber,
        concept: quote.concept,
        amount: totals.subtotal,
        tax_rate: totals.effectiveTaxRate,
        irpf_rate: quote.irpf_rate ?? 0,
        currency: quote.currency,
        issue_date: quote.issue_date,
        due_date: quote.valid_until ?? quote.issue_date,
        status: "pending",
        payment_method: null,
        notes: quote.notes ?? null,
        items,
        converted_from_quote_id: quote.id,
        client_address: normalizeNullableText(quote.potential_client_address),
        client_tax_id: normalizeNullableText(quote.potential_client_tax_id),
      })
      .select("id")
      .single();

    if (invoiceError || !invoice) {
      return {
        success: false,
        error: invoiceError?.message ?? "No se pudo crear la factura desde el presupuesto",
      };
    }

    const { error: quoteUpdateError } = await supabase
      .from("quotes")
      .update({
        status: "invoiced",
        converted_to_invoice_id: invoice.id,
      })
      .eq("id", quote.id)
      .eq("user_id", userId);

    if (quoteUpdateError) {
      return {
        success: false,
        error: quoteUpdateError.message,
      };
    }

    revalidateQuotePaths(quote.id);
    revalidatePath("/facturas");
    revalidatePath(`/facturas/${invoice.id}`);
    revalidatePath("/");
    return { success: true, data: { invoiceId: invoice.id } };
  } catch {
    return { success: false, error: "Error inesperado al convertir presupuesto en factura" };
  }
}
