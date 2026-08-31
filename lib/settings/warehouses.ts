// lib/settings/warehouses.ts
// Obsidian ERP v4.0 — Implicit Warehouse Model (2P Part 2.1).
//
// ERPNext requires a warehouse on every stock movement; today the user
// has to pick them, and a blank WIP/FG warehouse is the #1 reason WO
// submit fails. This module resolves the three default warehouses for
// the active company without surfacing the choice to the operator —
// mirror of the `lib/settings/company.ts` pattern.
//
// Naming convention: ERPNext suffixes warehouses with the company
// abbreviation (e.g. "Stores - PAB" for Pana Business). We resolve the
// abbr via the company doc (not hardcoded "Pana") so the same code
// works for the printing-business pilot and any future tenant.

import { getActiveCompany } from "./company";

// ---------------------------------------------------------------------------
// Cached resolutions (per active company). One round-trip per
// company-change, then the warehouses are read on the next render.
// ---------------------------------------------------------------------------
let _resolutionCache: {
  company: string;
  abbr: string;
  stores: string;
  wip: string;
  fg: string;
  rawMaterials?: string;
  loadedAt: number;
} | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes — warehouses rarely change

export interface CompanyWarehouses {
  abbr: string;
  stores: string;
  wip: string;
  fg: string;
  /**
   * 2R Part 4 — optional Raw Materials warehouse. Present when the
   * tenant provisioned one (Pana does: "Raw Materials - PAN"). The
   * Receive Materials modal surfaces it as a secondary option in the
   * warehouse selector; absent → only Stores is offered.
   */
  rawMaterials?: string;
}

// ---------------------------------------------------------------------------
// Computed-name helpers (deterministic from the company abbr)
// ---------------------------------------------------------------------------
/** Default Stores warehouse name for the active company. */
export function defaultStoresWarehouse(abbr: string): string {
  return `Stores - ${abbr}`;
}
/** Default WIP warehouse name for the active company. */
export function defaultWipWarehouse(abbr: string): string {
  return `Work In Progress - ${abbr}`;
}
/** Default Finished Goods warehouse name for the active company. */
export function defaultFgWarehouse(abbr: string): string {
  return `Finished Goods - ${abbr}`;
}
/**
 * 2R Part 4 — best-effort computed name for the Raw Materials warehouse.
 * Returns `undefined` if the tenant hasn't provisioned one; the API
 * route returns the real name when online.
 */
export function defaultRawMaterialsWarehouse(abbr: string): string {
  return `Raw Materials - ${abbr}`;
}

// ---------------------------------------------------------------------------
// Async fetch + cache. The API route `/api/stock/warehouses/defaults`
// returns the three resolved names (or computes them on first call and
// provisions via ERPNext's `frappe.client.insert` when onboarding
// completed). Falls back to computed defaults if the API fails.
// ---------------------------------------------------------------------------

/**
 * Get the three default warehouses for the active company. SSR-safe
 * (returns the computed defaults on the server or while the cache is
 * empty); client-side resolution swaps in the resolved names once the
 * first network call completes.
 */
export async function resolveCompanyWarehouses(): Promise<CompanyWarehouses> {
  const company = getActiveCompany();
  const now = Date.now();
  if (
    _resolutionCache &&
    _resolutionCache.company === company &&
    now - _resolutionCache.loadedAt < CACHE_TTL_MS
  ) {
    return {
      abbr: _resolutionCache.abbr,
      stores: _resolutionCache.stores,
      wip: _resolutionCache.wip,
      fg: _resolutionCache.fg,
      rawMaterials: _resolutionCache.rawMaterials,
    };
  }
  // Best-effort fetch — on failure, fall back to computed defaults so
  // the calling modal still has a usable warehouse name (the operator
  // will see a guided error on submit if the warehouse doesn't exist).
  try {
    const res = await fetch(
      `/api/stock/warehouses/defaults?company=${encodeURIComponent(company)}`,
      { cache: "no-store" },
    );
    if (res.ok) {
      const json = (await res.json()) as {
        success?: boolean;
        data?: CompanyWarehouses;
      };
      if (json?.success && json.data) {
        _resolutionCache = {
          company,
          abbr: json.data.abbr,
          stores: json.data.stores,
          wip: json.data.wip,
          fg: json.data.fg,
          rawMaterials: json.data.rawMaterials,
          loadedAt: now,
        };
        return json.data;
      }
    }
  } catch {
    // network or JSON failure — fall through to defaults
  }
  // Fallback: assume the abbr is the company name (works for single-
  // tenant defaults; the API route returns the real abbr when online).
  const abbr = company.slice(0, 3).toUpperCase();
  return {
    abbr,
    stores: defaultStoresWarehouse(abbr),
    wip: defaultWipWarehouse(abbr),
    fg: defaultFgWarehouse(abbr),
    rawMaterials: defaultRawMaterialsWarehouse(abbr),
  };
}

/**
 * Synchronous fallback accessors (return the computed default if the
 * async resolve has not yet completed). Used inside render paths where
 * we want a placeholder value immediately.
 */
export function fallbackStoresWarehouse(): string {
  const company = getActiveCompany();
  if (_resolutionCache?.company === company) return _resolutionCache.stores;
  return defaultStoresWarehouse(company.slice(0, 3).toUpperCase());
}
export function fallbackWipWarehouse(): string {
  const company = getActiveCompany();
  if (_resolutionCache?.company === company) return _resolutionCache.wip;
  return defaultWipWarehouse(company.slice(0, 3).toUpperCase());
}
export function fallbackFgWarehouse(): string {
  const company = getActiveCompany();
  if (_resolutionCache?.company === company) return _resolutionCache.fg;
  return defaultFgWarehouse(company.slice(0, 3).toUpperCase());
}
/** 2R Part 4 — Raw Materials fallback (always returns the computed name
 *  even when the cache is empty; the modal decides whether to surface
 *  it based on the cached resolution). */
export function fallbackRawMaterialsWarehouse(): string {
  const company = getActiveCompany();
  if (_resolutionCache?.company === company && _resolutionCache.rawMaterials) {
    return _resolutionCache.rawMaterials;
  }
  return defaultRawMaterialsWarehouse(company.slice(0, 3).toUpperCase());
}

/** Invalidate the cache (used after auto-provision). */
export function invalidateWarehouseCache(): void {
  _resolutionCache = null;
}
