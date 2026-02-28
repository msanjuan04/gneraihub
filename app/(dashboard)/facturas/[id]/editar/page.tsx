import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { InvoiceForm } from "@/components/facturas/InvoiceForm";
import type { UserSettings } from "@/types";

interface Props {
  params: { id: string };
}

export default async function EditarFacturaPage({ params }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [invoiceRes, clientsRes, projectsRes, settingsRes] = await Promise.all([
    supabase.from("invoices").select("*").eq("id", params.id).single(),
    supabase.from("clients").select("*").order("name"),
    supabase.from("projects").select("*").order("name"),
    user?.id
      ? supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (invoiceRes.error || !invoiceRes.data) notFound();

  const invoice = invoiceRes.data as any;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8">
          <Link href={`/facturas/${params.id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Editar factura</h1>
          <p className="text-sm text-muted-foreground">{invoice.invoice_number}</p>
        </div>
      </div>

      <InvoiceForm
        invoice={invoice}
        clients={clientsRes.data ?? []}
        projects={projectsRes.data ?? []}
        issuer={(settingsRes.data as UserSettings | null) ?? null}
        initialInvoiceNumber={invoice.invoice_number}
      />
    </div>
  );
}
