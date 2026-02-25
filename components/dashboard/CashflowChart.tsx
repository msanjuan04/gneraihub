"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency, formatCompact } from "@/lib/utils/currency";
import { formatMonthLabel } from "@/lib/utils/dates";
import type { CashflowMonth } from "@/types";

interface CashflowChartProps {
  data: CashflowMonth[];
}

// Tooltip personalizado para el gráfico
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-xl text-sm">
      <p className="font-semibold text-foreground mb-2">
        {label ? formatMonthLabel(label) : label}
      </p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-6 py-0.5">
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground capitalize">{entry.name}</span>
          </div>
          <span className="font-medium text-foreground">
            {formatCurrency(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function CashflowChart({ data }: CashflowChartProps) {
  // Preparar datos para recharts
  const chartData = data.map((month) => ({
    month: month.month,
    label: month.label,
    Ingresos: month.incomeReal,
    "Ingresos prev.": month.incomeExpected - month.incomeReal, // diferencia
    Gastos: month.expenseReal,
    "Gastos prev.": month.expenseExpected - month.expenseReal,
    Neto: month.netReal,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cashflow mensual</CardTitle>
        <CardDescription>Ingresos y gastos reales vs previstos — últimos 6 meses</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart
            data={chartData}
            margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
            barGap={2}
            barCategoryGap="30%"
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tickFormatter={(v) => formatMonthLabel(v)}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => formatCompact(v).replace(/\s/g, "")}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={60}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }}
            />
            <Legend
              wrapperStyle={{
                fontSize: "12px",
                color: "hsl(var(--muted-foreground))",
                paddingTop: "12px",
              }}
            />
            <ReferenceLine y={0} stroke="hsl(var(--border))" />

            {/* Barras de ingresos reales */}
            <Bar
              dataKey="Ingresos"
              fill="#10b981"
              radius={[3, 3, 0, 0]}
              maxBarSize={40}
            />
            {/* Barras de gastos reales */}
            <Bar
              dataKey="Gastos"
              fill="#ef4444"
              radius={[3, 3, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
