import Link from "next/link";
import { startOfMonth, startOfYear, format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlusCircle, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/dates";
import { IncomeRowActions } from "@/components/ingresos/IncomeRowActions";
import { ExportMenu } from "@/components/shared/ExportMenu";

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default async function IngresosPage() {
  const supabase = await createClient();
  const now = new Date();
  const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
  const yearStart = format(startOfYear(now), "yyyy-MM-dd");

  const [transactionsRes, monthRes, yearRes, clientsRes, projectsRes] = await Promise.all([
    supabase
      .from("income_transactions")
      .select(
        "id,invoice_id,client_id,project_id,concept,amount,currency,date,payment_method,notes,is_manual,invoice:invoices(id,invoice_number),client:clients(id,name),project:projects(id,name)"
      )
      .order("date", { ascending: false }),
    supabase.from("income_transactions").select("amount").gte("date", monthStart),
    supabase.from("income_transactions").select("amount").gte("date", yearStart),
    supabase.from("clients").select("id,name").order("name"),
    supabase.from("projects").select("id,name,client_id").order("name"),
  ]);

  const transactions = (transactionsRes.data ?? []) as any[];
  const clients = (clientsRes.data ?? []) as Array<{ id: string; name: string }>;
  const projects = (projectsRes.data ?? []) as Array<{ id: string; name: string; client_id?: string | null }>;

  const totalMonth = (monthRes.data ?? []).reduce((sum, row) => sum + (row.amount ?? 0), 0);
  const totalYear = (yearRes.data ?? []).reduce((sum, row) => sum + (row.amount ?? 0), 0);

  const monthlyAverage = (() => {
    if ((yearRes.data ?? []).length === 0) return 0;
    const monthsElapsed = now.getMonth() + 1;
    return totalYear / monthsElapsed;
  })();

  const exportRows = transactions.map((row) => {
    const invoice = firstRelation(row.invoice);
    const client = firstRelation(row.client);
    const project = firstRelation(row.project);
    return {
      concepto: row.concept ?? "",
      cliente: client?.name ?? "",
      proyecto: project?.name ?? "",
      importe: row.amount ?? 0,
      divisa: row.currency ?? "EUR",
      fecha: row.date ?? "",
      metodo_pago: row.payment_method ?? "",
      origen: invoice?.invoice_number ? `Factura ${invoice.invoice_number}` : "Manual",
    };
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Total ingresos este mes</p>
            <p className="text-xl font-bold text-income">{formatCurrency(totalMonth)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Total ingresos este año</p>
            <p className="text-xl font-bold text-income">{formatCurrency(totalYear)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Media mensual</p>
            <p className="text-xl font-bold">{formatCurrency(monthlyAverage)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{transactions.length} ingresos registrados</p>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          <ExportMenu
            data={exportRows}
            filename="ingresos"
            sheetName="Ingresos"
            buttonClassName="w-full sm:w-auto"
          />
          <Button variant="gnerai" size="sm" className="w-full sm:w-auto" asChild>
            <Link href="/ingresos/nuevo">
              <PlusCircle className="h-4 w-4" />
              Nuevo ingreso
            </Link>
          </Button>
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-center">
          <Wallet className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">No hay ingresos todavía</p>
          <p className="mt-1 text-xs text-muted-foreground/80">
            Registra cobros manuales o marca facturas como pagadas
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Concepto</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cliente</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Proyecto</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Importe</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Fecha</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Método</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Origen</th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody>
              {transactions.map((row, index) => {
                const invoice = firstRelation(row.invoice);
                const client = firstRelation(row.client);
                const project = firstRelation(row.project);
                const isManual = !!row.is_manual && !row.invoice_id;
                return (
                  <tr key={row.id} className={index % 2 === 0 ? "bg-background" : "bg-muted/10"}>
                    <td className="px-4 py-3">{row.concept}</td>
                    <td className="px-4 py-3">{client?.name ?? "—"}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{project?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold text-income">
                      {formatCurrency(row.amount, row.currency)}
                    </td>
                    <td className="px-4 py-3">{formatDate(row.date)}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                      {row.payment_method ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {invoice?.invoice_number ? (
                        <Badge variant="info" className="gap-1">
                          <Link href={`/facturas/${invoice.id}`}>Factura {invoice.invoice_number}</Link>
                        </Badge>
                      ) : (
                        <Badge variant="outline">Manual</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isManual ? (
                        <IncomeRowActions
                          income={{
                            id: row.id,
                            concept: row.concept,
                            amount: row.amount,
                            currency: row.currency,
                            date: row.date,
                            payment_method: row.payment_method,
                            notes: row.notes,
                            client_id: row.client_id,
                            project_id: row.project_id,
                            is_manual: true,
                          }}
                          clients={clients}
                          projects={projects}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
