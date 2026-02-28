import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/dates";
import type { CalendarEvent } from "@/types";
import { cn } from "@/lib/utils";
import { ArrowDownLeft, ArrowUpRight, CalendarClock } from "lucide-react";

interface UpcomingPaymentsProps {
  events: CalendarEvent[];
}

function EventRow({ event }: { event: CalendarEvent }) {
  const isIncome = event.type === "income" || event.type === "paid_income";
  const isPaid = event.type === "paid_payment" || event.type === "paid_income";

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0">
      {/* Icono de tipo */}
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isIncome
            ? "bg-green-500/10 text-green-500"
            : "bg-red-500/10 text-red-500",
          isPaid && "opacity-60"
        )}
      >
        {isIncome ? (
          <ArrowDownLeft className="h-4 w-4" />
        ) : (
          <ArrowUpRight className="h-4 w-4" />
        )}
      </div>

      {/* Info del evento */}
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium truncate", isPaid && "line-through text-muted-foreground")}>
          {event.title}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatDate(event.date)}
        </p>
      </div>

      {/* Importe y estado */}
      <div className="flex flex-col items-end gap-1">
        <span
          className={cn(
            "text-sm font-semibold",
            isIncome ? "text-green-500" : "text-red-500",
            isPaid && "opacity-60"
          )}
        >
          {isIncome ? "+" : "-"}{formatCurrency(event.amount, event.currency)}
        </span>
        {isPaid ? (
          <Badge variant="success" className="text-[10px] px-1.5 py-0">
            Pagado
          </Badge>
        ) : (
          <Badge variant="warning" className="text-[10px] px-1.5 py-0">
            Pendiente
          </Badge>
        )}
      </div>
    </div>
  );
}

export function UpcomingPayments({ events }: UpcomingPaymentsProps) {
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Próximos 7 días</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {sortedEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CalendarClock className="h-8 w-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              No hay cobros ni pagos en los próximos 7 días
            </p>
          </div>
        ) : (
          <div>
            {sortedEvents.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
