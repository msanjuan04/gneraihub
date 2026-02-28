"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Send, XCircle, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { convertQuoteToInvoice, updateQuoteStatus } from "@/app/(dashboard)/presupuestos/actions";
import type { QuoteStatus } from "@/types";

interface QuoteActionButtonsProps {
  quoteId: string;
  status: QuoteStatus;
  convertedInvoiceId?: string | null;
}

export function QuoteActionButtons({
  quoteId,
  status,
  convertedInvoiceId,
}: QuoteActionButtonsProps) {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const handleStatusChange = async (nextStatus: QuoteStatus) => {
    setLoadingAction(nextStatus);
    const result = await updateQuoteStatus(quoteId, nextStatus);
    setLoadingAction(null);

    if (!result.success) {
      toast.error("No se pudo actualizar el estado", { description: result.error });
      return;
    }

    toast.success("Estado actualizado");
    router.refresh();
  };

  const handleConvert = async () => {
    setLoadingAction("convert");
    const result = await convertQuoteToInvoice(quoteId);
    setLoadingAction(null);

    if (!result.success || !result.data?.invoiceId) {
      toast.error("No se pudo convertir a factura", { description: result.error });
      return;
    }

    toast.success("Presupuesto convertido en factura");
    router.push(`/facturas/${result.data.invoiceId}`);
    router.refresh();
  };

  if (convertedInvoiceId) {
    return (
      <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
        <Link href={`/facturas/${convertedInvoiceId}`}>
          <FileText className="h-4 w-4" />
          Ver factura
        </Link>
      </Button>
    );
  }

  return (
    <div className="grid gap-2 sm:flex sm:flex-wrap">
      {status !== "sent" && status !== "invoiced" && (
        <Button
          variant="outline"
          size="sm"
          className="w-full sm:w-auto"
          onClick={() => handleStatusChange("sent")}
          disabled={!!loadingAction}
        >
          {loadingAction === "sent" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Marcar enviado
        </Button>
      )}
      {status !== "accepted" && status !== "invoiced" && (
        <Button
          variant="outline"
          size="sm"
          className="w-full sm:w-auto"
          onClick={() => handleStatusChange("accepted")}
          disabled={!!loadingAction}
        >
          {loadingAction === "accepted" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          Marcar aceptado
        </Button>
      )}
      {status !== "rejected" && status !== "invoiced" && (
        <Button
          variant="outline"
          size="sm"
          className="w-full sm:w-auto"
          onClick={() => handleStatusChange("rejected")}
          disabled={!!loadingAction}
        >
          {loadingAction === "rejected" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          Marcar rechazado
        </Button>
      )}
      {status !== "invoiced" && (
        <Button
          variant="gnerai"
          size="sm"
          className="w-full sm:w-auto"
          onClick={handleConvert}
          disabled={!!loadingAction}
        >
          {loadingAction === "convert" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
          Convertir a factura
        </Button>
      )}
    </div>
  );
}
