import { createClient } from "@/lib/supabase/server";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProjectForm } from "@/components/proyectos/ProjectForm";

export default async function NuevoProyectoPage() {
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("*")
    .eq("status", "active")
    .order("name");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8">
          <Link href="/proyectos">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Nuevo proyecto</h1>
          <p className="text-sm text-muted-foreground">
            Crea un nuevo proyecto para un cliente
          </p>
        </div>
      </div>
      <ProjectForm clients={clients ?? []} />
    </div>
  );
}
