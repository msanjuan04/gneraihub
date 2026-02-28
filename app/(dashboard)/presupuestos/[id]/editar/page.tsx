import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { DocumentEditor } from "@/components/documents/DocumentEditor";
import type { Quote, UserSettings } from "@/types";

interface Props {
  params: { id: string };
}

export default async function EditarPresupuestoPage({ params }: Props) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [quoteRes, clientsRes, settingsRes] = await Promise.all([
    supabase
      .from("quotes")
      .select("*, client:clients(*)")
      .eq("id", params.id)
      .single(),
    supabase.from("clients").select("*").eq("status", "active").order("name"),
    user?.id
      ? supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (quoteRes.error || !quoteRes.data) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8">
          <Link href={`/presupuestos/${params.id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Editar presupuesto</h1>
          <p className="text-sm text-muted-foreground">{quoteRes.data.quote_number}</p>
        </div>
      </div>

      <DocumentEditor
        type="quote"
        clients={clientsRes.data ?? []}
        issuer={(settingsRes.data as UserSettings | null) ?? null}
        initialDocumentNumber={quoteRes.data.quote_number}
        quote={quoteRes.data as Quote}
      />
    </div>
  );
}
