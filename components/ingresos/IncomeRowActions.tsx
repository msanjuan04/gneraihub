"use client";

import { useMemo, useState } from "react";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { updateIncomeTransaction, deleteIncomeTransaction } from "@/app/(dashboard)/ingresos/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Currency, PaymentMethod } from "@/types";

interface IncomeRowActionsProps {
  income: {
    id: string;
    concept: string;
    amount: number;
    currency: Currency;
    date: string;
    payment_method?: PaymentMethod | null;
    notes?: string | null;
    client_id?: string | null;
    project_id?: string | null;
    is_manual: boolean;
  };
  clients: Array<{ id: string; name: string }>;
  projects: Array<{ id: string; name: string; client_id?: string | null }>;
}

export function IncomeRowActions({ income, clients, projects }: IncomeRowActionsProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  const [concept, setConcept] = useState(income.concept);
  const [amount, setAmount] = useState(String(income.amount));
  const [currency, setCurrency] = useState<Currency>(income.currency);
  const [date, setDate] = useState(income.date.slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "none">(
    income.payment_method ?? "none"
  );
  const [clientId, setClientId] = useState(income.client_id ?? "none");
  const [projectId, setProjectId] = useState(income.project_id ?? "none");
  const [notes, setNotes] = useState(income.notes ?? "");

  const filteredProjects = useMemo(() => {
    if (clientId === "none") return projects;
    return projects.filter((project) => !project.client_id || project.client_id === clientId);
  }, [clientId, projects]);

  if (!income.is_manual) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const handleSave = async () => {
    const parsedAmount = Number.parseFloat(amount);
    if (!concept.trim()) {
      toast.error("El concepto es obligatorio");
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error("El importe debe ser mayor que cero");
      return;
    }
    if (!date) {
      toast.error("La fecha es obligatoria");
      return;
    }

    setLoadingEdit(true);
    const result = await updateIncomeTransaction(income.id, {
      concept: concept.trim(),
      amount: parsedAmount,
      currency,
      date,
      payment_method: paymentMethod === "none" ? undefined : paymentMethod,
      client_id: clientId === "none" ? undefined : clientId,
      project_id: projectId === "none" ? undefined : projectId,
      notes: notes.trim() || undefined,
    });
    setLoadingEdit(false);

    if (!result.success) {
      toast.error("No se pudo actualizar el ingreso", { description: result.error });
      return;
    }

    toast.success("Ingreso actualizado");
    setEditOpen(false);
  };

  const handleDelete = async () => {
    setLoadingDelete(true);
    const result = await deleteIncomeTransaction(income.id);
    setLoadingDelete(false);

    if (!result.success) {
      toast.error("No se pudo eliminar el ingreso", { description: result.error });
      return;
    }

    toast.success("Ingreso eliminado");
  };

  return (
    <div className="flex items-center justify-end gap-1">
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditOpen(true)}>
        <Pencil className="h-3.5 w-3.5" />
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar ingreso manual</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el ingreso manual seleccionado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loadingDelete}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={loadingDelete}>
              {loadingDelete ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar ingreso manual</DialogTitle>
            <DialogDescription>
              Solo puedes editar ingresos creados manualmente.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor={`income-concept-${income.id}`}>Concepto</Label>
              <Input
                id={`income-concept-${income.id}`}
                value={concept}
                onChange={(event) => setConcept(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`income-amount-${income.id}`}>Importe</Label>
              <Input
                id={`income-amount-${income.id}`}
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Divisa</Label>
              <Select value={currency} onValueChange={(value) => setCurrency(value as Currency)}>
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
              <Label htmlFor={`income-date-${income.id}`}>Fecha</Label>
              <Input
                id={`income-date-${income.id}`}
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Método de pago</Label>
              <Select
                value={paymentMethod}
                onValueChange={(value) => setPaymentMethod(value as PaymentMethod | "none")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Método de pago" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin definir</SelectItem>
                  <SelectItem value="card">Tarjeta</SelectItem>
                  <SelectItem value="transfer">Transferencia</SelectItem>
                  <SelectItem value="direct_debit">Domiciliación</SelectItem>
                  <SelectItem value="cash">Efectivo</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={clientId} onValueChange={setClientId}>
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
              <Select value={projectId} onValueChange={setProjectId}>
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
              <Label htmlFor={`income-notes-${income.id}`}>Notas</Label>
              <textarea
                id={`income-notes-${income.id}`}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="flex min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={loadingEdit}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loadingEdit}>
              {loadingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
