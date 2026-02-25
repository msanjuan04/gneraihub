import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ProjectForm } from "@/components/proyectos/ProjectForm";

interface Props { params: { id: string } }

export default async function EditarProyectoPage({ params }: Props) {
  const supabase = await createClient();

  const [projectRes, clientsRes] = await Promise.all([
    supabase.from("projects").select("*, client:clients(*)").eq("id", params.id).single(),
    supabase.from("clients").select("*").eq("status", "active").order("name"),
  ]);

  if (projectRes.error || !projectRes.data) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8">
          <Link href={`/proyectos/${params.id}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Editar proyecto</h1>
          <p className="text-sm text-muted-foreground">{projectRes.data.name}</p>
        </div>
      </div>
      <ProjectForm project={projectRes.data as any} clients={clientsRes.data ?? []} />
    </div>
  );
}
