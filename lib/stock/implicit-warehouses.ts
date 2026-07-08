// lib/stock/implicit-warehouses.ts
// Obsidian ERP v4.0 — Phase 2Y Part 8: Fully Implicit Warehouses.
//
// The picker is hidden, resolved from saved defaults. Admin escape hatch:
//   - A settings toggle "Show warehouse pickers" (in stock settings)
//   - When toggled ON, all create forms show their warehouse fields
//   - When toggled OFF (default), warehouse fields are auto-resolved
//     from saved defaults and hidden from the form UI.
//
// P1 (Schema-First): the implicit warehouse model reads from the same
// `WarehouseDefaults` endpoint that the explicit model uses. No new schema.
// P2 (Factory): `useImplicitWarehouses` is a factory hook — every create
// form uses it instead of bespoke resolver logic.

"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { resolvePrefillWarehouses, WarehouseDefaultKeys } from "./warehouse-defaults";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ImplicitWarehouseConfig {
  /** Whether warehouse pickers should be shown (admin override). Default: false. */
  showPickers: boolean;
  /** Resolved warehouse defaults (source, stores, wip, fg, scrap). */
  defaults: {
    source: string;
    stores: string;
    wip: string;
    fg: string;
    scrap: string;
  };
  /** Whether defaults are loading. */
  isLoading: boolean;
}

// ---------------------------------------------------------------------------
// Query key
// ---------------------------------------------------------------------------

export const ImplicitWarehouseKeys = {
  all: () => ["implicit-warehouses"] as const,
  showPickers: () => ["implicit-warehouses", "show-pickers"] as const,
};

// ---------------------------------------------------------------------------
// Storage for the admin override (localStorage)
// ---------------------------------------------------------------------------

const SHOW_PICKERS_KEY = "obsidian:show-warehouse-pickers";

/** Read the admin override from localStorage. Default: false (pickers hidden). */
export function getShowPickersOverride(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const val = localStorage.getItem(SHOW_PICKERS_KEY);
    return val === "true";
  } catch {
    return false;
  }
}

/** Set the admin override in localStorage. */
export function setShowPickersOverride(show: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SHOW_PICKERS_KEY, String(show));
  } catch {
    // Quota exceeded — ignore.
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Factory hook for implicit warehouse resolution.
 * Returns resolved defaults + the admin override flag.
 *
 * Every create form calls this once on mount:
 *   const { defaults, showPickers, isLoading } = useImplicitWarehouses();
 *
 * Then:
 *   - If showPickers is false, warehouse fields are hidden and pre-filled.
 *   - If showPickers is true, warehouse fields are visible and editable.
 */
export function useImplicitWarehouses(): ImplicitWarehouseConfig {
  const qc = useQueryClient();

  // Resolve the warehouse defaults (saved settings → canonical fallback).
  const { data: defaults, isLoading } = useQuery({
    queryKey: WarehouseDefaultKeys.all(),
    queryFn: async () => {
      const resolved = await resolvePrefillWarehouses();
      return resolved;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Read the admin override from localStorage (no server call needed).
  const showPickers = getShowPickersOverride();

  return {
    showPickers,
    defaults: defaults ?? { source: "", stores: "", wip: "", fg: "", scrap: "" },
    isLoading,
  };
}

/**
 * Toggle the admin escape hatch. Updates localStorage + invalidates
 * the query key so all mounted create forms re-render.
 */
export function useToggleShowPickers() {
  const qc = useQueryClient();

  return (show: boolean) => {
    setShowPickersOverride(show);
    qc.invalidateQueries({ queryKey: ImplicitWarehouseKeys.all() });
  };
}

export default useImplicitWarehouses;
