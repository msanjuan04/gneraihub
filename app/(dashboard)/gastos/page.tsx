import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SubscriptionTable } from "@/components/gastos/SubscriptionTable";
import { formatCurrency } from "@/lib/utils/currency";
import { getCurrentMonthRange } from "@/lib/utils/dates";
import { PlusCircle, TrendingDown, RefreshCcw, Receipt } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * Página principal de Gastos.
 * Muestra dos tabs: Suscripciones (recurrentes) y Variables (puntuales).
 */
export default async function GastosPage() {
  const supabase = await createClient();
  const { start: monthStart, end: monthEnd } = getCurrentMonthRange();
  const monthStartISO = monthStart.toISOString().split("T")[0];
  const monthEndISO = monthEnd.toISOString().split("T")[0];

  const [expensesRes, transactionsRes, monthTotalsRes] = await Promise.all([
    supabase
      .from("company_expenses")
      .select("id,name,category,amount,currency,interval,billing_day,billing_date,start_date,end_date,status,vendor:vendors(name)")
      .order("created_at", { ascending: false }),
    supabase
      .from("expense_transactions")
      .select("id,name,category,amount,currency,date,status,vendor:vendors(name)")
      .order("date", { ascending: false })
      .limit(50),
    supabase
      .from("expense_transactions")
      .select("amount")
      .gte("date", monthStartISO)
      .lte("date", monthEndISO),
  ]);

  const expenses = (expensesRes.data ?? []) as any[];
  const transactions = (transactionsRes.data ?? []) as any[];

  // Separar recurrentes de puntuales
  const subscriptions = expenses.filter((e) => e.interval !== "one_off");
  const activeSubscriptions = subscriptions.filter((e) => e.status === "active");

  // Calcular costo mensual total de suscripciones activas
  const monthlyCost = activeSubscriptions.reduce((sum, exp) => {
    if (exp.interval === "monthly") return sum + exp.amount;
    if (exp.interval === "yearly") return sum + exp.amount / 12;
    if (exp.interval === "quarterly") return sum + exp.amount / 3;
    return sum;
  }, 0);

  const monthVariableTotal = (monthTotalsRes.data ?? []).reduce((sum, t) => sum + (t.amount ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Header con KPIs rápidos */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <RefreshCcw className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Costo mensual recurrente</p>
                <p className="text-xl font-bold text-expense">
                  {formatCurrency(monthlyCost)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                <TrendingDown className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Gastos variables este mes</p>
                <p className="text-xl font-bold text-expense">
                  {formatCurrency(monthVariableTotal)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                <Receipt className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Suscripciones activas</p>
                <p className="text-xl font-bold">
                  {activeSubscriptions.length}
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    / {subscriptions.length} total
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Suscripciones / Variables */}
      <Tabs defaultValue="subscriptions">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="subscriptions" className="gap-2">
              <RefreshCcw className="h-3.5 w-3.5" />
              Suscripciones
              <Badge variant="secondary" className="ml-1">
                {subscriptions.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="variables" className="gap-2">
              <Receipt className="h-3.5 w-3.5" />
              Variables
              <Badge variant="secondary" className="ml-1">
                {transactions.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <Button variant="gnerai" size="sm" asChild>
            <Link href="/gastos/nuevo">
              <PlusCircle className="h-4 w-4" />
              Nuevo gasto
            </Link>
          </Button>
        </div>

        {/* Tab Suscripciones */}
        <TabsContent value="subscriptions">
          <SubscriptionTable expenses={subscriptions} />
        </TabsContent>

        {/* Tab Variables */}
        <TabsContent value="variables">
          <div className="rounded-lg border border-border overflow-hidden">
            {transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Receipt className="h-10 w-10 text-muted-foreground/40 mb-4" />
                <p className="text-sm font-medium text-muted-foreground">
                  No hay gastos variables registrados
                </p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Nombre
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">
                      Categoría
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                      Importe
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">
                      Fecha
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t, i) => (
                    <tr
                      key={t.id}
                      className={
                        i % 2 === 0
                          ? "bg-background hover:bg-muted/30"
                          : "bg-muted/10 hover:bg-muted/30"
                      }
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{t.name}</p>
                          {t.vendor?.name && (
                            <p className="text-xs text-muted-foreground">{t.vendor.name}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {t.category ? (
                          <Badge variant="outline" className="font-normal">
                            {t.category}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-semibold text-expense">
                          {formatCurrency(t.amount, t.currency)}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
                        {new Date(t.date).toLocaleDateString("es-ES")}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={t.status === "paid" ? "success" : "warning"}>
                          {t.status === "paid" ? "Pagado" : "Pendiente"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
