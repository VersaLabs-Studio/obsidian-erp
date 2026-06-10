// lib/kpi/compute-stock-kpis.ts
// F9: Pure helper for Stock Balance KPIs — extracted from stock-balance/page.tsx.

export interface BinForKPI {
  item_code: string;
  warehouse: string;
  actual_qty: number;
  valuation_rate?: number;
  reserved_qty?: number;
}

export function computeStockKPIs(bins: BinForKPI[]) {
  const totalSKUs = new Set(bins.map((b) => b.item_code)).size;
  const totalValue = bins.reduce(
    (sum, b) => sum + b.actual_qty * (b.valuation_rate ?? 0),
    0,
  );
  const warehouses = new Set(bins.map((b) => b.warehouse)).size;
  const outOfStock = bins.filter((b) => b.actual_qty <= 0).length;
  return { totalSKUs, totalValue, warehouses, outOfStock };
}
