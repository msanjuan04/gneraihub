"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { calculateAllocation } from "@/lib/utils/allocation";
import { formatCurrency } from "@/lib/utils/currency";
import type { Currency } from "@/types";
import { Percent } from "lucide-react";

interface AllocationBreakdownProps {
  /** Importe total (factura o ingreso). Si es factura emitida, suele incluir IVA. */
  amount: number;
  currency?: Currency;
  /** true = amount es total con IVA; false = amount es base imponible */
  totalIncluyeIva?: boolean;
  title?: string;
  /** Si false, no muestra el encabezado del card (útil cuando se incrusta en otra tarjeta) */
  showHeader?: boolean;
  className?: string;
}

/** Filas del desglose tipo Excel: subcuenta | % | importe */
const ROW_STYLE = {
  impuesto: "text-amber-600",
  neto: "font-semibold bg-muted/40",
  subcuenta: "",
  beneficio: "text-green-600 font-medium",
} as const;

export function AllocationBreakdown({
  amount,
  currency = "EUR",
  totalIncluyeIva = true,
  title = "Desglose por subcuentas",
  showHeader = true,
  className,
}: AllocationBreakdownProps) {
  const breakdown = useMemo(
    () => calculateAllocation(amount, totalIncluyeIva),
    [amount, totalIncluyeIva]
  );

  if (!amount || amount <= 0) {
    return null;
  }

  const rows: { subcuenta: string; pct: string; importe: number; rowStyle?: keyof typeof ROW_STYLE }[] = [
    { subcuenta: "Total (con IVA)", pct: "100%", importe: breakdown.total },
    { subcuenta: "Base imponible", pct: "", importe: breakdown.baseImponible },
    { subcuenta: "IVA (21%)", pct: "21%", importe: breakdown.iva, rowStyle: "impuesto" },
    { subcuenta: "Retención IRPF (7%)", pct: "7%", importe: -breakdown.irpf, rowStyle: "impuesto" },
    { subcuenta: "Neto después de impuestos", pct: "", importe: breakdown.neto, rowStyle: "neto" },
    { subcuenta: "Gastos fijos", pct: "40%", importe: breakdown.gastosFijos, rowStyle: "subcuenta" },
    { subcuenta: "Beneficio", pct: "30%", importe: breakdown.beneficio, rowStyle: "beneficio" },
    { subcuenta: "Marketing", pct: "25%", importe: breakdown.marketing, rowStyle: "subcuenta" },
    { subcuenta: "Imprevistos", pct: "15%", importe: breakdown.imprevistos, rowStyle: "subcuenta" },
  ];

  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Percent className="h-4 w-4" />
            {title}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={showHeader ? "p-0" : "pt-4 p-0"}>
        <div className="overflow-x-auto rounded-b-lg">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left py-2 px-3 font-medium text-muted-foreground">Subcuenta</th>
                <th className="text-right py-2 px-3 font-medium text-muted-foreground w-16">%</th>
                <th className="text-right py-2 px-3 font-medium text-muted-foreground w-24">Importe</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={i}
                  className={`border-b border-border/60 ${row.rowStyle ? ROW_STYLE[row.rowStyle] : ""}`}
                >
                  <td className="py-2 px-3">{row.subcuenta}</td>
                  <td className="py-2 px-3 text-right text-muted-foreground">{row.pct}</td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums">
                    {row.importe < 0 ? "−" : ""}
                    {formatCurrency(Math.abs(row.importe), currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
