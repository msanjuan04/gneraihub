"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, VendorInsert } from "@/types";

function normalizeText(value?: string | null): string | null {
  const text = (value ?? "").trim();
  return text.length > 0 ? text : null;
}

function revalidateVendorPaths(id?: string) {
  revalidatePath("/proveedores");
  if (id) {
    revalidatePath(`/proveedores/${id}`);
    revalidatePath(`/proveedores/${id}/editar`);
  }
  revalidatePath("/gastos");
}

export async function createVendor(data: VendorInsert): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient();
    const payload = {
      name: data.name.trim(),
      category_default: normalizeText(data.category_default),
      website: normalizeText(data.website),
      email: normalizeText(data.email),
      phone: normalizeText(data.phone),
      tax_id: normalizeText(data.tax_id),
      address: normalizeText(data.address),
      notes: normalizeText(data.notes),
    };

    const { data: inserted, error } = await supabase
      .from("vendors")
      .insert(payload)
      .select("id")
      .single();
    if (error) return { success: false, error: error.message };

    revalidateVendorPaths(inserted.id);
    return { success: true, data: { id: inserted.id } };
  } catch {
    return { success: false, error: "Error inesperado al crear el proveedor" };
  }
}

export async function updateVendor(
  id: string,
  data: Partial<VendorInsert>
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const payload = {
      name: data.name === undefined ? undefined : data.name.trim(),
      category_default:
        data.category_default === undefined ? undefined : normalizeText(data.category_default),
      website: data.website === undefined ? undefined : normalizeText(data.website),
      email: data.email === undefined ? undefined : normalizeText(data.email),
      phone: data.phone === undefined ? undefined : normalizeText(data.phone),
      tax_id: data.tax_id === undefined ? undefined : normalizeText(data.tax_id),
      address: data.address === undefined ? undefined : normalizeText(data.address),
      notes: data.notes === undefined ? undefined : normalizeText(data.notes),
    };

    const { error } = await supabase.from("vendors").update(payload).eq("id", id);
    if (error) return { success: false, error: error.message };

    revalidateVendorPaths(id);
    return { success: true };
  } catch {
    return { success: false, error: "Error inesperado al actualizar el proveedor" };
  }
}

export async function deleteVendor(id: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const [expensesRes, transactionsRes] = await Promise.all([
      supabase
        .from("company_expenses")
        .select("id", { count: "exact", head: true })
        .eq("vendor_id", id),
      supabase
        .from("expense_transactions")
        .select("id", { count: "exact", head: true })
        .eq("vendor_id", id),
    ]);

    const totalAssociated = (expensesRes.count ?? 0) + (transactionsRes.count ?? 0);
    if (totalAssociated > 0) {
      return {
        success: false,
        error: `Este proveedor tiene ${totalAssociated} gastos asociados. Reasígnalos antes de eliminarlo.`,
      };
    }

    const { error } = await supabase.from("vendors").delete().eq("id", id);
    if (error) return { success: false, error: error.message };

    revalidateVendorPaths(id);
    return { success: true };
  } catch {
    return { success: false, error: "Error inesperado al eliminar el proveedor" };
  }
}
