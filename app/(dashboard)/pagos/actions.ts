"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getNextMensualidadDue } from "@/lib/utils/mensualidades";
import type {
  ActionResult,
  Mensualidad,
  MensualidadPaymentInsert,
  PaymentMethod,
} from "@/types";

type RegisterPaymentInput = {
  mensualidadId: string;
  paymentDate?: string;
  paymentMethod?: PaymentMethod | null;
  notes?: string | null;
};

function revalidatePaymentPaths(clientId?: string | null, projectId?: string | null) {
  revalidatePath("/pagos");
  revalidatePath("/");
  revalidatePath("/calendario");
  if (clientId) revalidatePath(`/clientes/${clientId}`);
  if (projectId) revalidatePath(`/proyectos/${projectId}`);
}

export async function registerMensualidadPayment(
  input: RegisterPaymentInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient();

    const { data: mensualidad, error: mensualidadError } = await supabase
      .from("mensualidades")
      .select("id,client_id,project_id,status,billing_type,fee,setup_fee,currency,start_date,end_date,created_at")
      .eq("id", input.mensualidadId)
      .single();

    if (mensualidadError || !mensualidad) {
      return { success: false, error: "No se encontró la mensualidad" };
    }

    const { data: payments, error: paymentsError } = await supabase
      .from("mensualidad_payments")
      .select("payment_date,is_setup")
      .eq("mensualidad_id", input.mensualidadId);

    if (paymentsError) return { success: false, error: paymentsError.message };

    const due = getNextMensualidadDue(
      mensualidad as Mensualidad,
      (payments ?? []) as any[]
    );

    if (!due) {
      return {
        success: false,
        error: "No hay un próximo cobro pendiente para esta mensualidad",
      };
    }

    const paymentDate = input.paymentDate ?? due.dueDate.toISOString().split("T")[0];

    const payload: MensualidadPaymentInsert = {
      mensualidad_id: mensualidad.id,
      client_id: mensualidad.client_id,
      project_id: mensualidad.project_id,
      payment_date: paymentDate,
      amount: due.expectedAmount,
      currency: mensualidad.currency,
      payment_method: input.paymentMethod ?? null,
      is_setup: due.setupPending,
      notes: input.notes ?? null,
    };

    const { data: inserted, error: insertError } = await supabase
      .from("mensualidad_payments")
      .insert(payload)
      .select("id")
      .single();

    if (insertError) return { success: false, error: insertError.message };

    revalidatePaymentPaths(mensualidad.client_id, mensualidad.project_id);
    return { success: true, data: { id: inserted.id } };
  } catch {
    return { success: false, error: "Error inesperado al registrar el cobro" };
  }
}

export async function deleteMensualidadPayment(id: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const { data: existing } = await supabase
      .from("mensualidad_payments")
      .select("id,client_id,project_id")
      .eq("id", id)
      .single();

    const { error } = await supabase.from("mensualidad_payments").delete().eq("id", id);
    if (error) return { success: false, error: error.message };

    revalidatePaymentPaths(existing?.client_id, existing?.project_id);
    return { success: true };
  } catch {
    return { success: false, error: "Error inesperado al eliminar el cobro" };
  }
}
