import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/dates";
import type { Invoice } from "@/types";
import { AlertTriangle, ArrowRight } from "lucide-react";

interface OverdueAlertsProps {
  overdueInvoices: Invoice[];
}

export function OverdueAlerts({ overdueInvoices }: OverdueAlertsProps) {
  if (overdueInvoices.length === 0) return null;

  return (
    <Card className="border-red-500/30 bg-red-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <CardTitle className="text-base text-red-500">
              Facturas vencidas ({overdueInvoices.length})
            </CardTitle>
          </div>
          <Button variant="ghost" size="sm" asChild className="text-red-500 hover:text-red-400">
            <Link href="/facturas?status=overdue">
              Ver todas <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {overdueInvoices.slice(0, 3).map((invoice) => (
            <div
              key={invoice.id}
              className="flex items-center justify-between rounded-md border border-red-500/20 bg-background/50 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {invoice.client?.name ?? "Cliente"} — {invoice.invoice_number}
                </p>
                <p className="text-xs text-muted-foreground">
                  Vencida el {formatDate(invoice.due_date)}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-3">
                <span className="text-sm font-semibold text-red-500">
                  {formatCurrency(invoice.total)}
                </span>
                <Badge variant="error" className="text-[10px]">
                  Vencida
                </Badge>
              </div>
            </div>
          ))}
          {overdueInvoices.length > 3 && (
            <p className="text-xs text-muted-foreground text-center pt-1">
              Y {overdueInvoices.length - 3} más...
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
