"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, Pencil, Trash2 } from "lucide-react";
import {
  deleteMensualidadPayment,
  registerMensualidadPayment,
  updateMensualidadPayment,
} from "@/app/(dashboard)/pagos/actions";
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
import type { PaymentMethod } from "@/types";

interface RegisterPaymentButtonProps {
  mensualidadId: string;
  dueDate: string;
}

export function RegisterPaymentButton({ mensualidadId, dueDate }: RegisterPaymentButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    const result = await registerMensualidadPayment({
      mensualidadId,
      paymentDate: dueDate,
    });
    setLoading(false);

    if (result.success) {
      toast.success("Cobro registrado");
    } else {
      toast.error("No se pudo registrar el cobro", {
        description: result.error,
      });
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleClick}
      disabled={loading}
      className="h-7 text-xs text-green-600 border-green-300 hover:bg-green-50 hover:text-green-700"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <>
          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
          Registrar cobro
        </>
      )}
    </Button>
  );
}

interface EditPaymentButtonProps {
  paymentId: string;
  paymentDate: string;
  amount: number;
  paymentMethod?: PaymentMethod | null;
  notes?: string | null;
}

export function EditPaymentButton({
  paymentId,
  paymentDate,
  amount,
  paymentMethod,
  notes,
}: EditPaymentButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(paymentDate.slice(0, 10));
  const [localAmount, setLocalAmount] = useState(String(amount));
  const [method, setMethod] = useState<PaymentMethod | "none">(paymentMethod ?? "none");
  const [localNotes, setLocalNotes] = useState(notes ?? "");

  const handleSave = async () => {
    const parsedAmount = Number.parseFloat(localAmount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error("El importe debe ser mayor que cero");
      return;
    }

    if (!date) {
      toast.error("La fecha de pago es obligatoria");
      return;
    }

    setLoading(true);
    const result = await updateMensualidadPayment(paymentId, {
      payment_date: date,
      amount: parsedAmount,
      payment_method: method === "none" ? null : method,
      notes: localNotes.trim() || null,
    });
    setLoading(false);

    if (!result.success) {
      toast.error("No se pudo actualizar el cobro", { description: result.error });
      return;
    }

    toast.success("Cobro actualizado");
    setOpen(false);
  };

  return (
    <>
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setOpen(true)}>
        <Pencil className="h-3.5 w-3.5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar cobro</DialogTitle>
            <DialogDescription>
              Actualiza fecha, importe, método de pago o notas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`payment-date-${paymentId}`}>Fecha de pago</Label>
              <Input
                id={`payment-date-${paymentId}`}
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`payment-amount-${paymentId}`}>Importe</Label>
              <Input
                id={`payment-amount-${paymentId}`}
                type="number"
                min="0"
                step="0.01"
                value={localAmount}
                onChange={(event) => setLocalAmount(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Método de pago</Label>
              <Select value={method} onValueChange={(value) => setMethod(value as PaymentMethod | "none")}>
                <SelectTrigger>
                  <SelectValue placeholder="Método" />
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
              <Label htmlFor={`payment-notes-${paymentId}`}>Notas</Label>
              <textarea
                id={`payment-notes-${paymentId}`}
                value={localNotes}
                onChange={(event) => setLocalNotes(event.target.value)}
                className="flex min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface DeletePaymentButtonProps {
  paymentId: string;
}

export function DeletePaymentButton({ paymentId }: DeletePaymentButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    const result = await deleteMensualidadPayment(paymentId);
    setLoading(false);

    if (result.success) {
      toast.success("Cobro eliminado");
    } else {
      toast.error("No se pudo eliminar", { description: result.error });
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          disabled={loading}
          className="h-7 w-7 text-destructive hover:text-destructive"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar cobro</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción eliminará el registro del cobro de mensualidad.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleClick} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
