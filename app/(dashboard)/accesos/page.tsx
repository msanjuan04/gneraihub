import { createClient } from "@/lib/supabase/server";
import { Key, Shield } from "lucide-react";
import { CredentialCard } from "@/components/accesos/CredentialCard";
import { AddCredentialForm } from "@/components/accesos/AddCredentialForm";
import type { SavedCredential } from "@/types";

export default async function AccesosPage() {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("saved_credentials")
    .select("*")
    .order("site", { ascending: true });

  const credentials = (rows ?? []) as SavedCredential[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Key className="h-5 w-5" />
            Accesos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Correos y contraseñas por sitio. Indica de qué es y para qué sirve cada uno. Solo tú puedes ver estos datos.
          </p>
        </div>
        <AddCredentialForm />
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 px-4 py-3 flex items-start gap-3">
        <Shield className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800 dark:text-amber-200">
          <p className="font-medium">Uso interno</p>
          <p className="text-amber-700 dark:text-amber-300 mt-0.5">
            Los datos se guardan en tu proyecto y solo son visibles para tu usuario. No compartas tu sesión.
          </p>
        </div>
      </div>

      {credentials.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <Key className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Aún no hay accesos guardados</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Añade el primer acceso (sitio, correo, contraseña y para qué sirve) con el botón de arriba.
          </p>
          <div className="mt-4">
            <AddCredentialForm />
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {credentials.map((cred) => (
            <CredentialCard key={cred.id} credential={cred} />
          ))}
        </div>
      )}
    </div>
  );
}
