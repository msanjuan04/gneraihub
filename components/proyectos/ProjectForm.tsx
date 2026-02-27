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
import { Loader2, Save, Zap } from "lucide-react";
import { toast } from "sonner";
import { createProject, updateProject } from "@/app/(dashboard)/proyectos/actions";
import type { Client, Project } from "@/types";

const projectSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  client_id: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  status: z.enum(["active", "paused", "completed", "cancelled"]).default("active"),
  type: z.enum(["web", "app", "marketing", "consulting", "ecommerce", "otro"]).optional().nullable(),
  budget: z.coerce.number().positive().optional().nullable(),
  currency: z.enum(["EUR", "USD", "GBP"]).default("EUR"),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  is_saas: z.boolean().default(false),
});

type ProjectFormData = {
  name: string;
  client_id?: string | null;
  description?: string | null;
  status: "active" | "paused" | "completed" | "cancelled";
  type?: "web" | "app" | "marketing" | "consulting" | "ecommerce" | "otro" | null;
  budget?: number | null;
  currency: "EUR" | "USD" | "GBP";
  start_date?: string | null;
  end_date?: string | null;
  notes?: string | null;
  is_saas: boolean;
};

interface ProjectFormProps {
  project?: Project;
  clients: Client[];
}

export function ProjectForm({ project, clients }: ProjectFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isSaas, setIsSaas] = useState(project?.is_saas ?? false);
  const isEditing = !!project;

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema) as any,
    defaultValues: {
      name: project?.name ?? "",
      client_id: project?.client_id ?? null,
      description: project?.description ?? "",
      status: (project?.status as any) ?? "active",
      type: (project?.type as any) ?? null,
      budget: project?.budget ?? null,
      currency: (project?.currency as any) ?? "EUR",
      start_date: project?.start_date ?? null,
      end_date: project?.end_date ?? null,
      notes: project?.notes ?? "",
      is_saas: project?.is_saas ?? false,
    },
  });

  const handleSaasToggle = () => {
    const next = !isSaas;
    setIsSaas(next);
    setValue("is_saas", next);
    if (next) setValue("client_id", null);
  };

  const onSubmit = async (data: ProjectFormData) => {
    setLoading(true);
    const result = isEditing
      ? await updateProject(project.id, data)
      : await createProject(data);
    setLoading(false);

    if (result.success) {
      toast.success(isEditing ? "Proyecto actualizado" : "Proyecto creado");
      router.push("/proyectos");
      router.refresh();
    } else {
      toast.error("Error al guardar", { description: result.error });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 w-full">
      <Card>
        <CardHeader><CardTitle className="text-base">Información del proyecto</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input id="name" placeholder="Ej. Web corporativa Acme" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          {/* SaaS Toggle */}
          <div className="sm:col-span-2">
            <button
              type="button"
              onClick={handleSaasToggle}
              className={`flex items-center gap-3 w-full rounded-lg border px-4 py-3 text-left transition-colors ${
                isSaas
                  ? "border-primary/60 bg-primary/5 text-foreground"
                  : "border-border bg-muted/20 text-muted-foreground hover:border-border/80"
              }`}
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${isSaas ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                <Zap className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${isSaas ? "text-foreground" : "text-muted-foreground"}`}>
                  Proyecto SaaS
                </p>
                <p className="text-xs text-muted-foreground">
                  {isSaas
                    ? "Gestiona múltiples clientes con planes de suscripción"
                    : "Activa para tener múltiples clientes con mensualidades"}
                </p>
              </div>
              <div className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${isSaas ? "bg-primary" : "bg-input"}`}>
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow-lg ring-0 transition-transform ${isSaas ? "translate-x-4" : "translate-x-0"}`} />
              </div>
            </button>
          </div>

          {/* Cliente — solo si no es SaaS */}
          {!isSaas && (
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select defaultValue={project?.client_id ?? "none"} onValueChange={(v) => setValue("client_id", v === "none" ? null : v)}>
                <SelectTrigger><SelectValue placeholder="Sin cliente" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin cliente</SelectItem>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className={isSaas ? "sm:col-span-1" : ""}>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select defaultValue={project?.type ?? "web"} onValueChange={(v) => setValue("type", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["web", "app", "marketing", "consulting", "ecommerce", "otro"].map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Presupuesto</Label>
            <div className="flex gap-2">
              <Input type="number" step="0.01" min="0" placeholder="0.00" className="flex-1" {...register("budget")} />
              <Select defaultValue={project?.currency ?? "EUR"} onValueChange={(v) => setValue("currency", v as any)}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isEditing && (
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select defaultValue={project?.status ?? "active"} onValueChange={(v) => setValue("status", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="paused">Pausado</SelectItem>
                  <SelectItem value="completed">Completado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="start_date">Fecha inicio</Label>
            <Input id="start_date" type="date" {...register("start_date")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="end_date">Fecha fin</Label>
            <Input id="end_date" type="date" {...register("end_date")} />
          </div>

          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <textarea id="description" className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none" placeholder="Descripción del proyecto..." {...register("description")} />
          </div>

          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="notes">Notas internas</Label>
            <textarea id="notes" className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none" placeholder="Notas privadas..." {...register("notes")} />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button type="submit" variant="gnerai" disabled={loading} className="w-full sm:w-auto">
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Guardando...</> : <><Save className="h-4 w-4" />{isEditing ? "Guardar cambios" : "Crear proyecto"}</>}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading} className="w-full sm:w-auto">Cancelar</Button>
      </div>
    </form>
  );
}
