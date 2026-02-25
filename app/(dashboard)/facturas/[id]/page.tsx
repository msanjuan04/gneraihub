import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/dates";
import { ArrowLeft, Pencil } from "lucide-react";
import { InvoiceForm } from "@/components/facturas/InvoiceForm";

const statusConfig: Record<string, any> = {
  pending: { label: "Pendiente", variant: "warning" },
  sent: { label: "Enviada", variant: "info" },
  paid: { label: "Pagada", variant: "success" },
  overdue: { label: "Vencida", variant: "error" },
  cancelled: { label: "Cancelada", variant: "outline" },
};

interface Props { params: { id: string } }

export default async function FacturaDetailPage({ params }: Props) {
  const supabase = await createClient();

  const [invoiceRes, clientsRes, projectsRes] = await Promise.all([
    supabase.from("invoices").select("*, client:clients(*), project:projects(*)").eq("id", params.id).single(),
    supabase.from("clients").select("*").eq("status", "active").order("name"),
    supabase.from("projects").select("*").eq("status", "active").order("name"),
  ]);

  if (invoiceRes.error || !invoiceRes.data) notFound();

  const invoice = invoiceRes.data as any;
  const sc = statusConfig[invoice.status] ?? { label: invoice.status, variant: "outline" };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8">
          <Link href="/facturas"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold font-mono">{invoice.invoice_number}</h1>
            <Badge variant={sc.variant}>{sc.label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {invoice.client?.name} · {formatCurrency(invoice.total, invoice.currency)} · Vence {formatDate(invoice.due_date)}
          </p>
        </div>
      </div>

      <InvoiceForm
        invoice={invoice}
        clients={clientsRes.data ?? []}
        projects={projectsRes.data ?? []}
      />
    </div>
  );
}
