import { Badge } from "@/components/ui/badge";
import type { ExpenseStatus, TransactionStatus, ExpenseInterval } from "@/types";
import { intervalLabel } from "@/lib/utils/dates";

interface ExpenseStatusBadgeProps {
  status: ExpenseStatus | TransactionStatus;
}

export function ExpenseStatusBadge({ status }: ExpenseStatusBadgeProps) {
  const variants: Record<string, "success" | "warning" | "error" | "outline"> = {
    active: "success",
    paid: "success",
    pending: "warning",
    paused: "warning",
    cancelled: "error",
  };

  const labels: Record<string, string> = {
    active: "Activo",
    paid: "Pagado",
    pending: "Pendiente",
    paused: "Pausado",
    cancelled: "Cancelado",
  };

  return (
    <Badge variant={variants[status] ?? "outline"}>
      {labels[status] ?? status}
    </Badge>
  );
}

interface IntervalBadgeProps {
  interval: ExpenseInterval;
}

export function IntervalBadge({ interval }: IntervalBadgeProps) {
  const variants: Record<string, "brand" | "info" | "outline"> = {
    monthly: "brand",
    yearly: "info",
    quarterly: "info",
    one_off: "outline",
  };

  return (
    <Badge variant={variants[interval] ?? "outline"}>
      {intervalLabel(interval)}
    </Badge>
  );
}
