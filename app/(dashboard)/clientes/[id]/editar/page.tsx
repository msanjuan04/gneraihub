import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ClientForm } from "@/components/clientes/ClientForm";

interface Props { params: { id: string } }

export default async function EditarClientePage({ params }: Props) {
  const supabase = await createClient();
  const { data: client, error } = await supabase.from("clients").select("*").eq("id", params.id).single();
  if (error || !client) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8">
          <Link href={`/clientes/${params.id}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Editar cliente</h1>
          <p className="text-sm text-muted-foreground">{client.name}</p>
        </div>
      </div>
      <ClientForm client={client as any} />
    </div>
  );
}
