// lib/accounting/payment-defaults.ts
// Obsidian ERP v4.1.1 — Global default Mode of Payment (D1).
//
// Reads/writes the default Mode of Payment stored on the Accounts Settings
// single via the custom field `custom_default_mode_of_payment`. The Mark-as-Paid
// dialog on SI/PI detail pages prefills from this config so the operator
// doesn't have to pick a mode every time.
//
// 2U §B — BOUNDARY FIX (mirrored from warehouse-defaults.ts). This file is
// "use client" and is imported by client pages. It MUST NOT import the
// server-only `frappeClient` singleton: that singleton self-instantiates at
// module load and reads ERP_API_KEY/ERP_API_SECRET, which are undefined in
// the browser → "Missing ERP API environment variables" thrown on mount.
// All ERPNext access goes through the server route
// `/api/accounting/settings/payment-defaults`.

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PaymentDefaults {
  /** Default Mode of Payment (Accounts Settings.custom_default_mode_of_payment) */
  defaultModeOfPayment: string;
}

const EMPTY_DEFAULTS: PaymentDefaults = {
  defaultModeOfPayment: "",
};

const DEFAULTS_ENDPOINT = "/api/accounting/settings/payment-defaults";

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const PaymentDefaultKeys = {
  all: () => ["payment-defaults"] as const,
};

// ---------------------------------------------------------------------------
// Internal: fetch defaults from the server route (the ONLY ERPNext seam).
// ---------------------------------------------------------------------------

async function requestDefaults(): Promise<PaymentDefaults> {
  const res = await fetch(DEFAULTS_ENDPOINT, { credentials: "include" });
  if (!res.ok) return { ...EMPTY_DEFAULTS };
  const json = (await res.json()) as { data?: Partial<PaymentDefaults> };
  const d = json.data ?? {};
  return {
    defaultModeOfPayment: String(d.defaultModeOfPayment ?? ""),
  };
}

// ---------------------------------------------------------------------------
// React Query hook — read
// ---------------------------------------------------------------------------

export function usePaymentDefaults() {
  return useQuery({
    queryKey: PaymentDefaultKeys.all(),
    queryFn: async (): Promise<PaymentDefaults> => {
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
// Sync getter — for use in detail-page effects that run once on mount.
// Returns cached defaults if available, empty strings otherwise.
// ---------------------------------------------------------------------------

let _cachedDefaults: PaymentDefaults | null = null;
let _cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Get cached payment defaults synchronously. Returns empty strings if not
 * yet fetched. The caller should call `fetchPaymentDefaults()` on mount
 * to populate the cache.
 */
export function getCachedPaymentDefaults(): PaymentDefaults {
  if (_cachedDefaults && Date.now() - _cacheTimestamp < CACHE_TTL) {
    return _cachedDefaults;
  }
  return { ...EMPTY_DEFAULTS };
}

/**
 * Fetch and cache payment defaults. Call once on app mount or in detail-page
 * effects. Returns the fetched defaults.
 */
export async function fetchPaymentDefaults(): Promise<PaymentDefaults> {
  try {
    const defaults = await requestDefaults();
    _cachedDefaults = defaults;
    _cacheTimestamp = Date.now();
    return defaults;
  } catch {
    return { ...EMPTY_DEFAULTS };
  }
}

/**
 * Get the default Mode of Payment. Returns "" if not configured.
 * Use in Mark-as-Paid dialogs on SI/PI detail pages.
 */
export function getDefaultModeOfPayment(): string {
  return getCachedPaymentDefaults().defaultModeOfPayment;
}

// ---------------------------------------------------------------------------
// Mutation — write (used by the settings page)
// ---------------------------------------------------------------------------

export function useUpdatePaymentDefaults() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (defaults: PaymentDefaults) => {
      const res = await fetch(DEFAULTS_ENDPOINT, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(defaults),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null) as
          | { details?: string; error?: string }
          | null;
        throw new Error(
          json?.details || json?.error || "Failed to save payment defaults",
        );
      }
      return defaults;
    },
    onSuccess: (defaults) => {
      // Refresh the synchronous cache + React Query.
      _cachedDefaults = defaults;
      _cacheTimestamp = Date.now();
      qc.invalidateQueries({ queryKey: PaymentDefaultKeys.all() });
    },
  });
}
