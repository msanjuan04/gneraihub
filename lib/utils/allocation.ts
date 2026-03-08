/**
 * Desglose de factura/ingreso en subcuentas.
 * - IVA 21% y retención IRPF 7% sobre la base imponible.
 * - Del neto: 40% gastos fijos, 30% beneficio, 25% marketing, 15% imprevistos.
 */

export const IVA_RATE = 0.21;
export const IRPF_RATE = 0.07;

export const ALLOCATION_PERCENTAGES = {
  gastosFijos: 0.4,
  beneficio: 0.3,
  marketing: 0.25,
  imprevistos: 0.15,
} as const;

export interface AllocationBreakdown {
  /** Importe total (con IVA si es factura) */
  total: number;
  /** Base imponible (total / 1.21 si el total incluye IVA) */
  baseImponible: number;
  /** IVA 21% (a ingresar a Hacienda) */
  iva: number;
  /** Retención IRPF 7% (a restar) */
  irpf: number;
  /** Neto después de impuestos = base - IRPF */
  neto: number;
  gastosFijos: number;
  beneficio: number;
  marketing: number;
  imprevistos: number;
}

/**
 * Calcula el desglose. Si totalIncluyeIva es true, se asume que `amount` es total con IVA.
 */
export function calculateAllocation(
  amount: number,
  totalIncluyeIva = true
): AllocationBreakdown {
  const total = amount;
  const baseImponible = totalIncluyeIva ? total / (1 + IVA_RATE) : total;
  const iva = totalIncluyeIva ? total - baseImponible : baseImponible * IVA_RATE;
  const irpf = baseImponible * IRPF_RATE;
  const neto = baseImponible - irpf;

  return {
    total,
    baseImponible,
    iva,
    irpf,
    neto,
    gastosFijos: neto * ALLOCATION_PERCENTAGES.gastosFijos,
    beneficio: neto * ALLOCATION_PERCENTAGES.beneficio,
    marketing: neto * ALLOCATION_PERCENTAGES.marketing,
    imprevistos: neto * ALLOCATION_PERCENTAGES.imprevistos,
  };
}
