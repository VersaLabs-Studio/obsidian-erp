// lib/query-keys.ts
// Pana ERP v3.0 - Centralized Query Key Factory

import type { FrappeListOptions } from "@/hooks/generic/useFrappeList";

/**
 * Centralized query key factory for consistent cache management
 *
 * @example
 * ```ts
 * // In a hook
 * queryClient.invalidateQueries({ queryKey: queryKeys.item.all() });
 *
 * // For list query
 * const queryKey = queryKeys.item.list({ search: "test" });
 *
 * // For single document
 * const queryKey = queryKeys.item.doc("ITEM-001");
 * ```
 */
export const queryKeys = {
  // ============================================================================
  // STOCK MODULE
  // ============================================================================
  item: {
    all: () => ["Item"] as const,
    list: (options?: FrappeListOptions) => ["Item", "list", options] as const,
    doc: (name: string) => ["Item", "doc", name] as const,
  },
  itemGroup: {
    all: () => ["Item Group"] as const,
    list: (options?: FrappeListOptions) =>
      ["Item Group", "list", options] as const,
    doc: (name: string) => ["Item Group", "doc", name] as const,
  },
  itemPrice: {
    all: () => ["Item Price"] as const,
    list: (options?: FrappeListOptions) =>
      ["Item Price", "list", options] as const,
    doc: (name: string) => ["Item Price", "doc", name] as const,
  },
  uom: {
    all: () => ["UOM"] as const,
    list: (options?: FrappeListOptions) => ["UOM", "list", options] as const,
    doc: (name: string) => ["UOM", "doc", name] as const,
  },
  warehouse: {
    all: () => ["Warehouse"] as const,
    list: (options?: FrappeListOptions) =>
      ["Warehouse", "list", options] as const,
    doc: (name: string) => ["Warehouse", "doc", name] as const,
  },
  stockEntry: {
    all: () => ["Stock Entry"] as const,
    list: (options?: FrappeListOptions) =>
      ["Stock Entry", "list", options] as const,
    doc: (name: string) => ["Stock Entry", "doc", name] as const,
  },
  deliveryNote: {
    all: () => ["Delivery Note"] as const,
    list: (options?: FrappeListOptions) =>
      ["Delivery Note", "list", options] as const,
    doc: (name: string) => ["Delivery Note", "doc", name] as const,
  },

  // ============================================================================
  // CRM MODULE
  // ============================================================================
  customer: {
    all: () => ["Customer"] as const,
    list: (options?: FrappeListOptions) =>
      ["Customer", "list", options] as const,
    doc: (name: string) => ["Customer", "doc", name] as const,
  },
  lead: {
    all: () => ["Lead"] as const,
    list: (options?: FrappeListOptions) => ["Lead", "list", options] as const,
    doc: (name: string) => ["Lead", "doc", name] as const,
  },
  opportunity: {
    all: () => ["Opportunity"] as const,
    list: (options?: FrappeListOptions) =>
      ["Opportunity", "list", options] as const,
    doc: (name: string) => ["Opportunity", "doc", name] as const,
  },
  salesOrder: {
    all: () => ["Sales Order"] as const,
    list: (options?: FrappeListOptions) =>
      ["Sales Order", "list", options] as const,
    doc: (name: string) => ["Sales Order", "doc", name] as const,
  },
  quotation: {
    all: () => ["Quotation"] as const,
    list: (options?: FrappeListOptions) =>
      ["Quotation", "list", options] as const,
    doc: (name: string) => ["Quotation", "doc", name] as const,
  },

  // ============================================================================
  // PURCHASING MODULE
  // ============================================================================
  supplier: {
    all: () => ["Supplier"] as const,
    list: (options?: FrappeListOptions) =>
      ["Supplier", "list", options] as const,
    doc: (name: string) => ["Supplier", "doc", name] as const,
  },
  purchaseOrder: {
    all: () => ["Purchase Order"] as const,
    list: (options?: FrappeListOptions) =>
      ["Purchase Order", "list", options] as const,
    doc: (name: string) => ["Purchase Order", "doc", name] as const,
  },

  // ============================================================================
  // ACCOUNTING MODULE
  // ============================================================================
  company: {
    all: () => ["Company"] as const,
    list: (options?: FrappeListOptions) =>
      ["Company", "list", options] as const,
    doc: (name: string) => ["Company", "doc", name] as const,
  },
  account: {
    all: () => ["Account"] as const,
    list: (options?: FrappeListOptions) =>
      ["Account", "list", options] as const,
    doc: (name: string) => ["Account", "doc", name] as const,
  },
  paymentEntry: {
    all: () => ["Payment Entry"] as const,
    list: (options?: FrappeListOptions) =>
      ["Payment Entry", "list", options] as const,
    doc: (name: string) => ["Payment Entry", "doc", name] as const,
  },

  // ============================================================================
  // MANUFACTURING MODULE
  // ============================================================================
  bom: {
    all: () => ["BOM"] as const,
    list: (options?: FrappeListOptions) => ["BOM", "list", options] as const,
    doc: (name: string) => ["BOM", "doc", name] as const,
  },
  workOrder: {
    all: () => ["Work Order"] as const,
    list: (options?: FrappeListOptions) =>
      ["Work Order", "list", options] as const,
    doc: (name: string) => ["Work Order", "doc", name] as const,
  },

  // ============================================================================
  // ASSETS MODULE
  // ============================================================================
  asset: {
    all: () => ["Asset"] as const,
    list: (options?: FrappeListOptions) => ["Asset", "list", options] as const,
    doc: (name: string) => ["Asset", "doc", name] as const,
  },
  assetCategory: {
    all: () => ["Asset Category"] as const,
    list: (options?: FrappeListOptions) =>
      ["Asset Category", "list", options] as const,
    doc: (name: string) => ["Asset Category", "doc", name] as const,
  },
} as const;

/**
 * Get query keys for any doctype dynamically
 * Use this for doctypes not explicitly defined above
 */
export function getQueryKeys(doctype: string) {
  return {
    all: () => [doctype] as const,
    list: (options?: FrappeListOptions) => [doctype, "list", options] as const,
    doc: (name: string) => [doctype, "doc", name] as const,
  };
}

export default queryKeys;
