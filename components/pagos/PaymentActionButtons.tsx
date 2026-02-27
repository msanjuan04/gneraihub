"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, Trash2 } from "lucide-react";
import {
  deleteMensualidadPayment,
  registerMensualidadPayment,
} from "@/app/(dashboard)/pagos/actions";

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
    <Button
      size="icon"
      variant="ghost"
      onClick={handleClick}
      disabled={loading}
      className="h-7 w-7 text-destructive hover:text-destructive"
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
    </Button>
  );
}
