import { createClient } from "@/lib/supabase/server";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { InvoiceForm } from "@/components/facturas/InvoiceForm";

export default async function NuevaFacturaPage() {
  const supabase = await createClient();

  const [clientsRes, projectsRes] = await Promise.all([
    supabase.from("clients").select("*").eq("status", "active").order("name"),
    supabase.from("projects").select("*").eq("status", "active").order("name"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8">
          <Link href="/facturas"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Nueva factura</h1>
          <p className="text-sm text-muted-foreground">Crea una nueva factura para un cliente</p>
        </div>
      </div>
      <InvoiceForm clients={clientsRes.data ?? []} projects={projectsRes.data ?? []} />
    </div>
  );
}
