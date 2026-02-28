import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IncomeForm } from "@/components/ingresos/IncomeForm";

export default async function NuevoIngresoPage() {
  const supabase = await createClient();

  const [clientsRes, projectsRes] = await Promise.all([
    supabase.from("clients").select("id,name").order("name"),
    supabase.from("projects").select("id,name,client_id").order("name"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8">
          <Link href="/ingresos">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Nuevo ingreso manual</h1>
          <p className="text-sm text-muted-foreground">
            Registra cobros que no provienen de una factura
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos del ingreso</CardTitle>
        </CardHeader>
        <CardContent>
          <IncomeForm
            clients={clientsRes.data ?? []}
            projects={(projectsRes.data ?? []) as Array<{ id: string; name: string; client_id?: string | null }>}
          />
        </CardContent>
      </Card>
    </div>
  );
}
