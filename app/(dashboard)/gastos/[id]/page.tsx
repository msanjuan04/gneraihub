import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ExpenseForm } from "@/components/gastos/ExpenseForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils/currency";
import { getNextPaymentDate, formatDate, intervalLabel } from "@/lib/utils/dates";
import { Card, CardContent } from "@/components/ui/card";
import { ExpenseTransactionActions } from "@/components/gastos/ExpenseTransactionActions";
import { DeleteExpenseButton } from "@/components/gastos/DeleteExpenseButton";

interface Props {
  params: { id: string };
}

export default async function EditarGastoPage({ params }: Props) {
  const supabase = await createClient();

  const [expenseRes, vendorsRes, projectsRes, transactionsRes] = await Promise.all([
    supabase
      .from("company_expenses")
      .select("*, vendor:vendors(*), project:projects(*)")
      .eq("id", params.id)
      .single(),
    supabase.from("vendors").select("*").order("name"),
    supabase.from("projects").select("*").eq("status", "active").order("name"),
    supabase
      .from("expense_transactions")
      .select("id,name,amount,currency,date,status,payment_method,notes,receipt_url")
      .eq("company_expense_id", params.id)
      .order("date", { ascending: false }),
  ]);

  if (expenseRes.error || !expenseRes.data) {
    notFound();
  }

  const expense = expenseRes.data as any;
  const nextPayment = getNextPaymentDate(expense);
  const transactions = transactionsRes.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8">
          <Link href="/gastos">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{expense.name}</h1>
            <Badge variant={expense.status === "active" ? "success" : "warning"}>
              {expense.status === "active" ? "Activo" : expense.status === "paused" ? "Pausado" : "Cancelado"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(expense.amount, expense.currency)} · {intervalLabel(expense.interval)}
            {nextPayment && ` · Próximo: ${formatDate(nextPayment)}`}
          </p>
        </div>
        <DeleteExpenseButton expenseId={expense.id} />
      </div>

      <ExpenseForm
        expense={expense}
        vendors={vendorsRes.data ?? []}
        projects={projectsRes.data ?? []}
      />

      <Card>
        <CardContent className="pt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Historial de pagos</h2>
            <span className="text-xs text-muted-foreground">
              {transactions.length} registro{transactions.length !== 1 ? "s" : ""}
            </span>
          </div>

          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay pagos registrados para este gasto.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Fecha</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Concepto</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Importe</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Estado</th>
                    <th className="px-4 py-2.5 w-24" />
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction: any, index: number) => (
                    <tr key={transaction.id} className={index % 2 === 0 ? "bg-background" : "bg-muted/10"}>
                      <td className="px-4 py-2.5">{formatDate(transaction.date)}</td>
                      <td className="px-4 py-2.5">{transaction.name}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-expense">
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant={transaction.status === "paid" ? "success" : "warning"}>
                          {transaction.status === "paid" ? "Pagado" : "Pendiente"}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <ExpenseTransactionActions
                          transaction={{
                            id: transaction.id,
                            amount: transaction.amount,
                            date: transaction.date,
                            payment_method: transaction.payment_method,
                            notes: transaction.notes,
                            receipt_url: transaction.receipt_url,
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
