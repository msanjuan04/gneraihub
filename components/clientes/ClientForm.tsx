"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { createClient as createClientAction, updateClient } from "@/app/(dashboard)/clientes/actions";
import type { Client } from "@/types";

const clientSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  email: z.string().email("Email inválido").optional().or(z.literal("")).nullable(),
  phone: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  nif: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(["active", "inactive"]),
});

// Usamos el tipo de output explícitamente para compatibilidad con react-hook-form
type ClientFormData = {
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  nif?: string | null;
  address?: string | null;
  notes?: string | null;
  status: "active" | "inactive";
};

export function ClientForm({ client }: { client?: Client }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const isEditing = !!client;

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema) as any,
    defaultValues: {
      name: client?.name ?? "",
      email: client?.email ?? "",
      phone: client?.phone ?? "",
      company: client?.company ?? "",
      nif: client?.nif ?? "",
      address: client?.address ?? "",
      notes: client?.notes ?? "",
      status: client?.status ?? "active",
    },
  });

  const onSubmit = async (data: ClientFormData) => {
    setLoading(true);
    // Normalizar undefined a null para compatibilidad con Supabase
    const payload = {
      ...data,
      email: data.email ?? null,
      phone: data.phone ?? null,
      company: data.company ?? null,
      nif: data.nif ?? null,
      address: data.address ?? null,
      notes: data.notes ?? null,
    };
    const result = isEditing
      ? await updateClient(client.id, payload)
      : await createClientAction(payload as any);
    setLoading(false);

    if (result.success) {
      toast.success(isEditing ? "Cliente actualizado" : "Cliente creado");
      router.push("/clientes");
      router.refresh();
    } else {
      toast.error("Error al guardar", { description: result.error });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader><CardTitle className="text-base">Datos del cliente</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="name">Nombre / Razón social *</Label>
            <Input id="name" placeholder="Nombre del cliente..." {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Empresa</Label>
            <Input id="company" placeholder="Nombre de la empresa" {...register("company")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nif">NIF/CIF</Label>
            <Input id="nif" placeholder="B12345678" {...register("nif")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="cliente@empresa.com" {...register("email")} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input id="phone" type="tel" placeholder="+34 600 000 000" {...register("phone")} />
          </div>

          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="address">Dirección</Label>
            <Input id="address" placeholder="Calle, número, ciudad..." {...register("address")} />
          </div>

          {isEditing && (
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select defaultValue={client?.status ?? "active"} onValueChange={(v) => setValue("status", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <textarea id="notes" className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none" placeholder="Notas privadas sobre el cliente..." {...register("notes")} />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" variant="gnerai" disabled={loading}>
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Guardando...</> : <><Save className="h-4 w-4" />{isEditing ? "Guardar cambios" : "Crear cliente"}</>}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>Cancelar</Button>
      </div>
    </form>
  );
}
