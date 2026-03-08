import { createClient } from "@/lib/supabase/server";
import { ExpenseForm } from "@/components/gastos/ExpenseForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function NuevoGastoPage() {
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .eq("status", "active")
    .order("name");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8">
          <Link href="/gastos">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Nuevo gasto</h1>
          <p className="text-sm text-muted-foreground">
            Añade un gasto recurrente o puntual
          </p>
        </div>
      </div>

      <ExpenseForm projects={projects ?? []} />
    </div>
  );
}
