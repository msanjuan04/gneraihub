"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getNextMensualidadDue } from "@/lib/utils/mensualidades";
import type {
  ActionResult,
  Currency,
  IncomeTransactionInsert,
  MensualidadPaymentInsert,
  PaymentMethod,
} from "@/types";

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

// ----- Cobros de mensualidades (antes en /pagos) -----

export async function registerMensualidadPayment({
  mensualidadId,
  paymentDate,
}: {
  mensualidadId: string;
  paymentDate: string;
}): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const { data: mensualidad, error: mensError } = await supabase
      .from("mensualidades")
      .select("id,client_id,project_id,fee,setup_fee,currency,billing_type,status,start_date,end_date,created_at")
      .eq("id", mensualidadId)
      .single();

    if (mensError || !mensualidad) {
      return { success: false, error: "Mensualidad no encontrada" };
    }

    const { data: existingPayments } = await supabase
      .from("mensualidad_payments")
      .select("payment_date,is_setup")
      .eq("mensualidad_id", mensualidadId);

    const due = getNextMensualidadDue(
      mensualidad as any,
      (existingPayments ?? []) as { payment_date: string; is_setup: boolean }[]
    );

    if (!due) {
      return { success: false, error: "No hay cobro pendiente para esta mensualidad" };
    }

    const dueDateStr = due.dueDate.toISOString().split("T")[0];
    if (dueDateStr !== paymentDate) {
      return { success: false, error: "La fecha no coincide con el vencimiento pendiente" };
    }

    const baseInsert: Omit<MensualidadPaymentInsert, "amount" | "is_setup"> = {
      mensualidad_id: mensualidadId,
      client_id: mensualidad.client_id ?? null,
      project_id: mensualidad.project_id ?? null,
      payment_date: paymentDate,
      currency: (mensualidad.currency as Currency) ?? "EUR",
      payment_method: null,
      notes: null,
    };

    if (due.setupPending && mensualidad.setup_fee && mensualidad.setup_fee > 0) {
      const { error: setupErr } = await supabase.from("mensualidad_payments").insert({
        ...baseInsert,
        amount: mensualidad.setup_fee,
        is_setup: true,
      });
      if (setupErr) return { success: false, error: setupErr.message };
    }

    const { error: feeErr } = await supabase.from("mensualidad_payments").insert({
      ...baseInsert,
      amount: mensualidad.fee,
      is_setup: false,
    });

    if (feeErr) return { success: false, error: feeErr.message };

    revalidateIncomePaths();
    return { success: true };
  } catch {
    return { success: false, error: "Error al registrar el cobro" };
  }
}

export async function updateMensualidadPayment(
  paymentId: string,
  data: {
    payment_date?: string;
    amount?: number;
    payment_method?: PaymentMethod | null;
    notes?: string | null;
  }
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const payload: Record<string, unknown> = {};
    if (data.payment_date != null) payload.payment_date = data.payment_date;
    if (data.amount != null) payload.amount = data.amount;
    if (data.payment_method !== undefined) payload.payment_method = data.payment_method;
    if (data.notes !== undefined) payload.notes = data.notes?.trim() || null;

    const { error } = await supabase
      .from("mensualidad_payments")
      .update(payload)
      .eq("id", paymentId);

    if (error) return { success: false, error: error.message };
    revalidateIncomePaths();
    return { success: true };
  } catch {
    return { success: false, error: "Error al actualizar el cobro" };
  }
}

export async function deleteMensualidadPayment(paymentId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("mensualidad_payments").delete().eq("id", paymentId);
    if (error) return { success: false, error: error.message };
    revalidateIncomePaths();
    return { success: true };
  } catch {
    return { success: false, error: "Error al eliminar el cobro" };
  }
}
