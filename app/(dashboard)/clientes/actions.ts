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

export async function deleteClient(id: string): Promise<ActionResult> {
  try {
    const supabase = await createSupabaseClient();

    const [invoicesRes, activeMensualidadesRes, projectsRes] = await Promise.all([
      supabase.from("invoices").select("id", { count: "exact", head: true }).eq("client_id", id),
      supabase
        .from("mensualidades")
        .select("id", { count: "exact", head: true })
        .eq("client_id", id)
        .eq("status", "active"),
      supabase.from("projects").select("id").eq("client_id", id),
    ]);

    const invoiceCount = invoicesRes.count ?? 0;
    const activeMensualidadesCount = activeMensualidadesRes.count ?? 0;

    if (invoiceCount > 0 || activeMensualidadesCount > 0) {
      const parts: string[] = [];
      if (invoiceCount > 0) parts.push(`${invoiceCount} factura${invoiceCount !== 1 ? "s" : ""}`);
      if (activeMensualidadesCount > 0) {
        parts.push(
          `${activeMensualidadesCount} mensualidad${activeMensualidadesCount !== 1 ? "es" : ""} activa${activeMensualidadesCount !== 1 ? "s" : ""}`
        );
      }

      return {
        success: false,
        error: `No puedes eliminar este cliente: tiene ${parts.join(" y ")} asociadas. Elimínalas o desvincúlalas primero.`,
      };
    }

    const projectIds = (projectsRes.data ?? []).map((project) => project.id);
    if (projectIds.length > 0) {
      const { data: projectInvoices } = await supabase
        .from("invoices")
        .select("project_id")
        .in("project_id", projectIds);

      const projectIdsWithInvoices = new Set(
        (projectInvoices ?? [])
          .map((invoice) => invoice.project_id)
          .filter((value): value is string => typeof value === "string")
      );

      const deletableProjectIds = projectIds.filter((projectId) => !projectIdsWithInvoices.has(projectId));
      if (deletableProjectIds.length > 0) {
        await supabase.from("projects").delete().in("id", deletableProjectIds);
      }
    }

    await Promise.all([
      supabase.from("mensualidades").delete().eq("client_id", id),
      supabase.from("quotes").update({ client_id: null }).eq("client_id", id),
    ]);

    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) return { success: false, error: error.message };

    revalidatePath("/clientes");
    revalidatePath(`/clientes/${id}`);
    revalidatePath("/proyectos");
    revalidatePath("/mensualidades");
    revalidatePath("/presupuestos");
    revalidatePath("/");
    return { success: true };
  } catch {
    return { success: false, error: "Error inesperado al eliminar el cliente" };
  }
}
