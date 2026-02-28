import type { InvoiceItem } from "@/types";

export interface DocumentTotals {
  subtotal: number;
  taxAmount: number;
  irpfAmount: number;
  total: number;
  effectiveTaxRate: number;
}

function toSafeNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return n;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function sanitizeDocumentItems(items: unknown): InvoiceItem[] {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const description = String(record.description ?? "").trim();
      const quantity = toSafeNumber(record.quantity, 0);
      const unitPrice = toSafeNumber(record.unit_price, 0);
      const taxRate = toSafeNumber(record.tax_rate, 0);
      if (!description || quantity <= 0) return null;

      return {
        description,
        quantity: round2(quantity),
        unit_price: round2(unitPrice),
        tax_rate: round2(Math.max(0, taxRate)),
      } as InvoiceItem;
    })
    .filter((item): item is InvoiceItem => !!item);
}

export function legacyItemFromConcept(
  concept: string | null | undefined,
  amount: number | null | undefined,
  taxRate: number | null | undefined
): InvoiceItem[] {
  if (!concept || !concept.trim()) return [];

  return [
    {
      description: concept.trim(),
      quantity: 1,
      unit_price: round2(toSafeNumber(amount, 0)),
      tax_rate: round2(toSafeNumber(taxRate, 0)),
    },
  ];
}

export function computeDocumentTotals(
  itemsInput: unknown,
  fallbackTaxRate = 21,
  irpfRateInput = 0
): DocumentTotals {
  const items = sanitizeDocumentItems(itemsInput);
  const subtotal = round2(
    items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
  );

  const taxAmount = round2(
    items.reduce(
      (sum, item) => sum + item.quantity * item.unit_price * (item.tax_rate / 100),
      0
    )
  );

  const irpfRate = Math.max(0, toSafeNumber(irpfRateInput, 0));
  const irpfAmount = round2(subtotal * (irpfRate / 100));
  const total = round2(subtotal + taxAmount - irpfAmount);
  const effectiveTaxRate = subtotal > 0 ? round2((taxAmount / subtotal) * 100) : fallbackTaxRate;

  return {
    subtotal,
    taxAmount,
    irpfAmount,
    total,
    effectiveTaxRate,
  };
}

export function getDocumentItemsWithFallback(
  items: unknown,
  concept: string | null | undefined,
  amount: number | null | undefined,
  taxRate: number | null | undefined
): InvoiceItem[] {
  const sanitized = sanitizeDocumentItems(items);
  if (sanitized.length > 0) return sanitized;
  return legacyItemFromConcept(concept, amount, taxRate);
}
