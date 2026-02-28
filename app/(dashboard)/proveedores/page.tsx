import Link from "next/link";
import { PlusCircle, Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils/currency";
import { DeleteVendorButton } from "@/components/proveedores/DeleteVendorButton";
import { ExportMenu } from "@/components/shared/ExportMenu";

export default async function ProveedoresPage() {
  const supabase = await createClient();

  const [vendorsRes, expensesRes, transactionsRes] = await Promise.all([
    supabase
      .from("vendors")
      .select("id,name,category_default,email,phone,tax_id")
      .order("name"),
    supabase.from("company_expenses").select("id,vendor_id"),
    supabase.from("expense_transactions").select("id,vendor_id,amount"),
  ]);

  const vendors = vendorsRes.data ?? [];
  const expenses = expensesRes.data ?? [];
  const transactions = transactionsRes.data ?? [];

  const expensesByVendor = expenses.reduce<Record<string, number>>((acc, expense) => {
    if (!expense.vendor_id) return acc;
    acc[expense.vendor_id] = (acc[expense.vendor_id] ?? 0) + 1;
    return acc;
  }, {});

  const transactionsByVendor = transactions.reduce<Record<string, { count: number; total: number }>>(
    (acc, transaction) => {
      if (!transaction.vendor_id) return acc;
      acc[transaction.vendor_id] = acc[transaction.vendor_id] ?? { count: 0, total: 0 };
      acc[transaction.vendor_id].count += 1;
      acc[transaction.vendor_id].total += transaction.amount ?? 0;
      return acc;
    },
    {}
  );

  const exportRows = vendors.map((vendor) => ({
    nombre: vendor.name,
    categoria: vendor.category_default ?? "",
    email: vendor.email ?? "",
    telefono: vendor.phone ?? "",
    nif_cif: vendor.tax_id ?? "",
    total_pagado: transactionsByVendor[vendor.id]?.total ?? 0,
    numero_gastos: expensesByVendor[vendor.id] ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{vendors.length} proveedores registrados</p>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          <ExportMenu
            data={exportRows}
            filename="proveedores"
            sheetName="Proveedores"
            buttonClassName="w-full sm:w-auto"
          />
          <Button variant="gnerai" size="sm" className="w-full sm:w-auto" asChild>
            <Link href="/proveedores/nuevo">
              <PlusCircle className="h-4 w-4" />
              Nuevo proveedor
            </Link>
          </Button>
        </div>
      </div>

      {vendors.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-center">
          <Building2 className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">No hay proveedores todavía</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nombre</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Categoría</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Email</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Teléfono</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">NIF</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total pagado</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Nº gastos</th>
                <th className="px-4 py-3 w-40" />
              </tr>
            </thead>
            <tbody>
              {vendors.map((vendor, index) => (
                <tr key={vendor.id} className={index % 2 === 0 ? "bg-background" : "bg-muted/10"}>
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/proveedores/${vendor.id}`} className="hover:text-primary">
                      {vendor.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{vendor.category_default ?? "—"}</td>
                  <td className="px-4 py-3 hidden md:table-cell">{vendor.email ?? "—"}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">{vendor.phone ?? "—"}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">{vendor.tax_id ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-semibold text-expense">
                    {formatCurrency(transactionsByVendor[vendor.id]?.total ?? 0)}
                  </td>
                  <td className="px-4 py-3 text-right">{expensesByVendor[vendor.id] ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/proveedores/${vendor.id}`}>Ver</Link>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/proveedores/${vendor.id}/editar`}>Editar</Link>
                      </Button>
                      <DeleteVendorButton vendorId={vendor.id} compact />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
