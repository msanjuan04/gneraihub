"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, Mensualidad, MensualidadInsert, MensualidadUpdate } from "@/types";

export async function createMensualidad(
  data: MensualidadInsert
): Promise<ActionResult<Mensualidad>> {
  try {
    const supabase = await createClient();
    const { data: record, error } = await supabase
      .from("mensualidades")
      .insert({
        ...data,
        project_id: data.project_id || null,
        setup_fee: data.setup_fee ?? null,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        notes: data.notes || null,
      })
      .select("*, client:clients(*), project:projects(id,name)")
      .single();

    if (error) return { success: false, error: error.message };

    if (data.project_id) revalidatePath(`/proyectos/${data.project_id}`);
    revalidatePath(`/clientes/${data.client_id}`);
    revalidatePath("/pagos");
    revalidatePath("/calendario");
    revalidatePath("/cashflow");
    revalidatePath("/");

    return { success: true, data: record as Mensualidad };
  } catch {
    return { success: false, error: "Error inesperado" };
  }
}

export async function updateMensualidad(
  id: string,
  data: MensualidadUpdate
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: updated, error } = await supabase
      .from("mensualidades")
      .update({
        ...data,
        project_id: data.project_id !== undefined ? data.project_id || null : undefined,
        setup_fee: data.setup_fee !== undefined ? data.setup_fee ?? null : undefined,
      })
      .eq("id", id)
      .select("id, client_id, project_id")
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath("/pagos");
    revalidatePath("/calendario");
    revalidatePath("/cashflow");
    revalidatePath("/");
    if (updated?.client_id) revalidatePath(`/clientes/${updated.client_id}`);
    if (updated?.project_id) revalidatePath(`/proyectos/${updated.project_id}`);
    return { success: true };
  } catch {
    return { success: false, error: "Error inesperado" };
  }
}

export async function deleteMensualidad(id: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: existing } = await supabase
      .from("mensualidades")
      .select("id, client_id, project_id")
      .eq("id", id)
      .single();

    const { error } = await supabase.from("mensualidades").delete().eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidatePath("/pagos");
    revalidatePath("/calendario");
    revalidatePath("/cashflow");
    revalidatePath("/");
    if (existing?.client_id) revalidatePath(`/clientes/${existing.client_id}`);
    if (existing?.project_id) revalidatePath(`/proyectos/${existing.project_id}`);
    return { success: true };
  } catch {
    return { success: false, error: "Error inesperado" };
  }
}
