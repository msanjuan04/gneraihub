import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getNextQuoteNumber } from "@/lib/utils/document-numbers";
import { Button } from "@/components/ui/button";
import { DocumentEditor } from "@/components/documents/DocumentEditor";
import type { UserSettings } from "@/types";

export default async function NuevoPresupuestoPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [clientsRes, settingsRes, quoteNumber] = await Promise.all([
    supabase.from("clients").select("*").eq("status", "active").order("name"),
    user?.id
      ? supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    getNextQuoteNumber(supabase),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8">
          <Link href="/presupuestos">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Nuevo presupuesto</h1>
          <p className="text-sm text-muted-foreground">
            Prepara una propuesta comercial sin impacto en métricas financieras.
          </p>
        </div>
      </div>

      <DocumentEditor
        type="quote"
        clients={clientsRes.data ?? []}
        issuer={(settingsRes.data as UserSettings | null) ?? null}
        initialDocumentNumber={quoteNumber}
      />
    </div>
  );
}
