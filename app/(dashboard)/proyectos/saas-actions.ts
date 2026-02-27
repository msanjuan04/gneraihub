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

function normalizeBillingType(
  billingType: SaasPlanInsert["billing_type"] | SaasPlan["billing_type"],
  hasSetupFee: boolean
) {
  const annual = billingType === "annual" || billingType === "setup_annual";
  if (hasSetupFee) return annual ? "setup_annual" : "setup_monthly";
  return annual ? "annual" : "monthly";
}

// ============================================================
// SaaS Plans
// ============================================================

export async function createSaasPlan(
  data: SaasPlanInsert
): Promise<ActionResult<SaasPlan>> {
  try {
    const supabase = await createClient();
    const fee = Number(data.fee ?? 0);
    const setupFee = Number(data.setup_fee ?? 0);

    if (fee <= 0 && setupFee <= 0) {
      return {
        success: false,
        error: "Debes indicar una cuota recurrente o un setup fee",
      };
    }

    const { data: plan, error } = await supabase
      .from("saas_plans")
      .insert({
        ...data,
        fee: fee > 0 ? fee : 0,
        setup_fee: setupFee > 0 ? setupFee : null,
        billing_type: normalizeBillingType(data.billing_type, setupFee > 0),
      })
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

    const { data: existing, error: existingError } = await supabase
      .from("saas_plans")
      .select("id,billing_type,fee,setup_fee")
      .eq("id", id)
      .single();

    if (existingError || !existing) {
      return { success: false, error: "No se encontró el plan" };
    }

    const nextFee = Number(data.fee ?? existing.fee ?? 0);
    const nextSetupFee = Number(data.setup_fee ?? existing.setup_fee ?? 0);

    if (nextFee <= 0 && nextSetupFee <= 0) {
      return {
        success: false,
        error: "Debes indicar una cuota recurrente o un setup fee",
      };
    }

    const nextBillingType = normalizeBillingType(
      (data.billing_type ?? existing.billing_type) as SaasPlan["billing_type"],
      nextSetupFee > 0
    );

    const { error } = await supabase
      .from("saas_plans")
      .update({
        ...data,
        fee: nextFee > 0 ? nextFee : 0,
        setup_fee: nextSetupFee > 0 ? nextSetupFee : null,
        billing_type: nextBillingType,
      })
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
        is_free: data.is_free ?? false,
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
