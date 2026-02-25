"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  ActionResult,
  SaasPlan,
  SaasPlanInsert,
  SaasPlanUpdate,
  SaasSubscription,
  SaasSubscriptionInsert,
  SaasSubscriptionUpdate,
} from "@/types";

// ============================================================
// SaaS Plans
// ============================================================

export async function createSaasPlan(
  data: SaasPlanInsert
): Promise<ActionResult<SaasPlan>> {
  try {
    const supabase = await createClient();
    const { data: plan, error } = await supabase
      .from("saas_plans")
      .insert(data)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath(`/proyectos/${data.project_id}`);
    return { success: true, data: plan as SaasPlan };
  } catch {
    return { success: false, error: "Error inesperado" };
  }
}

export async function updateSaasPlan(
  id: string,
  data: SaasPlanUpdate
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("saas_plans")
      .update(data)
      .eq("id", id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch {
    return { success: false, error: "Error inesperado" };
  }
}

export async function deleteSaasPlan(id: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("saas_plans").delete().eq("id", id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch {
    return { success: false, error: "Error inesperado" };
  }
}

// ============================================================
// SaaS Subscriptions
// ============================================================

export async function createSaasSubscription(
  data: SaasSubscriptionInsert
): Promise<ActionResult<SaasSubscription & { client: any; plan: any }>> {
  try {
    const supabase = await createClient();
    const { data: sub, error } = await supabase
      .from("saas_subscriptions")
      .insert({
        ...data,
        plan_id: data.plan_id || null,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        notes: data.notes || null,
      })
      .select("*, client:clients(*), plan:saas_plans(*)")
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath(`/proyectos/${data.project_id}`);
    return { success: true, data: sub as any };
  } catch {
    return { success: false, error: "Error inesperado" };
  }
}

export async function updateSaasSubscription(
  id: string,
  data: SaasSubscriptionUpdate
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("saas_subscriptions")
      .update(data)
      .eq("id", id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch {
    return { success: false, error: "Error inesperado" };
  }
}

export async function deleteSaasSubscription(id: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("saas_subscriptions")
      .delete()
      .eq("id", id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch {
    return { success: false, error: "Error inesperado" };
  }
}
