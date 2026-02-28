import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VendorForm } from "@/components/proveedores/VendorForm";

interface Props {
  params: { id: string };
}

export default async function EditarProveedorPage({ params }: Props) {
  const supabase = await createClient();
  const { data: vendor, error } = await supabase
    .from("vendors")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !vendor) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8">
          <Link href={`/proveedores/${params.id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Editar proveedor</h1>
          <p className="text-sm text-muted-foreground">{vendor.name}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos del proveedor</CardTitle>
        </CardHeader>
        <CardContent>
          <VendorForm vendor={vendor as any} />
        </CardContent>
      </Card>
    </div>
  );
}
