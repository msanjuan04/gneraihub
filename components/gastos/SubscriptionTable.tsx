"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ExpenseStatusBadge, IntervalBadge } from "./ExpenseStatusBadge";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate, getNextPaymentDate } from "@/lib/utils/dates";
import type { CompanyExpense } from "@/types";
import {
  MoreHorizontal,
  Pencil,
  Pause,
  Play,
  X,
  Copy,
  PlusCircle,
  TrendingDown,
} from "lucide-react";
import { toast } from "sonner";
import { updateExpenseStatus, duplicateExpense } from "@/app/(dashboard)/gastos/actions";

interface SubscriptionTableProps {
  expenses: CompanyExpense[];
}

export function SubscriptionTable({ expenses }: SubscriptionTableProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleStatusChange = async (
    id: string,
    newStatus: "active" | "paused" | "cancelled"
  ) => {
    setLoadingId(id);
    const result = await updateExpenseStatus(id, newStatus);
    setLoadingId(null);

    if (result.success) {
      toast.success(
        newStatus === "active"
          ? "Gasto reactivado"
          : newStatus === "paused"
          ? "Gasto pausado"
          : "Gasto cancelado"
      );
    } else {
      toast.error("Error al actualizar", { description: result.error });
    }
  };

  const handleDuplicate = async (id: string) => {
    const result = await duplicateExpense(id);
    if (result.success) {
      toast.success("Gasto duplicado correctamente");
    } else {
      toast.error("Error al duplicar", { description: result.error });
    }
  };

  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-lg">
        <TrendingDown className="h-10 w-10 text-muted-foreground/40 mb-4" />
        <p className="text-sm font-medium text-muted-foreground">
          No hay suscripciones activas
        </p>
        <p className="text-xs text-muted-foreground/60 mt-1 mb-4">
          Añade tus gastos recurrentes para hacer seguimiento
        </p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/gastos/nuevo">
            <PlusCircle className="h-4 w-4 mr-2" />
            Añadir gasto recurrente
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nombre</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">
              Categoría
            </th>
            <th className="text-right px-4 py-3 font-medium text-muted-foreground">Importe</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">
              Periodicidad
            </th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">
              Próximo cobro
            </th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">
              Estado
            </th>
            <th className="px-4 py-3 w-12" />
          </tr>
        </thead>
        <tbody>
          {expenses.map((expense, i) => {
            const nextPayment = getNextPaymentDate(expense);
            const isLoading = loadingId === expense.id;

            return (
              <tr
                key={expense.id}
                className={
                  i % 2 === 0
                    ? "bg-background hover:bg-muted/30"
                    : "bg-muted/10 hover:bg-muted/30"
                }
              >
                {/* Nombre */}
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <Link
                      href={`/gastos/${expense.id}`}
                      className="font-medium hover:text-primary transition-colors"
                    >
                      {expense.name}
                    </Link>
                    {expense.vendor?.name && (
                      <span className="text-xs text-muted-foreground">
                        {expense.vendor.name}
                      </span>
                    )}
                  </div>
                </td>

                {/* Categoría */}
                <td className="px-4 py-3 hidden md:table-cell">
                  {expense.category ? (
                    <Badge variant="outline" className="font-normal">
                      {expense.category}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>

                {/* Importe */}
                <td className="px-4 py-3 text-right">
                  <span className="font-semibold text-expense">
                    {formatCurrency(expense.amount, expense.currency as any)}
                  </span>
                </td>

                {/* Periodicidad */}
                <td className="px-4 py-3 hidden sm:table-cell">
                  <IntervalBadge interval={expense.interval as any} />
                </td>

                {/* Próximo cobro */}
                <td className="px-4 py-3 hidden lg:table-cell">
                  {nextPayment ? (
                    <span className="text-muted-foreground">
                      {formatDate(nextPayment)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>

                {/* Estado */}
                <td className="px-4 py-3">
                  <ExpenseStatusBadge status={expense.status as any} />
                </td>

                {/* Acciones */}
                <td className="px-4 py-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={isLoading}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Acciones</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/gastos/${expense.id}`}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(expense.id)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {expense.status === "active" && (
                        <DropdownMenuItem
                          onClick={() => handleStatusChange(expense.id, "paused")}
                        >
                          <Pause className="mr-2 h-4 w-4" />
                          Pausar
                        </DropdownMenuItem>
                      )}
                      {expense.status === "paused" && (
                        <DropdownMenuItem
                          onClick={() => handleStatusChange(expense.id, "active")}
                        >
                          <Play className="mr-2 h-4 w-4" />
                          Reactivar
                        </DropdownMenuItem>
                      )}
                      {expense.status !== "cancelled" && (
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleStatusChange(expense.id, "cancelled")}
                        >
                          <X className="mr-2 h-4 w-4" />
                          Cancelar
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
