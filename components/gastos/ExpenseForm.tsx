"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { createExpense, updateExpense } from "@/app/(dashboard)/gastos/actions";
import type { CompanyExpense, CompanyExpenseInsert, Vendor, Project } from "@/types";

// Esquema de validación Zod
const expenseSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  category: z.enum(["SaaS", "Infra", "Marketing", "Legal", "Operaciones", "Equipo", "Otro"]),
  amount: z.coerce.number().positive("El importe debe ser positivo"),
  currency: z.enum(["EUR", "USD", "GBP"]).default("EUR"),
  interval: z.enum(["one_off", "monthly", "yearly", "quarterly"]),
  billing_day: z.coerce.number().min(1).max(28).optional().nullable(),
  billing_date: z.string().optional().nullable(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  payment_method: z
    .enum(["card", "transfer", "direct_debit", "cash", "otro"])
    .optional()
    .nullable(),
  vendor_id: z.string().optional().nullable(),
  project_id: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(["active", "paused", "cancelled"]).default("active"),
});

// Tipo explícito para compatibilidad con react-hook-form + zod v4
type ExpenseFormData = {
  name: string;
  category: "SaaS" | "Infra" | "Marketing" | "Legal" | "Operaciones" | "Equipo" | "Otro";
  amount: number;
  currency: "EUR" | "USD" | "GBP";
  interval: "one_off" | "monthly" | "yearly" | "quarterly";
  billing_day?: number | null;
  billing_date?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  payment_method?: "card" | "transfer" | "direct_debit" | "cash" | "otro" | null;
  vendor_id?: string | null;
  project_id?: string | null;
  notes?: string | null;
  status: "active" | "paused" | "cancelled";
};

interface ExpenseFormProps {
  expense?: CompanyExpense;
  vendors: Vendor[];
  projects: Project[];
}

export function ExpenseForm({ expense, vendors, projects }: ExpenseFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const isEditing = !!expense;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema) as any,
    defaultValues: {
      name: expense?.name ?? "",
      category: (expense?.category as any) ?? "SaaS",
      amount: expense?.amount ?? 0,
      currency: (expense?.currency as any) ?? "EUR",
      interval: (expense?.interval as any) ?? "monthly",
      billing_day: expense?.billing_day ?? null,
      billing_date: expense?.billing_date ?? null,
      start_date: expense?.start_date ?? null,
      end_date: expense?.end_date ?? null,
      payment_method: (expense?.payment_method as any) ?? null,
      vendor_id: expense?.vendor_id ?? null,
      project_id: expense?.project_id ?? null,
      notes: expense?.notes ?? "",
      status: (expense?.status as any) ?? "active",
    },
  });

  const interval = watch("interval");

  const onSubmit = async (data: ExpenseFormData) => {
    setLoading(true);

    // Normaliza optional/undefined para que Supabase reciba null cuando corresponda.
    const payload: Omit<CompanyExpenseInsert, never> = {
      ...data,
      billing_day: data.billing_day ?? null,
      billing_date: data.billing_date ?? null,
      start_date: data.start_date ?? null,
      end_date: data.end_date ?? null,
      payment_method: data.payment_method ?? null,
      vendor_id: data.vendor_id ?? null,
      project_id: data.project_id ?? null,
      notes: data.notes ?? null,
    };

    const result = isEditing
      ? await updateExpense(expense.id, payload)
      : await createExpense(payload);

    setLoading(false);

    if (result.success) {
      toast.success(isEditing ? "Gasto actualizado" : "Gasto creado correctamente");
      router.push("/gastos");
      router.refresh();
    } else {
      toast.error("Error al guardar", { description: result.error });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      {/* Información básica */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Información del gasto</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {/* Nombre */}
          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              placeholder="Ej. Vercel Pro, GitHub Teams..."
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Categoría */}
          <div className="space-y-2">
            <Label>Categoría *</Label>
            <Select
              defaultValue={expense?.category ?? "SaaS"}
              onValueChange={(v) => setValue("category", v as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["SaaS", "Infra", "Marketing", "Legal", "Operaciones", "Equipo", "Otro"].map(
                  (cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Proveedor */}
          <div className="space-y-2">
            <Label>Proveedor</Label>
            <Select
              defaultValue={expense?.vendor_id ?? "none"}
              onValueChange={(v) => setValue("vendor_id", v === "none" ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar proveedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin proveedor</SelectItem>
                {vendors.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Importe */}
          <div className="space-y-2">
            <Label htmlFor="amount">Importe *</Label>
            <div className="flex gap-2">
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                className="flex-1"
                {...register("amount")}
              />
              <Select
                defaultValue={expense?.currency ?? "EUR"}
                onValueChange={(v) => setValue("currency", v as any)}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {errors.amount && (
              <p className="text-xs text-destructive">{errors.amount.message}</p>
            )}
          </div>

          {/* Método de pago */}
          <div className="space-y-2">
            <Label>Método de pago</Label>
            <Select
              defaultValue={expense?.payment_method ?? "card"}
              onValueChange={(v) => setValue("payment_method", v as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="card">Tarjeta</SelectItem>
                <SelectItem value="transfer">Transferencia</SelectItem>
                <SelectItem value="direct_debit">Domiciliación</SelectItem>
                <SelectItem value="cash">Efectivo</SelectItem>
                <SelectItem value="otro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Periodicidad */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Periodicidad y fechas</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {/* Intervalo */}
          <div className="sm:col-span-2 space-y-2">
            <Label>Tipo de gasto *</Label>
            <Select
              defaultValue={expense?.interval ?? "monthly"}
              onValueChange={(v) => setValue("interval", v as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Mensual</SelectItem>
                <SelectItem value="yearly">Anual</SelectItem>
                <SelectItem value="quarterly">Trimestral</SelectItem>
                <SelectItem value="one_off">Puntual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Día de cobro (para recurrentes) */}
          {interval !== "one_off" && (
            <div className="space-y-2">
              <Label htmlFor="billing_day">Día de cobro (1-28)</Label>
              <Input
                id="billing_day"
                type="number"
                min="1"
                max="28"
                placeholder="1"
                {...register("billing_day")}
              />
              <p className="text-xs text-muted-foreground">
                Día del mes en que se cobra
              </p>
            </div>
          )}

          {/* Fecha de cobro (para one_off o yearly con fecha exacta) */}
          {(interval === "one_off" || interval === "yearly") && (
            <div className="space-y-2">
              <Label htmlFor="billing_date">
                {interval === "one_off" ? "Fecha de pago *" : "Fecha anual exacta"}
              </Label>
              <Input
                id="billing_date"
                type="date"
                {...register("billing_date")}
              />
            </div>
          )}

          {/* Fecha de inicio */}
          <div className="space-y-2">
            <Label htmlFor="start_date">Fecha de inicio</Label>
            <Input
              id="start_date"
              type="date"
              {...register("start_date")}
            />
          </div>

          {/* Fecha de fin */}
          {interval !== "one_off" && (
            <div className="space-y-2">
              <Label htmlFor="end_date">Fecha de fin</Label>
              <Input
                id="end_date"
                type="date"
                {...register("end_date")}
              />
              <p className="text-xs text-muted-foreground">
                Opcional — deja vacío si no tiene fin
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Proyecto y notas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Asignación y notas</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {/* Proyecto */}
          <div className="space-y-2">
            <Label>Asignar a proyecto</Label>
            <Select
              defaultValue={expense?.project_id ?? "none"}
              onValueChange={(v) => setValue("project_id", v === "none" ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sin proyecto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin proyecto</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Estado */}
          {isEditing && (
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                defaultValue={expense?.status ?? "active"}
                onValueChange={(v) => setValue("status", v as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="paused">Pausado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Notas */}
          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <textarea
              id="notes"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              placeholder="Notas adicionales sobre este gasto..."
              {...register("notes")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Botones de acción */}
      <div className="flex gap-3">
        <Button type="submit" variant="gnerai" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {isEditing ? "Guardar cambios" : "Crear gasto"}
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
