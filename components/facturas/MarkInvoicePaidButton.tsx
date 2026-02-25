"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { markInvoicePaid } from "@/app/(dashboard)/facturas/actions";

interface MarkInvoicePaidButtonProps {
  invoiceId: string;
  amount: number;
}

export function MarkInvoicePaidButton({ invoiceId, amount }: MarkInvoicePaidButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleMarkPaid = async () => {
    setLoading(true);
    const result = await markInvoicePaid(invoiceId, amount);
    setLoading(false);

    if (result.success) {
      toast.success("Factura marcada como pagada", {
        description: "Se ha registrado el cobro automáticamente",
      });
    } else {
      toast.error("Error al marcar como pagada", { description: result.error });
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleMarkPaid}
      disabled={loading}
      className="h-7 px-2 text-xs text-green-500 border-green-500/30 hover:bg-green-500/10 hover:text-green-400"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <><CheckCircle className="h-3.5 w-3.5 mr-1" />Cobrada</>
      )}
    </Button>
  );
}
