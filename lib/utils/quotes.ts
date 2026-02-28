import type { QuoteStatus } from "@/types";

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: "Borrador",
  sent: "Enviado",
  accepted: "Aceptado",
  rejected: "Rechazado",
  expired: "Expirado",
  invoiced: "Facturado",
};

export const QUOTE_STATUS_BADGE: Record<
  QuoteStatus,
  "outline" | "info" | "success" | "error" | "warning" | "brand"
> = {
  draft: "outline",
  sent: "info",
  accepted: "success",
  rejected: "error",
  expired: "warning",
  invoiced: "brand",
};
