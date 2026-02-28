"use client";

import { useState } from "react";
import { Pencil, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import { deleteExpenseTransaction, updateExpenseTransaction } from "@/app/(dashboard)/gastos/actions";
import type { PaymentMethod } from "@/types";

interface ExpenseTransactionActionsProps {
  transaction: {
    id: string;
    amount: number;
    date: string;
    payment_method?: PaymentMethod | null;
    notes?: string | null;
  };
}

export function ExpenseTransactionActions({ transaction }: ExpenseTransactionActionsProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [amount, setAmount] = useState(String(transaction.amount ?? 0));
  const [date, setDate] = useState((transaction.date ?? "").slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "none">(
    transaction.payment_method ?? "none"
  );
  const [notes, setNotes] = useState(transaction.notes ?? "");

  const handleSave = async () => {
    const parsedAmount = Number.parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error("El importe debe ser mayor que cero");
      return;
    }

    if (!date) {
      toast.error("La fecha es obligatoria");
      return;
    }

    setLoadingEdit(true);
    const result = await updateExpenseTransaction(transaction.id, {
      amount: parsedAmount,
      date,
      payment_method: paymentMethod === "none" ? null : paymentMethod,
      notes: notes.trim() || null,
    });
    setLoadingEdit(false);

    if (!result.success) {
      toast.error("No se pudo actualizar el pago", { description: result.error });
      return;
    }

    toast.success("Pago actualizado");
    setEditOpen(false);
  };

  const handleDelete = async () => {
    setLoadingDelete(true);
    const result = await deleteExpenseTransaction(transaction.id);
    setLoadingDelete(false);

    if (!result.success) {
      toast.error("No se pudo eliminar el pago", { description: result.error });
      return;
    }

    toast.success("Pago eliminado");
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-7 w-7"
        onClick={() => setEditOpen(true)}
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar pago</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el registro del pago de gasto.
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
            <DialogTitle>Editar pago de gasto</DialogTitle>
            <DialogDescription>Actualiza la fecha, importe o método de pago.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="expense-transaction-date">Fecha</Label>
              <Input
                id="expense-transaction-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-transaction-amount">Importe</Label>
              <Input
                id="expense-transaction-amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
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
              <Label htmlFor="expense-transaction-notes">Notas</Label>
              <textarea
                id="expense-transaction-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="flex min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setEditOpen(false)} disabled={loadingEdit}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSave} disabled={loadingEdit}>
              {loadingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
