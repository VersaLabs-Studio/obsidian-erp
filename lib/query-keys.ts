// lib/query-keys.ts
// Obsidian ERP v4.0 - Centralized Query Key Factory

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
  materialRequest: {
    all: () => ["Material Request"] as const,
    list: (options?: FrappeListOptions) =>
      ["Material Request", "list", options] as const,
    doc: (name: string) => ["Material Request", "doc", name] as const,
    byType: (type: string) =>
      ["Material Request", "list", "type", type] as const,
    byWorkOrder: (wo: string) =>
      ["Material Request", "list", "work_order", wo] as const,
    pending: () => ["Material Request", "list", "pending"] as const,
  },
  stockEntry: {
    all: () => ["Stock Entry"] as const,
    list: (options?: FrappeListOptions) =>
      ["Stock Entry", "list", options] as const,
    doc: (name: string) => ["Stock Entry", "doc", name] as const,
    byPurpose: (purpose: string) =>
      ["Stock Entry", "list", "purpose", purpose] as const,
    byWorkOrder: (wo: string) =>
      ["Stock Entry", "list", "work_order", wo] as const,
    byWarehouse: (wh: string) =>
      ["Stock Entry", "list", "warehouse", wh] as const,
  },
  deliveryNote: {
    all: () => ["Delivery Note"] as const,
    list: (options?: FrappeListOptions) =>
      ["Delivery Note", "list", options] as const,
    doc: (name: string) => ["Delivery Note", "doc", name] as const,
    byCustomer: (customer: string) =>
      ["Delivery Note", "list", "customer", customer] as const,
    byStatus: (status: string) =>
      ["Delivery Note", "list", "status", status] as const,
    bySalesOrder: (so: string) =>
      ["Delivery Note", "list", "sales_order", so] as const,
    pendingBilling: () => ["Delivery Note", "list", "to_bill"] as const,
  },
  driver: {
    all: () => ["Driver"] as const,
    list: (options?: FrappeListOptions) => ["Driver", "list", options] as const,
    doc: (name: string) => ["Driver", "doc", name] as const,
    active: () => ["Driver", "list", "active"] as const,
  },
  vehicle: {
    all: () => ["Vehicle"] as const,
    list: (options?: FrappeListOptions) =>
      ["Vehicle", "list", options] as const,
    doc: (name: string) => ["Vehicle", "doc", name] as const,
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
  // BUYING MODULE
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
    bySupplier: (supplier: string) =>
      ["Purchase Order", "list", "supplier", supplier] as const,
    toReceive: () => ["Purchase Order", "list", "to_receive"] as const,
    toBill: () => ["Purchase Order", "list", "to_bill"] as const,
  },

  // ============================================================================
  // ACCOUNTING MODULE
  // ============================================================================
  salesInvoice: {
    all: () => ["Sales Invoice"] as const,
    list: (options?: FrappeListOptions) =>
      ["Sales Invoice", "list", options] as const,
    doc: (name: string) => ["Sales Invoice", "doc", name] as const,
    byCustomer: (customer: string) =>
      ["Sales Invoice", "list", "customer", customer] as const,
    byStatus: (status: string) =>
      ["Sales Invoice", "list", "status", status] as const,
    byDeliveryNote: (dn: string) =>
      ["Sales Invoice", "list", "delivery_note", dn] as const,
    bySalesOrder: (so: string) =>
      ["Sales Invoice", "list", "sales_order", so] as const,
    overdue: () => ["Sales Invoice", "list", "overdue"] as const,
    unpaid: () => ["Sales Invoice", "list", "unpaid"] as const,
  },
  purchaseInvoice: {
    all: () => ["Purchase Invoice"] as const,
    list: (options?: FrappeListOptions) =>
      ["Purchase Invoice", "list", options] as const,
    doc: (name: string) => ["Purchase Invoice", "doc", name] as const,
    bySupplier: (supplier: string) =>
      ["Purchase Invoice", "list", "supplier", supplier] as const,
    byStatus: (status: string) =>
      ["Purchase Invoice", "list", "status", status] as const,
    overdue: () => ["Purchase Invoice", "list", "overdue"] as const,
    unpaid: () => ["Purchase Invoice", "list", "unpaid"] as const,
  },
  paymentEntry: {
    all: () => ["Payment Entry"] as const,
    list: (options?: FrappeListOptions) =>
      ["Payment Entry", "list", options] as const,
    doc: (name: string) => ["Payment Entry", "doc", name] as const,
    byParty: (partyType: string, party: string) =>
      ["Payment Entry", "list", partyType, party] as const,
    byType: (paymentType: string) =>
      ["Payment Entry", "list", "type", paymentType] as const,
    forInvoice: (doctype: string, name: string) =>
      ["Payment Entry", "list", "invoice", doctype, name] as const,
  },
  journalEntry: {
    all: () => ["Journal Entry"] as const,
    list: (options?: FrappeListOptions) =>
      ["Journal Entry", "list", options] as const,
    doc: (name: string) => ["Journal Entry", "doc", name] as const,
    byType: (voucherType: string) =>
      ["Journal Entry", "list", "type", voucherType] as const,
  },
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
    tree: (company: string) => ["Account", "tree", company] as const,
    byType: (accountType: string) =>
      ["Account", "list", "type", accountType] as const,
    receivable: (company: string) =>
      ["Account", "list", "receivable", company] as const,
    payable: (company: string) =>
      ["Account", "list", "payable", company] as const,
    bank: (company: string) => ["Account", "list", "bank", company] as const,
    cash: (company: string) => ["Account", "list", "cash", company] as const,
  },
  costCenter: {
    all: () => ["Cost Center"] as const,
    list: (options?: FrappeListOptions) =>
      ["Cost Center", "list", options] as const,
    doc: (name: string) => ["Cost Center", "doc", name] as const,
    tree: (company: string) => ["Cost Center", "tree", company] as const,
  },
  modeOfPayment: {
    all: () => ["Mode of Payment"] as const,
    list: (options?: FrappeListOptions) =>
      ["Mode of Payment", "list", options] as const,
    doc: (name: string) => ["Mode of Payment", "doc", name] as const,
    enabled: () => ["Mode of Payment", "list", "enabled"] as const,
  },
  paymentTermsTemplate: {
    all: () => ["Payment Terms Template"] as const,
    list: (options?: FrappeListOptions) =>
      ["Payment Terms Template", "list", options] as const,
    doc: (name: string) => ["Payment Terms Template", "doc", name] as const,
  },
  fiscalYear: {
    all: () => ["Fiscal Year"] as const,
    list: (options?: FrappeListOptions) =>
      ["Fiscal Year", "list", options] as const,
    current: () => ["Fiscal Year", "current"] as const,
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

  // ============================================================================
  // FLOW ENGINE
  // ============================================================================
  flow: {
    /** Query key for a specific flow chain */
    chain: (doctype: string, name: string) =>
      ["Flow", "chain", doctype, name] as const,
    /** Query key for flow status of a document */
    status: (doctype: string, name: string) =>
      ["Flow", "status", doctype, name] as const,
    /** Query key for auto-fill data from upstream document */
    autoFill: (sourceDoctype: string, targetDoctype: string, sourceName: string) =>
      ["Flow", "autoFill", sourceDoctype, targetDoctype, sourceName] as const,
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
