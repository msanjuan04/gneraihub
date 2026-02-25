"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils/currency";
import type { CalendarEvent } from "@/types";
import { cn } from "@/lib/utils";
import { parseISO } from "date-fns";

interface CalendarViewProps {
  events: CalendarEvent[];
  currentYear: number;
  currentMonth: number;
}

function EventDot({ type }: { type: CalendarEvent["type"] }) {
  return (
    <span
      className={cn(
        "inline-block h-1.5 w-1.5 rounded-full shrink-0",
        type === "income" && "bg-green-500",
        type === "payment" && "bg-red-500",
        type === "paid_income" && "bg-green-400 opacity-60",
        type === "paid_payment" && "bg-red-400 opacity-60"
      )}
    />
  );
}

function EventItem({ event, compact = false }: { event: CalendarEvent; compact?: boolean }) {
  const isIncome = event.type === "income" || event.type === "paid_income";
  const isPaid = event.type === "paid_payment" || event.type === "paid_income";

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded px-1 py-0.5 text-xs truncate",
        isIncome ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400",
        isPaid && "opacity-60"
      )}
    >
      <EventDot type={event.type} />
      {!compact && <span className="truncate">{event.title}</span>}
      <span className="ml-auto shrink-0 font-medium">
        {isIncome ? "+" : "-"}{formatCurrency(event.amount, event.currency)}
      </span>
    </div>
  );
}

export function CalendarView({ events, currentYear, currentMonth }: CalendarViewProps) {
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<CalendarEvent[]>([]);

  const currentDate = new Date(currentYear, currentMonth - 1, 1);

  const navigateMonth = (direction: "prev" | "next") => {
    const newDate = direction === "prev" ? subMonths(currentDate, 1) : addMonths(currentDate, 1);
    router.push(`/calendario?year=${newDate.getFullYear()}&month=${newDate.getMonth() + 1}`);
  };

  // Generar días del calendario (incluyendo días del mes anterior/siguiente para completar semanas)
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Agrupar eventos por fecha
  const eventsByDate = events.reduce<Record<string, CalendarEvent[]>>((acc, event) => {
    const key = event.date;
    acc[key] = acc[key] ?? [];
    acc[key].push(event);
    return acc;
  }, {});

  const handleDayClick = (day: Date) => {
    const dateKey = format(day, "yyyy-MM-dd");
    const dayEvents = eventsByDate[dateKey] ?? [];
    if (dayEvents.length > 0) {
      setSelectedDay(day);
      setSelectedEvents(dayEvents);
    }
  };

  const dayNames = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  return (
    <div className="space-y-4">
      {/* Header del calendario */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold capitalize">
          {format(currentDate, "MMMM yyyy", { locale: es })}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateMonth("prev")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push(`/calendario?year=${new Date().getFullYear()}&month=${new Date().getMonth() + 1}`)}>
            Hoy
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateMonth("next")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-green-500" />Cobros previstos</div>
        <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-500" />Pagos previstos</div>
        <div className="flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-muted-foreground" />Confirmados</div>
      </div>

      {/* Grid del calendario */}
      <div className="rounded-lg border border-border overflow-hidden">
        {/* Cabecera días */}
        <div className="grid grid-cols-7 border-b border-border bg-muted/40">
          {dayNames.map((day) => (
            <div key={day} className="py-2 text-center text-xs font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        {/* Días */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, i) => {
            const dateKey = format(day, "yyyy-MM-dd");
            const dayEvents = eventsByDate[dateKey] ?? [];
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isToday = isSameDay(day, new Date());
            const hasEvents = dayEvents.length > 0;

            const incomeEvents = dayEvents.filter((e) => e.type === "income" || e.type === "paid_income");
            const paymentEvents = dayEvents.filter((e) => e.type === "payment" || e.type === "paid_payment");

            return (
              <div
                key={dateKey}
                onClick={() => handleDayClick(day)}
                className={cn(
                  "min-h-[100px] p-2 border-b border-r border-border/50 transition-colors",
                  !isCurrentMonth && "opacity-40",
                  isToday && "bg-primary/5",
                  hasEvents && "cursor-pointer hover:bg-muted/30",
                  // Último día de la fila sin borde derecho
                  (i + 1) % 7 === 0 && "border-r-0"
                )}
              >
                {/* Número del día */}
                <div className={cn(
                  "text-sm font-medium mb-1 h-6 w-6 flex items-center justify-center rounded-full",
                  isToday && "bg-primary text-primary-foreground"
                )}>
                  {format(day, "d")}
                </div>

                {/* Eventos (máximo 3 visible, el resto con "...") */}
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map((event) => (
                    <EventItem key={event.id} event={event} compact={dayEvents.length > 2} />
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-muted-foreground pl-1">
                      +{dayEvents.length - 3} más
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de detalle del día */}
      <Dialog open={!!selectedDay} onOpenChange={() => setSelectedDay(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedDay && format(selectedDay, "EEEE, d 'de' MMMM", { locale: es })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {selectedEvents.map((event) => {
              const isIncome = event.type === "income" || event.type === "paid_income";
              const isPaid = event.type === "paid_payment" || event.type === "paid_income";

              return (
                <div
                  key={event.id}
                  className="flex items-start gap-3 rounded-lg border border-border p-3"
                >
                  <div className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full mt-0.5",
                    isIncome ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                  )}>
                    {isIncome ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium truncate", isPaid && "line-through text-muted-foreground")}>
                      {event.title}
                    </p>
                    <p className={cn("text-base font-bold mt-0.5", isIncome ? "text-income" : "text-expense")}>
                      {isIncome ? "+" : "-"}{formatCurrency(event.amount, event.currency)}
                    </p>
                    {isPaid && <Badge variant="success" className="mt-1 text-xs">Confirmado</Badge>}
                    {!isPaid && <Badge variant="warning" className="mt-1 text-xs">Pendiente</Badge>}
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
