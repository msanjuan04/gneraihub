"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, InvoiceInsert } from "@/types";

export async function createInvoice(data: InvoiceInsert): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient();
    const payload = {
      ...data,
      project_id: data.project_id || null,
      notes: data.notes || null,
      payment_method: data.payment_method || null,
      items: Array.isArray(data.items) ? data.items : [],
      client_address: data.client_address || null,
      client_tax_id: data.client_tax_id || null,
      converted_from_quote_id: data.converted_from_quote_id || null,
    };

    const { data: invoice, error } = await supabase
      .from("invoices")
      .insert(payload)
      .select("id")
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath("/facturas");
    revalidatePath("/");
    return { success: true, data: { id: invoice.id } };
  } catch {
    return { success: false, error: "Error inesperado" };
  }
}

export async function updateInvoice(id: string, data: Partial<InvoiceInsert>): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const payload = {
      ...data,
      project_id: data.project_id === undefined ? undefined : data.project_id || null,
      notes: data.notes === undefined ? undefined : data.notes || null,
      payment_method:
        data.payment_method === undefined ? undefined : data.payment_method || null,
      items: data.items === undefined ? undefined : Array.isArray(data.items) ? data.items : [],
      client_address:
        data.client_address === undefined ? undefined : data.client_address || null,
      client_tax_id: data.client_tax_id === undefined ? undefined : data.client_tax_id || null,
      converted_from_quote_id:
        data.converted_from_quote_id === undefined
          ? undefined
          : data.converted_from_quote_id || null,
    };
    const { error } = await supabase.from("invoices").update(payload).eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidatePath("/facturas");
    revalidatePath(`/facturas/${id}`);
    revalidatePath("/");
    return { success: true };
  } catch {
    return { success: false, error: "Error inesperado" };
  }
}

export async function deleteInvoice(id: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const { error: deleteIncomeError } = await supabase
      .from("income_transactions")
      .delete()
      .eq("invoice_id", id);

    if (deleteIncomeError) {
      return { success: false, error: deleteIncomeError.message };
    }

    const { error } = await supabase.from("invoices").delete().eq("id", id);
    if (error) return { success: false, error: error.message };

    revalidatePath("/facturas");
    revalidatePath(`/facturas/${id}`);
    revalidatePath("/ingresos");
    revalidatePath("/cashflow");
    revalidatePath("/");
    return { success: true };
  } catch {
    return { success: false, error: "Error inesperado al eliminar la factura" };
  }
}

/**
 * Marca una factura como pagada y crea automáticamente un income_transaction.
 * Esta es la lógica de negocio clave: un cobro real siempre genera una transacción.
 */
export async function markInvoicePaid(
  invoiceId: string,
  amount: number
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Obtener los datos de la factura
    const { data: invoice, error: fetchError } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .single();

    if (fetchError || !invoice) {
      return { success: false, error: "No se encontró la factura" };
    }

    // Marcar la factura como pagada
    const { error: updateError } = await supabase
      .from("invoices")
      .update({ status: "paid" })
      .eq("id", invoiceId);

    if (updateError) return { success: false, error: updateError.message };

    // Crear automáticamente el income_transaction
    const { error: transactionError } = await supabase
      .from("income_transactions")
      .insert({
        invoice_id: invoiceId,
        project_id: invoice.project_id,
        client_id: invoice.client_id,
        is_manual: false,
        concept: `Cobro factura ${invoice.invoice_number}`,
        amount: invoice.total ?? amount,
        currency: invoice.currency,
        date: new Date().toISOString().split("T")[0],
        payment_method: invoice.payment_method,
        notes: `Pago automático al marcar factura ${invoice.invoice_number} como cobrada`,
      });

    if (transactionError) {
      // Revertir el cambio de estado si falla la transacción
      await supabase.from("invoices").update({ status: "sent" }).eq("id", invoiceId);
      return { success: false, error: transactionError.message };
    }

    revalidatePath("/facturas");
    revalidatePath("/cashflow");
    revalidatePath("/");
    return { success: true };
  } catch {
    return { success: false, error: "Error inesperado al procesar el pago" };
  }
}
