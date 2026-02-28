import { createClient } from "@/lib/supabase/server";
import { UserSettingsForm } from "@/components/settings/UserSettingsForm";
import type { UserSettings } from "@/types";

export default async function AjustesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const settingsRes = user?.id
    ? await supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle()
    : { data: null };

  return (
    <div className="space-y-6 max-w-4xl">
      <UserSettingsForm
        settings={(settingsRes.data as UserSettings | null) ?? null}
        userEmail={user?.email ?? ""}
        userFullName={(user?.user_metadata?.full_name as string | undefined) ?? ""}
      />
    </div>
  );
}
