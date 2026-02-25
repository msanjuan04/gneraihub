import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import type { Currency } from "@/types";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  expected: number;
  real: number;
  currency?: Currency;
  type: "income" | "expense" | "net";
  icon?: React.ReactNode;
}

function StatCard({ title, expected, real, currency = "EUR", type, icon }: StatCardProps) {
  const diff = real - expected;
  const diffPct = expected !== 0 ? (diff / Math.abs(expected)) * 100 : 0;

  // Para gastos, positivo es malo; para ingresos/neto, positivo es bueno
  const isPositive = type === "expense" ? diff < 0 : diff > 0;
  const isNeutral = diff === 0;

  const accentColors = {
    income: "text-green-500 dark:text-green-400",
    expense: "text-red-500 dark:text-red-400",
    net: real >= 0 ? "text-green-500 dark:text-green-400" : "text-red-500 dark:text-red-400",
  };

  return (
    <Card className="relative overflow-hidden">
      {/* Decoración de fondo */}
      <div
        className={cn(
          "absolute right-0 top-0 h-full w-1 rounded-r-lg",
          type === "income" && "bg-green-500/30",
          type === "expense" && "bg-red-500/30",
          type === "net" && (real >= 0 ? "bg-green-500/30" : "bg-red-500/30")
        )}
      />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={cn("p-1.5 rounded-md bg-muted/50", accentColors[type])}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        {/* Valor real prominente */}
        <div className={cn("text-2xl font-bold", accentColors[type])}>
          {formatCurrency(real, currency)}
        </div>

        {/* Previsto */}
        <p className="text-xs text-muted-foreground mt-1">
          Previsto: {formatCurrency(expected, currency)}
        </p>

        {/* Variación previsto vs real */}
        {!isNeutral && (
          <div className="flex items-center gap-1 mt-2">
            {isPositive ? (
              <ArrowUpRight className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
            )}
            <span
              className={cn(
                "text-xs font-medium",
                isPositive ? "text-green-500" : "text-red-500"
              )}
            >
              {Math.abs(diffPct).toFixed(1)}% vs previsto
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface StatsCardsProps {
  incomeExpected: number;
  incomeReal: number;
  expenseExpected: number;
  expenseReal: number;
  netExpected: number;
  netReal: number;
  currency?: Currency;
}

export function StatsCards({
  incomeExpected,
  incomeReal,
  expenseExpected,
  expenseReal,
  netExpected,
  netReal,
  currency = "EUR",
}: StatsCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard
        title="Ingresos este mes"
        expected={incomeExpected}
        real={incomeReal}
        currency={currency}
        type="income"
        icon={<TrendingUp className="h-4 w-4" />}
      />
      <StatCard
        title="Gastos este mes"
        expected={expenseExpected}
        real={expenseReal}
        currency={currency}
        type="expense"
        icon={<TrendingDown className="h-4 w-4" />}
      />
      <StatCard
        title="Neto este mes"
        expected={netExpected}
        real={netReal}
        currency={currency}
        type="net"
        icon={<Minus className="h-4 w-4" />}
      />
    </div>
  );
}
