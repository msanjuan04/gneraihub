import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { calculateCashflow, groupExpensesByCategory } from "@/lib/utils/cashflow";
import { getMonthRange, formatMonthLabel } from "@/lib/utils/dates";
import { formatCurrency } from "@/lib/utils/currency";
import { CashflowChart } from "@/components/dashboard/CashflowChart";
import { cn } from "@/lib/utils";

export default async function CashflowPage() {
  const supabase = await createClient();

  const [expensesRes, expenseTransactionsRes, invoicesRes, incomeTransactionsRes] = await Promise.all([
    supabase
      .from("company_expenses")
      .select("id,amount,status,interval,billing_day,billing_date,start_date,end_date")
      .eq("status", "active"),
    supabase
      .from("expense_transactions")
      .select("date,status,amount,category"),
    supabase
      .from("invoices")
      .select("due_date,status,total"),
    supabase
      .from("income_transactions")
      .select("date,amount"),
  ]);

  const expenses = expensesRes.data ?? [];
  const expenseTransactions = expenseTransactionsRes.data ?? [];
  const invoices = (invoicesRes.data ?? []) as any[];
  const incomeTransactions = incomeTransactionsRes.data ?? [];

  // 3 meses atrás + 3 hacia adelante
  const months = getMonthRange(3, 3);
  const cashflowData = calculateCashflow(months, {
    expenses: expenses as any,
    expenseTransactions: expenseTransactions as any,
    invoices,
    incomeTransactions: incomeTransactions as any,
  });

  // Desglose por categoría del mes actual
  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentMonthTransactions = expenseTransactions.filter(
    (t) => t.date?.startsWith(currentMonth)
  ) as any[];
  const categoryBreakdown = groupExpensesByCategory(currentMonthTransactions);

  return (
    <div className="space-y-6">
      {/* Gráfico principal */}
      <CashflowChart data={cashflowData} />

      {/* Tabla mensual detallada */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Desglose mensual</CardTitle>
          <CardDescription>Entradas y salidas previstas vs reales por mes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Mes</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">Ingresos prev.</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">Ingresos real</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">Gastos prev.</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">Gastos real</th>
                  <th className="text-right py-2 pl-3 font-medium text-muted-foreground">Neto real</th>
                </tr>
              </thead>
              <tbody>
                {cashflowData.map((month, i) => {
                  const isCurrentMonth = month.month === currentMonth;
                  return (
                    <tr
                      key={month.month}
                      className={cn(
                        "border-b border-border/50 last:border-0",
                        isCurrentMonth && "bg-primary/5",
                        i % 2 === 0 && !isCurrentMonth ? "bg-background" : !isCurrentMonth ? "bg-muted/10" : ""
                      )}
                    >
                      <td className="py-3 pr-4">
                        <span className={cn("font-medium", isCurrentMonth && "text-primary")}>
                          {formatMonthLabel(month.month)}
                        </span>
                        {isCurrentMonth && (
                          <span className="ml-2 text-xs text-primary/70">(actual)</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right text-muted-foreground">
                        {formatCurrency(month.incomeExpected)}
                      </td>
                      <td className="py-3 px-3 text-right text-income font-medium">
                        {formatCurrency(month.incomeReal)}
                      </td>
                      <td className="py-3 px-3 text-right text-muted-foreground">
                        {formatCurrency(month.expenseExpected)}
                      </td>
                      <td className="py-3 px-3 text-right text-expense font-medium">
                        {formatCurrency(month.expenseReal)}
                      </td>
                      <td className={cn(
                        "py-3 pl-3 text-right font-bold",
                        month.netReal >= 0 ? "text-income" : "text-expense"
                      )}>
                        {month.netReal >= 0 ? "+" : ""}{formatCurrency(month.netReal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Desglose por categoría del mes actual */}
      {Object.keys(categoryBreakdown).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gastos por categoría — mes actual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(categoryBreakdown)
                .sort(([, a], [, b]) => b - a)
                .map(([category, amount]) => {
                  const total = Object.values(categoryBreakdown).reduce((s, v) => s + v, 0);
                  const pct = total > 0 ? (amount / total) * 100 : 0;
                  return (
                    <div key={category} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{category}</span>
                        <div className="flex gap-3">
                          <span className="text-muted-foreground text-xs">{pct.toFixed(1)}%</span>
                          <span className="font-medium text-expense">{formatCurrency(amount)}</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500/70 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
