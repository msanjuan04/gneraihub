"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult, ClientInsert } from "@/types";

export async function createClient(data: ClientInsert): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createSupabaseClient();
    const { data: client, error } = await supabase
      .from("clients")
      .insert({ ...data, email: data.email || null, phone: data.phone || null, company: data.company || null, nif: data.nif || null, address: data.address || null, notes: data.notes || null })
      .select("id").single();

    if (error) return { success: false, error: error.message };
    revalidatePath("/clientes");
    return { success: true, data: { id: client.id } };
  } catch {
    return { success: false, error: "Error inesperado" };
  }
}

export async function updateClient(id: string, data: Partial<ClientInsert>): Promise<ActionResult> {
  try {
    const supabase = await createSupabaseClient();
    const { error } = await supabase.from("clients").update(data).eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidatePath("/clientes");
    revalidatePath(`/clientes/${id}`);
    return { success: true };
  } catch {
    return { success: false, error: "Error inesperado" };
  }
}
