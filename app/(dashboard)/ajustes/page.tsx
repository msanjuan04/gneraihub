import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AjustesPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Ajustes</CardTitle>
            <Badge variant="brand">Nuevo</Badge>
          </div>
          <CardDescription>
            Centro de configuración preparado para preferencias del equipo y de la cuenta.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Esta sección ya está conectada en la navegación.</p>
          <p>En el siguiente paso se pueden añadir preferencias de perfil, notificaciones y facturación.</p>
        </CardContent>
      </Card>
    </div>
  );
}
