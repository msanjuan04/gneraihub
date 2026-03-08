"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, SavedCredentialInsert, SavedCredentialUpdate } from "@/types";

function revalidate() {
  revalidatePath("/accesos");
}

export async function createCredential(
  data: Omit<SavedCredentialInsert, "user_id">
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "No autenticado" };

    const payload: SavedCredentialInsert = {
      ...data,
      user_id: user.id,
    };

    const { data: row, error } = await supabase
      .from("saved_credentials")
      .insert(payload)
      .select("id")
      .single();

    if (error) return { success: false, error: error.message };
    revalidate();
    return { success: true, data: { id: row.id } };
  } catch {
    return { success: false, error: "Error al guardar el acceso" };
  }
}

export async function updateCredential(
  id: string,
  data: SavedCredentialUpdate
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("saved_credentials")
      .update(data)
      .eq("id", id);

    if (error) return { success: false, error: error.message };
    revalidate();
    return { success: true };
  } catch {
    return { success: false, error: "Error al actualizar" };
  }
}

export async function deleteCredential(id: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("saved_credentials").delete().eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidate();
    return { success: true };
  } catch {
    return { success: false, error: "Error al eliminar" };
  }
}
