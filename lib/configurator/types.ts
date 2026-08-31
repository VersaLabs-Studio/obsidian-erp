// lib/configurator/types.ts
// V4 Configurator — extended with pricing discriminator + matrix support.
// P1 Schema-First: these types are the source of truth for both the
// configurator UI and the catalog seed script (B4).
// 2W A1-B1: added `value`, `is_default`, `Pricing`, `category`, `min_qty`.

export interface OptionChoice {
  label: string;
  /** Stable token for matrix pricing keys; defaults to label if absent. */
  value?: string;
  /** Price delta in additive mode; 0 in matrix mode. */
  price_delta: number;
  /** Raw-material Item code consumed when this choice is selected. */
  component_item?: string;
  /** Qty of component per finished unit (default 1). */
  qty_formula?: number;
  /** The "Common" selection — seeds the default BOM. */
  is_default?: boolean;
}

export interface OptionGroup {
  name: string;
  type: "single" | "multi";
  choices: OptionChoice[];
}

/**
 * Pricing discriminator.
 *
 * - `additive`: price = `basePrice + Σ price_delta` of selected choices.
 * - `matrix`: price = `table[key]` where key = the `value` tokens of the
 *   groups named in `keyOrder`, joined by `"|"`.
 */
export type Pricing =
  | { mode: "additive"; basePrice: number }
  | { mode: "matrix"; keyOrder: string[]; table: Record<string, number> };

export interface OptionSet {
  item_code: string;
  item_name: string;
  /** ERPNext Item Group (e.g. "Business Cards", "Stationery"). */
  category: string;
  /** Minimum order quantity (e.g. 50 for business cards). */
  min_qty: number;
  pricing: Pricing;
  options: OptionGroup[];
}

export interface ConfiguredLine {
  item_code: string;
  description: string;
  options: Record<string, string | string[]>;
  rate: number;
  components: Array<{
    item_code: string;
    qty: number;
  }>;
}

/**
 * Build the matrix pricing key from selections.
 * Works for both OptionSet and any object with the same shape.
 */
export function matrixKey(
  pricing: Pricing,
  options: OptionGroup[],
  selections: Record<string, string | string[]>,
): string {
  if (pricing.mode !== "matrix") return "";
  return pricing.keyOrder
    .map((groupName) => {
      const group = options.find((g) => g.name === groupName)!;
      const label = selections[groupName] as string;
      const choice = group.choices.find((c) => c.label === label);
      return choice?.value ?? choice?.label ?? label;
    })
    .join("|");
}
