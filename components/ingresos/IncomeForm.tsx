"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createIncomeTransaction } from "@/app/(dashboard)/ingresos/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Currency, PaymentMethod } from "@/types";

const schema = z.object({
  concept: z.string().trim().min(1, "El concepto es obligatorio"),
  amount: z.coerce.number().positive("El importe debe ser mayor que cero"),
  currency: z.enum(["EUR", "USD", "GBP"]).default("EUR"),
  date: z.string().min(1, "La fecha es obligatoria"),
  payment_method: z.enum(["card", "transfer", "cash", "direct_debit", "otro"]).optional(),
  client_id: z.string().optional(),
  project_id: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface IncomeFormProps {
  clients: Array<{ id: string; name: string }>;
  projects: Array<{ id: string; name: string; client_id?: string | null }>;
}

export function IncomeForm({ clients, projects }: IncomeFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      concept: "",
      amount: 0,
      currency: "EUR",
      date: new Date().toISOString().slice(0, 10),
      payment_method: undefined,
      client_id: undefined,
      project_id: undefined,
      notes: "",
    },
  });

  const selectedClient = watch("client_id");
  const filteredProjects = useMemo(() => {
    if (!selectedClient) return projects;
    return projects.filter((project) => !project.client_id || project.client_id === selectedClient);
  }, [projects, selectedClient]);

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    const result = await createIncomeTransaction({
      concept: values.concept,
      amount: values.amount,
      currency: values.currency as Currency,
      date: values.date,
      client_id: values.client_id || undefined,
      project_id: values.project_id || undefined,
      payment_method: values.payment_method as PaymentMethod | undefined,
      notes: values.notes || undefined,
    });
    setLoading(false);

    if (!result.success) {
      toast.error("No se pudo crear el ingreso", { description: result.error });
      return;
    }

    toast.success("Ingreso manual creado");
    router.push("/ingresos");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="concept">Concepto *</Label>
        <Input id="concept" {...register("concept")} placeholder="Ej. Pago en efectivo de consultoría" />
        {errors.concept ? <p className="text-xs text-destructive">{errors.concept.message}</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Importe *</Label>
        <Input id="amount" type="number" min="0" step="0.01" {...register("amount")} />
        {errors.amount ? <p className="text-xs text-destructive">{errors.amount.message}</p> : null}
      </div>

      <div className="space-y-2">
        <Label>Divisa</Label>
        <Select defaultValue="EUR" onValueChange={(value) => setValue("currency", value as Currency)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="EUR">EUR</SelectItem>
            <SelectItem value="USD">USD</SelectItem>
            <SelectItem value="GBP">GBP</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="date">Fecha de cobro *</Label>
        <Input id="date" type="date" {...register("date")} />
      </div>

      <div className="space-y-2">
        <Label>Método de pago</Label>
        <Select
          defaultValue="none"
          onValueChange={(value) =>
            setValue("payment_method", value === "none" ? undefined : (value as PaymentMethod))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Sin definir" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sin definir</SelectItem>
            <SelectItem value="card">Tarjeta</SelectItem>
            <SelectItem value="transfer">Transferencia</SelectItem>
            <SelectItem value="cash">Efectivo</SelectItem>
            <SelectItem value="direct_debit">Domiciliación</SelectItem>
            <SelectItem value="otro">Otro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Cliente</Label>
        <Select
          defaultValue="none"
          onValueChange={(value) => {
            const nextClient = value === "none" ? undefined : value;
            setValue("client_id", nextClient);
            setValue("project_id", undefined);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sin cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sin cliente</SelectItem>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Proyecto</Label>
        <Select
          defaultValue="none"
          onValueChange={(value) => setValue("project_id", value === "none" ? undefined : value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sin proyecto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sin proyecto</SelectItem>
            {filteredProjects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="notes">Notas</Label>
        <textarea
          id="notes"
          {...register("notes")}
          className="flex min-h-[110px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="sm:col-span-2 flex items-center justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.push("/ingresos")}>
          Cancelar
        </Button>
        <Button type="submit" variant="gnerai" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Guardar ingreso
        </Button>
      </div>
    </form>
  );
}
