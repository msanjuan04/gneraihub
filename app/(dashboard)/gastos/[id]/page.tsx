import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ExpenseForm } from "@/components/gastos/ExpenseForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils/currency";
import { getNextPaymentDate, formatDate, intervalLabel } from "@/lib/utils/dates";

interface Props {
  params: { id: string };
}

export default async function EditarGastoPage({ params }: Props) {
  const supabase = await createClient();

  const [expenseRes, vendorsRes, projectsRes] = await Promise.all([
    supabase
      .from("company_expenses")
      .select("*, vendor:vendors(*), project:projects(*)")
      .eq("id", params.id)
      .single(),
    supabase.from("vendors").select("*").order("name"),
    supabase.from("projects").select("*").eq("status", "active").order("name"),
  ]);

  if (expenseRes.error || !expenseRes.data) {
    notFound();
  }

  const expense = expenseRes.data as any;
  const nextPayment = getNextPaymentDate(expense);

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
      </div>

      <ExpenseForm
        expense={expense}
        vendors={vendorsRes.data ?? []}
        projects={projectsRes.data ?? []}
      />
    </div>
  );
}
