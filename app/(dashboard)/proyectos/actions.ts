"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, ProjectInsert } from "@/types";

export async function createProject(data: Partial<ProjectInsert>): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient();
    const { data: project, error } = await supabase
      .from("projects")
      .insert({ ...data, client_id: data.client_id || null, budget: data.budget || null, start_date: data.start_date || null, end_date: data.end_date || null, notes: data.notes || null, description: data.description || null, type: data.type || null })
      .select("id")
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath("/proyectos");
    revalidatePath("/");
    return { success: true, data: { id: project.id } };
  } catch {
    return { success: false, error: "Error inesperado" };
  }
}

export async function updateProject(id: string, data: Partial<ProjectInsert>): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("projects")
      .update({ ...data, client_id: data.client_id || null, budget: data.budget || null, start_date: data.start_date || null, end_date: data.end_date || null, notes: data.notes || null })
      .eq("id", id);

    if (error) return { success: false, error: error.message };
    revalidatePath("/proyectos");
    revalidatePath(`/proyectos/${id}`);
    return { success: true };
  } catch {
    return { success: false, error: "Error inesperado" };
  }
}
