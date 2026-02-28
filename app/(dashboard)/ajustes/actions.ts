"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, UserSettings } from "@/types";

function normalizeNullable(value?: string | null): string | null {
  const text = (value ?? "").trim();
  return text.length > 0 ? text : null;
}

function normalizeSettingsPayload(data: Partial<UserSettings>) {
  return {
    company_name: data.company_name === undefined ? undefined : normalizeNullable(data.company_name),
    company_tax_id:
      data.company_tax_id === undefined ? undefined : normalizeNullable(data.company_tax_id),
    company_address:
      data.company_address === undefined ? undefined : normalizeNullable(data.company_address),
    company_email: data.company_email === undefined ? undefined : normalizeNullable(data.company_email),
    company_phone: data.company_phone === undefined ? undefined : normalizeNullable(data.company_phone),
    company_logo_url:
      data.company_logo_url === undefined ? undefined : normalizeNullable(data.company_logo_url),
    accent_color: data.accent_color === undefined ? undefined : data.accent_color,
    document_language:
      data.document_language === undefined ? undefined : data.document_language,
  };
}

function revalidateSettingsPaths() {
  revalidatePath("/ajustes");
  revalidatePath("/facturas");
  revalidatePath("/presupuestos");
}

export async function getUserSettings(): Promise<ActionResult<UserSettings>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Sesión no válida" };

    const { data, error } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) return { success: false, error: error.message };

    const defaults: UserSettings = {
      user_id: user.id,
      company_name: null,
      company_tax_id: null,
      company_address: null,
      company_email: user.email ?? null,
      company_phone: null,
      company_logo_url: null,
      accent_color: "#3b82f6",
      document_language: "es",
      updated_at: new Date().toISOString(),
    };

    return { success: true, data: (data as UserSettings | null) ?? defaults };
  } catch {
    return { success: false, error: "Error inesperado al cargar ajustes" };
  }
}

export async function updateUserSettings(
  data: Partial<UserSettings>
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Sesión no válida" };

    const payload = {
      user_id: user.id,
      ...normalizeSettingsPayload(data),
    };

    const { error } = await supabase.from("user_settings").upsert(payload, {
      onConflict: "user_id",
    });

    if (error) return { success: false, error: error.message };

    revalidateSettingsPaths();
    return { success: true };
  } catch {
    return { success: false, error: "Error inesperado al guardar ajustes" };
  }
}

export async function updateUserPassword(
  currentPassword: string,
  newPassword: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return { success: false, error: "Sesión no válida" };
    }

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (verifyError) {
      return { success: false, error: "La contraseña actual no es correcta" };
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { success: false, error: error.message };

    revalidateSettingsPaths();
    return { success: true };
  } catch {
    return { success: false, error: "Error inesperado al actualizar la contraseña" };
  }
}

export async function updateUserProfile(fullName: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: fullName.trim(),
      },
    });

    if (error) return { success: false, error: error.message };
    revalidateSettingsPaths();
    return { success: true };
  } catch {
    return { success: false, error: "Error inesperado al actualizar el perfil" };
  }
}

export async function uploadCompanyLogo(
  formData: FormData
): Promise<ActionResult<{ url: string }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Sesión no válida" };

    const file = formData.get("file") as File | null;
    if (!file) return { success: false, error: "No se encontró el archivo" };

    const extension = file.name.split(".").pop() || "png";
    const filePath = `${user.id}/logo-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("logos")
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type || "image/png",
      });

    if (uploadError) return { success: false, error: uploadError.message };

    const {
      data: { publicUrl },
    } = supabase.storage.from("logos").getPublicUrl(filePath);

    const updateResult = await updateUserSettings({ company_logo_url: publicUrl });
    if (!updateResult.success) return updateResult;

    return { success: true, data: { url: publicUrl } };
  } catch {
    return { success: false, error: "Error inesperado al subir el logo" };
  }
}

// Compatibilidad con código previo
export async function upsertUserSettings(data: Partial<UserSettings>): Promise<ActionResult> {
  return updateUserSettings(data);
}
