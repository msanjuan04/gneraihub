import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VendorForm } from "@/components/proveedores/VendorForm";

export default function NuevoProveedorPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8">
          <Link href="/proveedores">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Nuevo proveedor</h1>
          <p className="text-sm text-muted-foreground">Añade un proveedor para asociarlo a gastos</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos del proveedor</CardTitle>
        </CardHeader>
        <CardContent>
          <VendorForm />
        </CardContent>
      </Card>
    </div>
  );
}
