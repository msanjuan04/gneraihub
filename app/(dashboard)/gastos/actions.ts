"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, CompanyExpenseInsert, ExpenseTransactionInsert } from "@/types";

/**
 * Crea un nuevo gasto recurrente/puntual en company_expenses.
 */
export async function createExpense(
  data: Omit<CompanyExpenseInsert, never>
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient();

    const { data: expense, error } = await supabase
      .from("company_expenses")
      .insert({
        ...data,
        billing_day: data.billing_day || null,
        billing_date: data.billing_date || null,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        vendor_id: data.vendor_id || null,
        project_id: data.project_id || null,
        notes: data.notes || null,
        payment_method: data.payment_method || null,
      })
      .select("id")
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath("/gastos");
    revalidatePath("/");
    return { success: true, data: { id: expense.id } };
  } catch (err) {
    return { success: false, error: "Error inesperado al crear el gasto" };
  }
}

/**
 * Actualiza un gasto existente.
 */
export async function updateExpense(
  id: string,
  data: Partial<CompanyExpenseInsert>
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("company_expenses")
      .update({
        ...data,
        billing_day: data.billing_day || null,
        billing_date: data.billing_date || null,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        vendor_id: data.vendor_id || null,
        project_id: data.project_id || null,
        notes: data.notes || null,
        payment_method: data.payment_method || null,
      })
      .eq("id", id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/gastos");
    revalidatePath(`/gastos/${id}`);
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    return { success: false, error: "Error inesperado al actualizar el gasto" };
  }
}

/**
 * Cambia el estado de un gasto (active/paused/cancelled).
 */
export async function updateExpenseStatus(
  id: string,
  status: "active" | "paused" | "cancelled"
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("company_expenses")
      .update({ status })
      .eq("id", id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/gastos");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    return { success: false, error: "Error inesperado" };
  }
}

/**
 * Duplica un gasto existente (útil para crear variantes).
 */
export async function duplicateExpense(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient();

    // Obtener el gasto original
    const { data: original, error: fetchError } = await supabase
      .from("company_expenses")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !original) {
      return { success: false, error: "No se encontró el gasto original" };
    }

    // Insertar copia con nombre modificado
    const { id: _, created_at: __, ...rest } = original;
    const { data: copy, error: insertError } = await supabase
      .from("company_expenses")
      .insert({ ...rest, name: `${original.name} (copia)`, status: "active" })
      .select("id")
      .single();

    if (insertError) return { success: false, error: insertError.message };

    revalidatePath("/gastos");
    return { success: true, data: { id: copy.id } };
  } catch (err) {
    return { success: false, error: "Error inesperado al duplicar" };
  }
}

/**
 * Registra un pago real (expense_transaction) para un gasto.
 */
export async function createExpenseTransaction(
  data: ExpenseTransactionInsert
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient();

    const { data: transaction, error } = await supabase
      .from("expense_transactions")
      .insert({
        ...data,
        vendor_id: data.vendor_id || null,
        project_id: data.project_id || null,
        company_expense_id: data.company_expense_id || null,
        receipt_url: data.receipt_url || null,
        notes: data.notes || null,
        payment_method: data.payment_method || null,
        category: data.category || null,
      })
      .select("id")
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath("/gastos");
    revalidatePath("/cashflow");
    revalidatePath("/");
    return { success: true, data: { id: transaction.id } };
  } catch (err) {
    return { success: false, error: "Error inesperado al registrar el pago" };
  }
}

/**
 * Elimina una transacción de gasto.
 */
export async function deleteExpenseTransaction(id: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("expense_transactions")
      .delete()
      .eq("id", id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/gastos");
    revalidatePath("/cashflow");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    return { success: false, error: "Error inesperado al eliminar" };
  }
}

/**
 * Sube un recibo/factura a Supabase Storage y devuelve la URL.
 */
export async function uploadReceipt(
  formData: FormData
): Promise<ActionResult<{ url: string }>> {
  try {
    const supabase = await createClient();
    const file = formData.get("file") as File;

    if (!file) return { success: false, error: "No se proporcionó archivo" };

    const fileName = `${Date.now()}-${file.name.replace(/\s/g, "_")}`;
    const { data, error } = await supabase.storage
      .from("receipts")
      .upload(fileName, file, { contentType: file.type });

    if (error) return { success: false, error: error.message };

    const {
      data: { publicUrl },
    } = supabase.storage.from("receipts").getPublicUrl(data.path);

    return { success: true, data: { url: publicUrl } };
  } catch (err) {
    return { success: false, error: "Error al subir el archivo" };
  }
}
