import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/dates";
import { DeleteVendorButton } from "@/components/proveedores/DeleteVendorButton";

interface Props {
  params: { id: string };
}

export default async function ProveedorDetailPage({ params }: Props) {
  const supabase = await createClient();
  const now = new Date();
  const year = now.getFullYear();
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  const [vendorRes, expensesRes, transactionsRes, yearTransactionsRes] = await Promise.all([
    supabase.from("vendors").select("*").eq("id", params.id).single(),
    supabase
      .from("company_expenses")
      .select("id,name,category,amount,currency,interval,status,created_at")
      .eq("vendor_id", params.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("expense_transactions")
      .select("id,name,category,amount,currency,date,status,payment_method")
      .eq("vendor_id", params.id)
      .order("date", { ascending: false }),
    supabase
      .from("expense_transactions")
      .select("amount")
      .eq("vendor_id", params.id)
      .gte("date", yearStart)
      .lte("date", yearEnd),
  ]);

  if (vendorRes.error || !vendorRes.data) notFound();

  const vendor = vendorRes.data as any;
  const expenses = expensesRes.data ?? [];
  const transactions = transactionsRes.data ?? [];
  const totalYear = (yearTransactionsRes.data ?? []).reduce((sum, row) => sum + (row.amount ?? 0), 0);
  const totalHistoric = transactions.reduce((sum, row) => sum + (row.amount ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8">
          <Link href="/proveedores">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">{vendor.name}</h1>
          <p className="text-sm text-muted-foreground">{vendor.category_default ?? "Sin categoría"}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/proveedores/${vendor.id}/editar`}>
              <Pencil className="h-4 w-4" />
              Editar
            </Link>
          </Button>
          <DeleteVendorButton vendorId={vendor.id} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Total pagado {year}</p>
            <p className="text-xl font-bold text-expense">{formatCurrency(totalYear)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Total histórico</p>
            <p className="text-xl font-bold text-expense">{formatCurrency(totalHistoric)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Nº gastos</p>
            <p className="text-xl font-bold">{expenses.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-2">
          <h2 className="text-base font-semibold">Datos de proveedor</h2>
          <p className="text-sm text-muted-foreground">Email: {vendor.email ?? "—"}</p>
          <p className="text-sm text-muted-foreground">Teléfono: {vendor.phone ?? "—"}</p>
          <p className="text-sm text-muted-foreground">NIF/CIF: {vendor.tax_id ?? "—"}</p>
          <p className="text-sm text-muted-foreground">Dirección: {vendor.address ?? "—"}</p>
          {vendor.notes ? <p className="text-sm">{vendor.notes}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h2 className="mb-3 text-base font-semibold">Gastos asociados</h2>
          {expenses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay gastos asociados.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nombre</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Categoría</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Periodicidad</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Importe</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense: any, index: number) => (
                    <tr key={expense.id} className={index % 2 === 0 ? "bg-background" : "bg-muted/10"}>
                      <td className="px-4 py-3">{expense.name}</td>
                      <td className="px-4 py-3">{expense.category ?? "—"}</td>
                      <td className="px-4 py-3">{expense.interval}</td>
                      <td className="px-4 py-3 text-right font-semibold text-expense">
                        {formatCurrency(expense.amount, expense.currency)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={expense.status === "active" ? "success" : "outline"}>{expense.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h2 className="mb-3 text-base font-semibold">Historial de pagos</h2>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay pagos registrados.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Fecha</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Concepto</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Categoría</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Importe</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction: any, index: number) => (
                    <tr key={transaction.id} className={index % 2 === 0 ? "bg-background" : "bg-muted/10"}>
                      <td className="px-4 py-3">{formatDate(transaction.date)}</td>
                      <td className="px-4 py-3">{transaction.name}</td>
                      <td className="px-4 py-3">{transaction.category ?? "—"}</td>
                      <td className="px-4 py-3 text-right font-semibold text-expense">
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={transaction.status === "paid" ? "success" : "warning"}>
                          {transaction.status}
                        </Badge>
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
