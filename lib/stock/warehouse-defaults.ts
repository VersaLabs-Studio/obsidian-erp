// lib/stock/warehouse-defaults.ts
// Obsidian ERP v4.0 — Global default-warehouse configuration (2U §B / 2T §2 T1).
//
// Reads/writes the warehouse defaults stored on ERPNext singles
// (Manufacturing Settings + Stock Settings). Every create form that requires
// a warehouse prefills from this config — fields remain visible and editable.
//
// 2U §B — BOUNDARY FIX. This file is "use client" and is imported by client
// pages (the Sales Order detail page, the settings page, create forms). It
// MUST NOT import the server-only `frappeClient` singleton: that singleton
// self-instantiates at module load and reads ERP_API_KEY/ERP_API_SECRET,
// which are undefined in the browser → "Missing ERP API environment
// variables" thrown on mount (this crashed the SO detail page and this very
// settings page in 2T). All ERPNext access now goes through the server route
// `/api/stock/settings/warehouse-defaults`.

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getActiveCompany } from "@/lib/settings/company";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WarehouseDefaults {
  /** Source / default warehouse (Stock Settings.default_warehouse) */
  sourceWarehouse: string;
  /** Finished-goods warehouse (Manufacturing Settings.default_fg_warehouse) */
  fgWarehouse: string;
  /** Work-in-progress warehouse (Manufacturing Settings.default_wip_warehouse) */
  wipWarehouse: string;
  /** Scrap / rejected warehouse (Manufacturing Settings.default_scrap_warehouse) */
  scrapWarehouse: string;
}

const EMPTY_DEFAULTS: WarehouseDefaults = {
  sourceWarehouse: "",
  fgWarehouse: "",
  wipWarehouse: "",
  scrapWarehouse: "",
};

const DEFAULTS_ENDPOINT = "/api/stock/settings/warehouse-defaults";

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const WarehouseDefaultKeys = {
  all: () => ["warehouse-defaults"] as const,
  doc: (company: string) => ["warehouse-defaults", company] as const,
};

// ---------------------------------------------------------------------------
// Internal: fetch defaults from the server route (the ONLY ERPNext seam).
// ---------------------------------------------------------------------------

async function requestDefaults(): Promise<WarehouseDefaults> {
  const res = await fetch(DEFAULTS_ENDPOINT, { credentials: "include" });
  if (!res.ok) return { ...EMPTY_DEFAULTS };
  const json = (await res.json()) as { data?: Partial<WarehouseDefaults> };
  const d = json.data ?? {};
  return {
    sourceWarehouse: String(d.sourceWarehouse ?? ""),
    fgWarehouse: String(d.fgWarehouse ?? ""),
    wipWarehouse: String(d.wipWarehouse ?? ""),
    scrapWarehouse: String(d.scrapWarehouse ?? ""),
  };
}

// ---------------------------------------------------------------------------
// React Query hook — read
// ---------------------------------------------------------------------------

export function useWarehouseDefaults() {
  const company = getActiveCompany();
  return useQuery({
    queryKey: WarehouseDefaultKeys.doc(company),
    queryFn: async (): Promise<WarehouseDefaults> => {
      const defaults = await requestDefaults();
      // Keep the synchronous cache (used by create-form effects) warm.
      _cachedDefaults = defaults;
      _cacheTimestamp = Date.now();
      return defaults;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// Sync getter — for use in create-form effects that run once on mount.
// Returns cached defaults if available, empty strings otherwise.
// ---------------------------------------------------------------------------

let _cachedDefaults: WarehouseDefaults | null = null;
let _cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Get cached warehouse defaults synchronously. Returns empty strings if not
 * yet fetched. The caller should call `fetchWarehouseDefaults()` on mount
 * to populate the cache.
 */
export function getCachedWarehouseDefaults(): WarehouseDefaults {
  if (_cachedDefaults && Date.now() - _cacheTimestamp < CACHE_TTL) {
    return _cachedDefaults;
  }
  return { ...EMPTY_DEFAULTS };
}

/**
 * Fetch and cache warehouse defaults. Call once on app mount or in create-form
 * effects. Returns the fetched defaults.
 */
export async function fetchWarehouseDefaults(): Promise<WarehouseDefaults> {
  try {
    const defaults = await requestDefaults();
    _cachedDefaults = defaults;
    _cacheTimestamp = Date.now();
    return defaults;
  } catch {
    return { ...EMPTY_DEFAULTS };
  }
}

// ---------------------------------------------------------------------------
// Convenience getters for individual warehouses (used in create forms)
// ---------------------------------------------------------------------------

/**
 * Get the default finished-goods warehouse. Returns "" if not configured.
 * Use in SO→WO, Work Order create, Stock Entry create.
 */
export function getDefaultFgWarehouse(): string {
  return getCachedWarehouseDefaults().fgWarehouse;
}

/**
 * Get the default WIP warehouse. Returns "" if not configured.
 * Use in Work Order create.
 */
export function getDefaultWipWarehouse(): string {
  return getCachedWarehouseDefaults().wipWarehouse;
}

/**
 * Get the default source warehouse. Returns "" if not configured.
 * Use in Delivery Note, Purchase Receipt, Material Request create.
 */
export function getDefaultSourceWarehouse(): string {
  return getCachedWarehouseDefaults().sourceWarehouse;
}

/**
 * Get the default scrap warehouse. Returns "" if not configured.
 * Use in Work Order create, Stock Entry create.
 */
export function getDefaultScrapWarehouse(): string {
  return getCachedWarehouseDefaults().scrapWarehouse;
}

// ---------------------------------------------------------------------------
// Mutation — write (used by the settings page)
// ---------------------------------------------------------------------------

export function useUpdateWarehouseDefaults() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (defaults: WarehouseDefaults) => {
      const res = await fetch(DEFAULTS_ENDPOINT, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(defaults),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as
          | { details?: string; error?: string }
          | null;
        throw new Error(
          json?.details || json?.error || "Failed to save warehouse defaults",
        );
      }
      return defaults;
    },
    onSuccess: (defaults) => {
      // Refresh the synchronous cache + React Query.
      _cachedDefaults = defaults;
      _cacheTimestamp = Date.now();
      qc.invalidateQueries({ queryKey: WarehouseDefaultKeys.all() });
    },
  });
}
