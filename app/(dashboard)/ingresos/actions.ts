"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, Currency, IncomeTransactionInsert, PaymentMethod } from "@/types";

type CreateIncomeInput = {
  concept: string;
  amount: number;
  currency: Currency;
  date: string;
  client_id?: string;
  project_id?: string;
  payment_method?: PaymentMethod;
  notes?: string;
};

function revalidateIncomePaths() {
  revalidatePath("/ingresos");
  revalidatePath("/pagos");
  revalidatePath("/cashflow");
  revalidatePath("/");
}

function normalizeText(value?: string | null): string | null {
  const text = (value ?? "").trim();
  return text.length > 0 ? text : null;
}

export async function createIncomeTransaction(
  data: CreateIncomeInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient();

    const payload: IncomeTransactionInsert = {
      invoice_id: null,
      project_id: data.project_id || null,
      client_id: data.client_id || null,
      concept: data.concept.trim(),
      amount: data.amount,
      currency: data.currency,
      date: data.date,
      payment_method: data.payment_method || null,
      notes: normalizeText(data.notes),
      is_manual: true,
    };

    const { data: inserted, error } = await supabase
      .from("income_transactions")
      .insert(payload)
      .select("id")
      .single();

    if (error) return { success: false, error: error.message };

    revalidateIncomePaths();
    return { success: true, data: { id: inserted.id } };
  } catch {
    return { success: false, error: "Error inesperado al crear el ingreso" };
  }
}

export async function updateIncomeTransaction(
  id: string,
  data: Partial<CreateIncomeInput>
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const { data: existing, error: existingError } = await supabase
      .from("income_transactions")
      .select("id,is_manual")
      .eq("id", id)
      .single();

    if (existingError || !existing) {
      return { success: false, error: "Ingreso no encontrado" };
    }

    if (!existing.is_manual) {
      return {
        success: false,
        error: "Solo los ingresos manuales se pueden editar desde esta sección",
      };
    }

    const payload = {
      concept: data.concept === undefined ? undefined : normalizeText(data.concept) ?? "",
      amount: data.amount,
      currency: data.currency,
      date: data.date,
      client_id: data.client_id === undefined ? undefined : data.client_id || null,
      project_id: data.project_id === undefined ? undefined : data.project_id || null,
      payment_method:
        data.payment_method === undefined ? undefined : data.payment_method || null,
      notes: data.notes === undefined ? undefined : normalizeText(data.notes),
    };

    const { error } = await supabase.from("income_transactions").update(payload).eq("id", id);
    if (error) return { success: false, error: error.message };

    revalidateIncomePaths();
    return { success: true };
  } catch {
    return { success: false, error: "Error inesperado al actualizar el ingreso" };
  }
}

export async function deleteIncomeTransaction(id: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const { data: existing, error: existingError } = await supabase
      .from("income_transactions")
      .select("id,is_manual")
      .eq("id", id)
      .single();

    if (existingError || !existing) {
      return { success: false, error: "Ingreso no encontrado" };
    }

    if (!existing.is_manual) {
      return {
        success: false,
        error: "Los ingresos de factura no se pueden borrar desde esta sección",
      };
    }

    const { error } = await supabase.from("income_transactions").delete().eq("id", id);
    if (error) return { success: false, error: error.message };

    revalidateIncomePaths();
    return { success: true };
  } catch {
    return { success: false, error: "Error inesperado al eliminar el ingreso" };
  }
}
