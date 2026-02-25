"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, InvoiceInsert } from "@/types";

export async function createInvoice(data: InvoiceInsert): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient();
    const { data: invoice, error } = await supabase
      .from("invoices")
      .insert({ ...data, project_id: data.project_id || null, notes: data.notes || null, payment_method: data.payment_method || null })
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
    const { error } = await supabase.from("invoices").update(data).eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidatePath("/facturas");
    revalidatePath(`/facturas/${id}`);
    revalidatePath("/");
    return { success: true };
  } catch {
    return { success: false, error: "Error inesperado" };
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
