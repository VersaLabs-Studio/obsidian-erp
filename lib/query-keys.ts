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
    tree: () => ["Warehouse", "tree"] as const,
    byParent: (parentWarehouse: string) =>
      ["Warehouse", "list", "parent", parentWarehouse] as const,
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
    // Query key for fetching customers converted from a specific lead
    fromLead: (leadName: string) =>
      ["Customer", "list", "lead", leadName] as const,
  },
  lead: {
    all: () => ["Lead"] as const,
    list: (options?: FrappeListOptions) => ["Lead", "list", options] as const,
    doc: (name: string) => ["Lead", "doc", name] as const,
  },

  // NEW: Address Keys
  address: {
    all: () => ["Address"] as const,
    list: (options?: FrappeListOptions) =>
      ["Address", "list", options] as const,
    doc: (name: string) => ["Address", "doc", name] as const,
    // Special key for fetching by Dynamic Link
    listByLink: (linkDoctype: string, linkName: string) =>
      ["Address", "list", "link", linkDoctype, linkName] as const,
  },

  // NEW: Contact Keys
  contact: {
    all: () => ["Contact"] as const,
    list: (options?: FrappeListOptions) =>
      ["Contact", "list", options] as const,
    doc: (name: string) => ["Contact", "doc", name] as const,
    // Special key for fetching by Dynamic Link
    listByLink: (linkDoctype: string, linkName: string) =>
      ["Contact", "list", "link", linkDoctype, linkName] as const,
  },

  opportunity: {
    all: () => ["Opportunity"] as const,
    list: (options?: FrappeListOptions) =>
      ["Opportunity", "list", options] as const,
    doc: (name: string) => ["Opportunity", "doc", name] as const,
  },

  // ============================================================================
  // SALES MODULE
  // ============================================================================
  quotation: {
    all: () => ["Quotation"] as const,
    list: (options?: FrappeListOptions) =>
      ["Quotation", "list", options] as const,
    doc: (name: string) => ["Quotation", "doc", name] as const,
    byCustomer: (customerName: string) =>
      ["Quotation", "list", "customer", customerName] as const,
  },
  salesOrder: {
    all: () => ["Sales Order"] as const,
    list: (options?: FrappeListOptions) =>
      ["Sales Order", "list", options] as const,
    doc: (name: string) => ["Sales Order", "doc", name] as const,
    byCustomer: (customerName: string) =>
      ["Sales Order", "list", "customer", customerName] as const,
    fromQuotation: (quotationName: string) =>
      ["Sales Order", "list", "quotation", quotationName] as const,
  },
  salesPerson: {
    all: () => ["Sales Person"] as const,
    list: (options?: FrappeListOptions) =>
      ["Sales Person", "list", options] as const,
    doc: (name: string) => ["Sales Person", "doc", name] as const,
  },
  salesPartner: {
    all: () => ["Sales Partner"] as const,
    list: (options?: FrappeListOptions) =>
      ["Sales Partner", "list", options] as const,
    doc: (name: string) => ["Sales Partner", "doc", name] as const,
  },
  termsAndConditions: {
    all: () => ["Terms and Conditions"] as const,
    list: (options?: FrappeListOptions) =>
      ["Terms and Conditions", "list", options] as const,
    doc: (name: string) => ["Terms and Conditions", "doc", name] as const,
  },
  salesTaxesTemplate: {
    all: () => ["Sales Taxes and Charges Template"] as const,
    list: (options?: FrappeListOptions) =>
      ["Sales Taxes and Charges Template", "list", options] as const,
    doc: (name: string) =>
      ["Sales Taxes and Charges Template", "doc", name] as const,
  },
  project: {
    all: () => ["Project"] as const,
    list: (options?: FrappeListOptions) =>
      ["Project", "list", options] as const,
    doc: (name: string) => ["Project", "doc", name] as const,
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
  currency: {
    all: () => ["Currency"] as const,
    list: (options?: FrappeListOptions) =>
      ["Currency", "list", options] as const,
    doc: (name: string) => ["Currency", "doc", name] as const,
  },
  priceList: {
    all: () => ["Price List"] as const,
    list: (options?: FrappeListOptions) =>
      ["Price List", "list", options] as const,
    doc: (name: string) => ["Price List", "doc", name] as const,
  },

  // ============================================================================
  // MANUFACTURING MODULE
  // ============================================================================
  bom: {
    all: () => ["BOM"] as const,
    list: (options?: FrappeListOptions) => ["BOM", "list", options] as const,
    doc: (name: string) => ["BOM", "doc", name] as const,
    byItem: (itemCode: string) => ["BOM", "list", "item", itemCode] as const,
    defaultForItem: (itemCode: string) => ["BOM", "default", itemCode] as const,
  },
  workOrder: {
    all: () => ["Work Order"] as const,
    list: (options?: FrappeListOptions) =>
      ["Work Order", "list", options] as const,
    doc: (name: string) => ["Work Order", "doc", name] as const,
    bySalesOrder: (so: string) =>
      ["Work Order", "list", "sales_order", so] as const,
    byStatus: (status: string) =>
      ["Work Order", "list", "status", status] as const,
    byItem: (item: string) => ["Work Order", "list", "item", item] as const,
    pendingMaterials: (name: string) =>
      ["Work Order", name, "pending_materials"] as const,
  },
  workstation: {
    all: () => ["Workstation"] as const,
    list: (options?: FrappeListOptions) =>
      ["Workstation", "list", options] as const,
    doc: (name: string) => ["Workstation", "doc", name] as const,
  },
  operation: {
    all: () => ["Operation"] as const,
    list: (options?: FrappeListOptions) =>
      ["Operation", "list", options] as const,
    doc: (name: string) => ["Operation", "doc", name] as const,
    byWorkstation: (workstationName: string) =>
      ["Operation", "list", "workstation", workstationName] as const,
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
