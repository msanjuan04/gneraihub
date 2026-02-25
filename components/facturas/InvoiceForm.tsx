"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, Calculator } from "lucide-react";
import { toast } from "sonner";
import { createInvoice, updateInvoice } from "@/app/(dashboard)/facturas/actions";
import { formatCurrency } from "@/lib/utils/currency";
import type { Client, Invoice, Project } from "@/types";

const invoiceSchema = z.object({
  invoice_number: z.string().min(1, "El número es obligatorio"),
  client_id: z.string().min(1, "El cliente es obligatorio"),
  project_id: z.string().optional().nullable(),
  concept: z.string().min(1, "El concepto es obligatorio"),
  amount: z.coerce.number().positive("El importe debe ser positivo"),
  tax_rate: z.coerce.number().min(0).max(100).default(21),
  currency: z.enum(["EUR", "USD", "GBP"]).default("EUR"),
  issue_date: z.string().min(1, "La fecha de emisión es obligatoria"),
  due_date: z.string().min(1, "La fecha de vencimiento es obligatoria"),
  status: z.enum(["pending", "sent", "paid", "overdue", "cancelled"]).default("pending"),
  payment_method: z.enum(["card", "transfer", "direct_debit", "cash", "otro"]).optional().nullable(),
  notes: z.string().optional().nullable(),
});

// Tipo explícito para compatibilidad con react-hook-form + zod v4
type InvoiceFormData = {
  invoice_number: string;
  client_id: string;
  project_id?: string | null;
  concept: string;
  amount: number;
  tax_rate: number;
  currency: "EUR" | "USD" | "GBP";
  issue_date: string;
  due_date: string;
  status: "pending" | "sent" | "paid" | "overdue" | "cancelled";
  payment_method?: "card" | "transfer" | "direct_debit" | "cash" | "otro" | null;
  notes?: string | null;
};

interface InvoiceFormProps {
  invoice?: Invoice;
  clients: Client[];
  projects: Project[];
}

export function InvoiceForm({ invoice, clients, projects }: InvoiceFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const isEditing = !!invoice;

  // Generar número de factura automático
  const generateInvoiceNumber = () => {
    const now = new Date();
    return `GNR-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(Math.floor(Math.random() * 999) + 1).padStart(3, "0")}`;
  };

  const { register, handleSubmit, setValue, watch, control, formState: { errors } } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema) as any,
    defaultValues: {
      invoice_number: invoice?.invoice_number ?? generateInvoiceNumber(),
      client_id: invoice?.client_id ?? "",
      project_id: invoice?.project_id ?? null,
      concept: invoice?.concept ?? "",
      amount: invoice?.amount ?? 0,
      tax_rate: invoice?.tax_rate ?? 21,
      currency: (invoice?.currency as any) ?? "EUR",
      issue_date: invoice?.issue_date ?? new Date().toISOString().split("T")[0],
      due_date: invoice?.due_date ?? "",
      status: (invoice?.status as any) ?? "pending",
      payment_method: (invoice?.payment_method as any) ?? null,
      notes: invoice?.notes ?? "",
    },
  });

  const amount = watch("amount") || 0;
  const taxRate = watch("tax_rate") ?? 21;
  const taxAmount = (amount * taxRate) / 100;
  const total = amount + taxAmount;

  const onSubmit = async (data: InvoiceFormData) => {
    setLoading(true);
    const payload: any = {
      ...data,
      project_id: data.project_id || null,
      payment_method: data.payment_method || null,
      notes: data.notes || null,
    };

    const result = isEditing
      ? await updateInvoice(invoice.id, payload)
      : await createInvoice(payload);
    setLoading(false);

    if (result.success) {
      toast.success(isEditing ? "Factura actualizada" : "Factura creada");
      router.push("/facturas");
      router.refresh();
    } else {
      toast.error("Error al guardar", { description: result.error });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader><CardTitle className="text-base">Datos de la factura</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="invoice_number">Número de factura *</Label>
            <Input id="invoice_number" {...register("invoice_number")} />
            {errors.invoice_number && <p className="text-xs text-destructive">{errors.invoice_number.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Cliente *</Label>
            <Select defaultValue={invoice?.client_id ?? ""} onValueChange={(v) => setValue("client_id", v)}>
              <SelectTrigger><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
              <SelectContent>
                {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.client_id && <p className="text-xs text-destructive">{errors.client_id.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Proyecto</Label>
            <Select defaultValue={invoice?.project_id ?? "none"} onValueChange={(v) => setValue("project_id", v === "none" ? null : v)}>
              <SelectTrigger><SelectValue placeholder="Sin proyecto" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin proyecto</SelectItem>
                {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {isEditing && (
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select defaultValue={invoice?.status ?? "pending"} onValueChange={(v) => setValue("status", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="sent">Enviada</SelectItem>
                  <SelectItem value="paid">Pagada</SelectItem>
                  <SelectItem value="overdue">Vencida</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="concept">Concepto *</Label>
            <Input id="concept" placeholder="Ej. Desarrollo web — Fase 1" {...register("concept")} />
            {errors.concept && <p className="text-xs text-destructive">{errors.concept.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="issue_date">Fecha de emisión *</Label>
            <Input id="issue_date" type="date" {...register("issue_date")} />
            {errors.issue_date && <p className="text-xs text-destructive">{errors.issue_date.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="due_date">Fecha de vencimiento *</Label>
            <Input id="due_date" type="date" {...register("due_date")} />
            {errors.due_date && <p className="text-xs text-destructive">{errors.due_date.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Método de pago</Label>
            <Select defaultValue={invoice?.payment_method ?? "transfer"} onValueChange={(v) => setValue("payment_method", v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="transfer">Transferencia</SelectItem>
                <SelectItem value="card">Tarjeta</SelectItem>
                <SelectItem value="direct_debit">Domiciliación</SelectItem>
                <SelectItem value="cash">Efectivo</SelectItem>
                <SelectItem value="otro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Cálculo de importes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-4 w-4" />Importes
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="amount">Base imponible *</Label>
            <div className="flex gap-2">
              <Input id="amount" type="number" step="0.01" min="0" placeholder="0.00" className="flex-1" {...register("amount")} />
              <Select defaultValue={invoice?.currency ?? "EUR"} onValueChange={(v) => setValue("currency", v as any)}>
                <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tax_rate">IVA (%)</Label>
            <Select defaultValue={String(invoice?.tax_rate ?? 21)} onValueChange={(v) => setValue("tax_rate", Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">0% (exento)</SelectItem>
                <SelectItem value="4">4% (superreducido)</SelectItem>
                <SelectItem value="10">10% (reducido)</SelectItem>
                <SelectItem value="21">21% (general)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Total (calculado)</Label>
            <div className="h-10 flex items-center px-3 rounded-md border border-border bg-muted/50">
              <span className="font-bold text-income text-base">{formatCurrency(total || 0)}</span>
            </div>
          </div>

          {amount > 0 && (
            <div className="sm:col-span-3 flex gap-6 text-xs text-muted-foreground border-t border-border pt-3">
              <span>Base: {formatCurrency(amount)}</span>
              <span>IVA {taxRate}%: +{formatCurrency(taxAmount)}</span>
              <span className="font-semibold text-foreground">Total: {formatCurrency(total)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" variant="gnerai" disabled={loading}>
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Guardando...</> : <><Save className="h-4 w-4" />{isEditing ? "Guardar cambios" : "Crear factura"}</>}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>Cancelar</Button>
      </div>
    </form>
  );
}
