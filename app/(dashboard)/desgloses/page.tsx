import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/dates";
import { AllocationBreakdown } from "@/components/shared/AllocationBreakdown";
import { Percent, FileText, HandCoins } from "lucide-react";
import type { Currency } from "@/types";

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default async function DesglosesPage() {
  const supabase = await createClient();

  const { data: transactions } = await supabase
    .from("income_transactions")
    .select(
      "id,invoice_id,concept,amount,currency,date,invoice:invoices(id,invoice_number),client:clients(id,name),project:projects(id,name)"
    )
    .order("date", { ascending: false })
    .limit(100);

  const items = (transactions ?? []) as Array<{
    id: string;
    invoice_id: string | null;
    concept: string;
    amount: number;
    currency: Currency;
    date: string;
    invoice?: { id: string; invoice_number: string } | Array<{ id: string; invoice_number: string }> | null;
    client?: { id: string; name: string } | Array<{ id: string; name: string }> | null;
    project?: { id: string; name: string } | Array<{ id: string; name: string }> | null;
  }>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Percent className="h-5 w-5" />
          Desgloses
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cada ingreso que añades se reparte en subcuentas: impuestos (IVA, IRPF), gastos fijos, beneficio, marketing e imprevistos.
        </p>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <HandCoins className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Aún no hay ingresos</p>
            <p className="text-xs text-muted-foreground mt-1">
              Cuando añadas un ingreso (manual o por factura cobrada), aquí verás a qué va cada euro.
            </p>
            <Link
              href="/ingresos/nuevo"
              className="inline-block mt-4 text-sm text-primary hover:underline font-medium"
            >
              Añadir primer ingreso →
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {items.map((row) => {
            const invoice = firstRelation(row.invoice);
            const client = firstRelation(row.client);
            const project = firstRelation(row.project);
            return (
              <Card key={row.id} className="overflow-hidden">
                <CardHeader className="pb-2 border-b bg-muted/30">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{row.concept}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(row.date)}
                        {client?.name && ` · ${client.name}`}
                        {project?.name && ` · ${project.name}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {invoice ? (
                        <Badge variant="info" asChild>
                          <Link href={`/facturas/${invoice.id}`}>
                            <FileText className="h-3 w-3 mr-1" />
                            {invoice.invoice_number}
                          </Link>
                        </Badge>
                      ) : (
                        <Badge variant="outline">Manual</Badge>
                      )}
                      <span className="text-lg font-semibold text-income tabular-nums">
                        {formatCurrency(row.amount, row.currency)}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <AllocationBreakdown
                    amount={row.amount}
                    currency={row.currency}
                    totalIncluyeIva={true}
                    showHeader={false}
                    className="border-0 shadow-none rounded-none"
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
