// lib/stock/bin-levels.ts
// Obsidian ERP v4.0 — Batched Bin-level aggregation (2P Part 2.2).
//
// One Bin query covers all visible job cards (rather than per-card). The
// returned map is keyed by `${item_code}::${warehouse}` so callers can
// look up "on-hand" for a specific (item, warehouse) pair in O(1).
//
// Helper lives in `lib/stock/` so both the Jobs Cockpit and the
// StartProductionModal (and any future Stock Health / auto-reorder
// feature) can use the same batched source — no duplicate Bin fetches.

export type BinLevel = {
  item_code: string;
  warehouse: string;
  actual_qty: number;
  /** Reserved qty (allocated to open SOs / WOs) — ERPNext includes this
   *  on the Bin doctype as `reserved_qty`. Optional because not all
   *  instances populate it for every row. */
  reserved_qty?: number;
  projected_qty?: number;
};

/**
 * Pure aggregation: turn a flat list of Bin rows into a lookup map keyed
 * by `${item_code}::${warehouse}`. When a (item, warehouse) pair has
 * multiple rows (rare — usually a single Bin doc per pair), we sum the
 * `actual_qty` so the returned level is the consolidated balance.
 */
export function binLevelsByItemWarehouse(
  rows: ReadonlyArray<BinLevel>,
): Map<string, number> {
  const out = new Map<string, number>();
  for (const r of rows) {
    if (!r.item_code || !r.warehouse) continue;
    const key = `${r.item_code}::${r.warehouse}`;
    const cur = out.get(key) ?? 0;
    out.set(key, cur + (Number(r.actual_qty) || 0));
  }
  return out;
}

/**
 * Material-readiness check for a single Work Order row: count of
 * `required_items` whose on-hand < required. Returns:
 *   - `ready`: every required item has on-hand >= required
 *   - `shortCount`: number of items short (0 = ready)
 *   - `totalItems`: total required items
 */
export interface ReadinessResult {
  ready: boolean;
  shortCount: number;
  totalItems: number;
}

export function checkReadiness(
  requiredItems: ReadonlyArray<{ item_code: string; required_qty: number; source_warehouse?: string }>,
  binMap: ReadonlyMap<string, number>,
): ReadinessResult {
  let short = 0;
  for (const r of requiredItems) {
    const required = Number(r.required_qty) || 0;
    if (required <= 0) continue;
    const wh = r.source_warehouse ?? "";
    const key = wh ? `${r.item_code}::${wh}` : r.item_code;
    const onHand = binMap.get(key) ?? binMap.get(r.item_code) ?? 0;
    if (onHand < required) short += 1;
  }
  return {
    ready: short === 0,
    shortCount: short,
    totalItems: requiredItems.length,
  };
}
