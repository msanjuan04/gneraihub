import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ClientForm } from "@/components/clientes/ClientForm";

export default function NuevoClientePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8">
          <Link href="/clientes"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Nuevo cliente</h1>
          <p className="text-sm text-muted-foreground">Añade un nuevo cliente a la base de datos</p>
        </div>
      </div>
      <ClientForm />
    </div>
  );
}
