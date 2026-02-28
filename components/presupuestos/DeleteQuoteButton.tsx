"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteQuote } from "@/app/(dashboard)/presupuestos/actions";
import { Button } from "@/components/ui/button";
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

interface DeleteQuoteButtonProps {
  quoteId: string;
  compact?: boolean;
}

export function DeleteQuoteButton({ quoteId, compact = false }: DeleteQuoteButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    const result = await deleteQuote(quoteId);
    setLoading(false);

    if (!result.success) {
      toast.error("No se pudo eliminar el presupuesto", { description: result.error });
      return;
    }

    toast.success("Presupuesto eliminado");
    router.push("/presupuestos");
    router.refresh();
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {compact ? (
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" />
            Eliminar
          </Button>
        ) : (
          <Button variant="destructive" size="sm" className="w-full sm:w-auto">
            <Trash2 className="h-4 w-4" />
            Eliminar
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar presupuesto</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción eliminará permanentemente el presupuesto.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
