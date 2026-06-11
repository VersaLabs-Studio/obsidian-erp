// lib/flows/item-price-lookup.ts
// Obsidian ERP v4.0 — Item Price Auto-Rate Lookup (master §10.4).
//
// When an item is selected (or the doc's price list changes) in a transactional
// wizard, look up the matching Item Price and auto-fill that row's `rate`.
// The filled rate is EDITABLE (not locked) — pricing is a suggestion the user
// can override. If no Item Price exists, the rate stays as-is (manual).
//
// Selling wizards  (Quotation, Sales Order, Sales Invoice, Delivery Note):
//   match on  item_code  +  price_list  +  currency,  selling = 1
// Buying wizards   (Purchase Order, Purchase Invoice, RFQ, Supplier Quotation):
//   match on  item_code  +  price_list  +  currency,  buying  = 1
//
// Implementation note: this is a *thin* lookup helper. The existing
// `useFrappeList` hook + the existing `app/api/stock/settings/item-price`
// route are the data source. We don't introduce a new abstraction
// (Reporting Contract rule 2).

import { useFrappeList } from "@/hooks/generic";

/** Doctype filter — the selling/buying flag. */
export type ItemPriceSide = "selling" | "buying";

export interface LookupItemPriceInput {
  /** The item code to look up */
  itemCode: string;
  /** The price list name (e.g. "Standard Selling", "Standard Buying") */
  priceList: string;
  /** The currency (e.g. "ETB", "USD") */
  currency: string;
  /** Which side the wizard is on */
  side: ItemPriceSide;
  /** Optional UOM — some price lists differentiate by UOM */
  uom?: string;
  /** Optional min qty — some price lists have tiered pricing */
  qty?: number;
}

export interface ItemPriceMatch {
  /** The price list rate */
  rate: number;
  /** The currency from the price list */
  currency: string;
  /** The price list name (echoed for caller display) */
  priceList: string;
  /** The Item Price doc name */
  itemPriceName: string;
}

interface ItemPriceRow {
  name: string;
  item_code: string;
  price_list: string;
  price_list_rate: number;
  currency: string;
  selling?: number;
  buying?: number;
  uom?: string;
  min_qty?: number;
  modified?: string;
}

/**
 * Build a Frappe filter array for the Item Price lookup.
 * Exposed for testing + reuse.
 *
 * Returns a 3-tuple filter array as expected by `useFrappeList`.
 */
export function buildItemPriceFilters(input: LookupItemPriceInput): [string, string, unknown][] {
  return [
    ["item_code", "=", input.itemCode],
    ["price_list", "=", input.priceList],
    ["currency", "=", input.currency],
    [input.side === "selling" ? "selling" : "buying", "=", 1],
  ];
}

/**
 * Pick the most specific / most recent Item Price from a list of matches.
 *
 * Rule (documented per the handoff spec):
 *   1. Prefer entries that match the requested UOM (if provided).
 *   2. Then prefer entries that match the requested min qty (if provided).
 *   3. Then prefer the most recently modified entry.
 */
export function pickBestItemPrice(
  rows: ItemPriceRow[],
  input: LookupItemPriceInput,
): ItemPriceMatch | null {
  if (rows.length === 0) return null;
  let candidates = rows;
  if (input.uom) {
    const matchingUom = candidates.filter((r) => !r.uom || r.uom === input.uom);
    if (matchingUom.length > 0) candidates = matchingUom;
  }
  if (input.qty !== undefined) {
    const inputQty = input.qty;
    const matchingQty = candidates.filter(
      (r) => r.min_qty === undefined || r.min_qty === 0 || r.min_qty <= inputQty,
    );
    if (matchingQty.length > 0) candidates = matchingQty;
  }
  // Most recent first
  const sorted = [...candidates].sort((a, b) => {
    const am = a.modified ? new Date(a.modified).getTime() : 0;
    const bm = b.modified ? new Date(b.modified).getTime() : 0;
    return bm - am;
  });
  const winner = sorted[0];
  return {
    rate: Number(winner.price_list_rate) || 0,
    currency: winner.currency,
    priceList: input.priceList,
    itemPriceName: winner.name,
  };
}

export interface ItemPriceRateResult {
  /** The matched rate, or undefined if no match */
  rate: number | undefined;
  /** Whether the lookup is in flight */
  isLoading: boolean;
}

/**
 * React hook — fetches the Item Price for the given input and returns
 * the rate. Reuses the existing `useFrappeList` (factory hook) — no new
 * data layer. The caller is responsible for not invoking this with empty
 * fields; pass `enabled: false` via the input to opt out.
 */
export function useItemPriceRate(
  input: LookupItemPriceInput | null,
  options: { enabled?: boolean } = {},
): ItemPriceRateResult {
  const enabled =
    (options.enabled ?? true) &&
    !!input &&
    !!input.itemCode &&
    !!input.priceList &&
    !!input.currency;

  const { data, isLoading } = useFrappeList<ItemPriceRow>(
    "Item Price",
    {
      fields: [
        "name",
        "item_code",
        "price_list",
        "price_list_rate",
        "currency",
        "selling",
        "buying",
        "uom",
        "min_qty",
        "modified",
      ],
      filters: input
        ? (buildItemPriceFilters(input) as [string, string, unknown][])
        : [],
      orderBy: { field: "modified", order: "desc" },
      limit: 5,
    },
    { enabled },
  );

  if (!enabled || !data || !input) return { rate: undefined, isLoading };
  const match = pickBestItemPrice(data, input);
  return { rate: match?.rate, isLoading };
}

/**
 * Synchronous lookup helper — used by tests and by callers that already have
 * a list of Item Price rows in hand.
 */
export function lookupItemPriceRate(
  rows: ItemPriceRow[],
  input: LookupItemPriceInput,
): number | undefined {
  return pickBestItemPrice(rows, input)?.rate;
}

/**
 * Exported for testing only — the canonical API path for the Item Price
 * doctype. Kept here so the look-up story is testable without a network.
 */
export const ITEM_PRICE_API_PATH = "/api/stock/settings/item-price";

