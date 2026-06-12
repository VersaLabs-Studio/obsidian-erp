// lib/flows/flow-auto-fill.ts
// Obsidian ERP v4.0 - Auto-Fill Registry
// Per Workflow Part 3 §1 — maps fields from source to target doctype
// COMPLETE registry for all major doctype transitions

import type { AutoFillRegistryEntry } from "@/types/flow-types";

/**
 * Complete auto-fill registry
 * Maps source doctype → target doctype with field-level mappings
 *
 * Each entry defines:
 * - headerMappings: top-level fields to copy
 * - itemMappings: child table fields to copy
 * - userMustFill: fields the user must manually enter
 * - defaults: default values for fields not in source
 */
export const AUTO_FILL_REGISTRY: Record<string, AutoFillRegistryEntry> = {
  // =========================================================================
  // QUOTATION → SALES ORDER
  // Per Workflow Part 3 §1.1
  // =========================================================================
  "Quotation->Sales Order": {
    sourceDoctype: "Quotation",
    targetDoctype: "Sales Order",
    // G1: Quotation stores party in `party_name`, not `customer`.
    // `customer` is populated server-side after insert when quotation_to="Customer".
    // Guard: only apply when quotation_to === "Customer" (not Lead quotations).
    autoFillGuard: (sourceDoc: Record<string, unknown>) =>
      sourceDoc.quotation_to === "Customer",
    headerMappings: [
      { sourceField: "party_name", targetField: "customer", isReadOnly: true, sourceLabel: "Customer" },
      { sourceField: "party_name", targetField: "customer_name", isReadOnly: true, sourceLabel: "Customer Name" },
      { sourceField: "currency", targetField: "currency", isReadOnly: true, sourceLabel: "Currency" },
      { sourceField: "conversion_rate", targetField: "conversion_rate", isReadOnly: true, sourceLabel: "Exchange Rate" },
      { sourceField: "selling_price_list", targetField: "selling_price_list", isReadOnly: true, sourceLabel: "Price List" },
      { sourceField: "price_list_currency", targetField: "price_list_currency", isReadOnly: true, sourceLabel: "Price List Currency" },
      { sourceField: "plc_conversion_rate", targetField: "plc_conversion_rate", isReadOnly: true, sourceLabel: "PLC Conversion Rate" },
      { sourceField: "taxes_and_charges", targetField: "taxes_and_charges", isReadOnly: false, sourceLabel: "Tax Template" },
      { sourceField: "tc_name", targetField: "tc_name", isReadOnly: false, sourceLabel: "Terms & Conditions" },
      { sourceField: "territory", targetField: "territory", isReadOnly: true, sourceLabel: "Territory" },
      { sourceField: "customer_address", targetField: "customer_address", isReadOnly: true, sourceLabel: "Customer Address" },
      { sourceField: "shipping_address_name", targetField: "shipping_address_name", isReadOnly: true, sourceLabel: "Shipping Address" },
      { sourceField: "contact_person", targetField: "contact_person", isReadOnly: true, sourceLabel: "Contact Person" },
      { sourceField: "campaign", targetField: "campaign", isReadOnly: true, sourceLabel: "Campaign" },
      { sourceField: "source", targetField: "source", isReadOnly: true, sourceLabel: "Lead Source" },
      { sourceField: "order_type", targetField: "order_type", isReadOnly: true, sourceLabel: "Order Type" },
    ],
    itemMappings: [
      { sourceField: "item_code", targetField: "item_code", isReadOnly: true, sourceLabel: "Item Code" },
      { sourceField: "item_name", targetField: "item_name", isReadOnly: true, sourceLabel: "Item Name" },
      { sourceField: "description", targetField: "description", isReadOnly: true, sourceLabel: "Description" },
      { sourceField: "qty", targetField: "qty", isReadOnly: false, sourceLabel: "Quantity" },
      { sourceField: "rate", targetField: "rate", isReadOnly: false, sourceLabel: "Rate" },
      { sourceField: "amount", targetField: "amount", isReadOnly: true, sourceLabel: "Amount" },
      { sourceField: "uom", targetField: "uom", isReadOnly: true, sourceLabel: "UOM" },
      { sourceField: "conversion_factor", targetField: "conversion_factor", isReadOnly: true, sourceLabel: "Conversion Factor" },
      { sourceField: "warehouse", targetField: "warehouse", isReadOnly: false, sourceLabel: "Warehouse" },
      { sourceField: "item_group", targetField: "item_group", isReadOnly: true, sourceLabel: "Item Group" },
      { sourceField: "brand", targetField: "brand", isReadOnly: true, sourceLabel: "Brand" },
    ],
    userMustFill: ["delivery_date", "warehouse"],
    defaults: {
      naming_series: "SAL-ORD-.YYYY.-",
      order_type: "Sales",
      status: "Draft",
    },
  },

  // =========================================================================
  // SALES ORDER → WORK ORDER
  // Per Workflow Part 3 §1.2
  // =========================================================================
  "Sales Order->Work Order": {
    sourceDoctype: "Sales Order",
    targetDoctype: "Work Order",
    headerMappings: [
      { sourceField: "company", targetField: "company", isReadOnly: true, sourceLabel: "Company" },
      { sourceField: "name", targetField: "sales_order", isReadOnly: true, sourceLabel: "Sales Order" },
    ],
    itemMappings: [
      { sourceField: "item_code", targetField: "production_item", isReadOnly: true, sourceLabel: "Production Item" },
      { sourceField: "item_name", targetField: "item_name", isReadOnly: true, sourceLabel: "Item Name" },
      { sourceField: "qty", targetField: "qty", isReadOnly: false, sourceLabel: "Quantity" },
      { sourceField: "warehouse", targetField: "fg_warehouse", isReadOnly: false, sourceLabel: "FG Warehouse" },
    ],
    userMustFill: ["planned_start_date", "wip_warehouse", "source_warehouse"],
    defaults: {
      naming_series: "MFG-WO-.YYYY.-",
      status: "Draft",
      docstatus: 0,
    },
  },

  // =========================================================================
  // SALES ORDER → DELIVERY NOTE
  // Per Workflow Part 3 §1.3
  // =========================================================================
  "Sales Order->Delivery Note": {
    sourceDoctype: "Sales Order",
    targetDoctype: "Delivery Note",
    headerMappings: [
      { sourceField: "customer", targetField: "customer", isReadOnly: true, sourceLabel: "Customer" },
      { sourceField: "customer_name", targetField: "customer_name", isReadOnly: true, sourceLabel: "Customer Name" },
      { sourceField: "company", targetField: "company", isReadOnly: true, sourceLabel: "Company" },
      { sourceField: "currency", targetField: "currency", isReadOnly: true, sourceLabel: "Currency" },
      { sourceField: "conversion_rate", targetField: "conversion_rate", isReadOnly: true, sourceLabel: "Exchange Rate" },
      { sourceField: "selling_price_list", targetField: "selling_price_list", isReadOnly: true, sourceLabel: "Price List" },
      { sourceField: "customer_address", targetField: "customer_address", isReadOnly: true, sourceLabel: "Customer Address" },
      { sourceField: "shipping_address_name", targetField: "shipping_address_name", isReadOnly: true, sourceLabel: "Shipping Address" },
      { sourceField: "contact_person", targetField: "contact_person", isReadOnly: true, sourceLabel: "Contact Person" },
      { sourceField: "taxes_and_charges", targetField: "taxes_and_charges", isReadOnly: false, sourceLabel: "Tax Template" },
      { sourceField: "tc_name", targetField: "tc_name", isReadOnly: false, sourceLabel: "Terms & Conditions" },
    ],
    itemMappings: [
      { sourceField: "item_code", targetField: "item_code", isReadOnly: true, sourceLabel: "Item Code" },
      { sourceField: "item_name", targetField: "item_name", isReadOnly: true, sourceLabel: "Item Name" },
      { sourceField: "description", targetField: "description", isReadOnly: true, sourceLabel: "Description" },
      { sourceField: "qty", targetField: "qty", isReadOnly: false, sourceLabel: "Quantity" },
      { sourceField: "rate", targetField: "rate", isReadOnly: true, sourceLabel: "Rate" },
      { sourceField: "amount", targetField: "amount", isReadOnly: true, sourceLabel: "Amount" },
      { sourceField: "uom", targetField: "uom", isReadOnly: true, sourceLabel: "UOM" },
      { sourceField: "warehouse", targetField: "warehouse", isReadOnly: false, sourceLabel: "Warehouse" },
    ],
    userMustFill: ["set_posting_time"],
    defaults: {
      naming_series: "MAT-DN-.YYYY.-",
      status: "Draft",
    },
  },

  // =========================================================================
  // SALES ORDER → SALES INVOICE  (2M Part 1A)
  // ERPNext carries `sales_order` as a top-level field on Sales Invoice;
  // cross-flow / WhatsNext passes ?sales_order=SO-… so the SI wizard can
  // prefill customer, currency, price list, and the items. Add to the
  // registry so the new SO→SI prefill effect can resolve the mapping.
  // =========================================================================
  "Sales Order->Sales Invoice": {
    sourceDoctype: "Sales Order",
    targetDoctype: "Sales Invoice",
    headerMappings: [
      { sourceField: "name", targetField: "sales_order", isReadOnly: true, sourceLabel: "Sales Order" },
      { sourceField: "customer", targetField: "customer", isReadOnly: true, sourceLabel: "Customer" },
      { sourceField: "customer_name", targetField: "customer_name", isReadOnly: true, sourceLabel: "Customer Name" },
      { sourceField: "company", targetField: "company", isReadOnly: true, sourceLabel: "Company" },
      { sourceField: "currency", targetField: "currency", isReadOnly: true, sourceLabel: "Currency" },
      { sourceField: "conversion_rate", targetField: "conversion_rate", isReadOnly: true, sourceLabel: "Exchange Rate" },
      { sourceField: "selling_price_list", targetField: "selling_price_list", isReadOnly: true, sourceLabel: "Price List" },
      { sourceField: "customer_address", targetField: "customer_address", isReadOnly: true, sourceLabel: "Customer Address" },
      { sourceField: "shipping_address_name", targetField: "shipping_address_name", isReadOnly: true, sourceLabel: "Shipping Address" },
      { sourceField: "contact_person", targetField: "contact_person", isReadOnly: true, sourceLabel: "Contact Person" },
      { sourceField: "taxes_and_charges", targetField: "taxes_and_charges", isReadOnly: false, sourceLabel: "Tax Template" },
      { sourceField: "tc_name", targetField: "tc_name", isReadOnly: false, sourceLabel: "Terms & Conditions" },
    ],
    itemMappings: [
      { sourceField: "item_code", targetField: "item_code", isReadOnly: true, sourceLabel: "Item Code" },
      { sourceField: "item_name", targetField: "item_name", isReadOnly: true, sourceLabel: "Item Name" },
      { sourceField: "description", targetField: "description", isReadOnly: true, sourceLabel: "Description" },
      { sourceField: "qty", targetField: "qty", isReadOnly: false, sourceLabel: "Quantity" },
      { sourceField: "rate", targetField: "rate", isReadOnly: false, sourceLabel: "Rate" },
      { sourceField: "amount", targetField: "amount", isReadOnly: true, sourceLabel: "Amount" },
      { sourceField: "uom", targetField: "uom", isReadOnly: true, sourceLabel: "UOM" },
      { sourceField: "warehouse", targetField: "warehouse", isReadOnly: false, sourceLabel: "Warehouse" },
    ],
    userMustFill: ["due_date", "set_posting_time"],
    defaults: {
      naming_series: "ACC-SINV-.YYYY.-",
      status: "Draft",
      is_pos: 0,
    },
  },

  // =========================================================================
  // DELIVERY NOTE → SALES INVOICE
  // Per Workflow Part 3 §1.4
  // =========================================================================
  "Delivery Note->Sales Invoice": {
    sourceDoctype: "Delivery Note",
    targetDoctype: "Sales Invoice",
    headerMappings: [
      { sourceField: "customer", targetField: "customer", isReadOnly: true, sourceLabel: "Customer" },
      { sourceField: "customer_name", targetField: "customer_name", isReadOnly: true, sourceLabel: "Customer Name" },
      { sourceField: "company", targetField: "company", isReadOnly: true, sourceLabel: "Company" },
      { sourceField: "currency", targetField: "currency", isReadOnly: true, sourceLabel: "Currency" },
      { sourceField: "conversion_rate", targetField: "conversion_rate", isReadOnly: true, sourceLabel: "Exchange Rate" },
      { sourceField: "selling_price_list", targetField: "selling_price_list", isReadOnly: true, sourceLabel: "Price List" },
      { sourceField: "customer_address", targetField: "customer_address", isReadOnly: true, sourceLabel: "Customer Address" },
      { sourceField: "shipping_address_name", targetField: "shipping_address_name", isReadOnly: true, sourceLabel: "Shipping Address" },
      { sourceField: "taxes_and_charges", targetField: "taxes_and_charges", isReadOnly: false, sourceLabel: "Tax Template" },
      { sourceField: "tc_name", targetField: "tc_name", isReadOnly: false, sourceLabel: "Terms & Conditions" },
    ],
    itemMappings: [
      { sourceField: "item_code", targetField: "item_code", isReadOnly: true, sourceLabel: "Item Code" },
      { sourceField: "item_name", targetField: "item_name", isReadOnly: true, sourceLabel: "Item Name" },
      { sourceField: "description", targetField: "description", isReadOnly: true, sourceLabel: "Description" },
      { sourceField: "qty", targetField: "qty", isReadOnly: false, sourceLabel: "Quantity" },
      { sourceField: "rate", targetField: "rate", isReadOnly: false, sourceLabel: "Rate" },
      { sourceField: "amount", targetField: "amount", isReadOnly: true, sourceLabel: "Amount" },
      { sourceField: "uom", targetField: "uom", isReadOnly: true, sourceLabel: "UOM" },
      { sourceField: "warehouse", targetField: "warehouse", isReadOnly: true, sourceLabel: "Warehouse" },
    ],
    userMustFill: ["due_date", "set_posting_time"],
    defaults: {
      naming_series: "ACC-SINV-.YYYY.-",
      status: "Draft",
      is_pos: 0,
    },
  },

  // =========================================================================
  // SALES INVOICE → PAYMENT ENTRY
  // Per Workflow Part 3 §1.5
  // =========================================================================
  "Sales Invoice->Payment Entry": {
    sourceDoctype: "Sales Invoice",
    targetDoctype: "Payment Entry",
    headerMappings: [
      { sourceField: "customer", targetField: "party", isReadOnly: true, sourceLabel: "Customer" },
      { sourceField: "customer_name", targetField: "party_name", isReadOnly: true, sourceLabel: "Customer Name" },
      { sourceField: "company", targetField: "company", isReadOnly: true, sourceLabel: "Company" },
      { sourceField: "currency", targetField: "paid_from_account_currency", isReadOnly: true, sourceLabel: "Currency" },
    ],
    itemMappings: [],
    userMustFill: ["paid_amount", "payment_type", "mode_of_payment", "paid_from", "paid_to"],
    defaults: {
      naming_series: "ACC-PAY-.YYYY.-",
      payment_type: "Receive",
      party_type: "Customer",
      docstatus: 0,
    },
  },

  // =========================================================================
  // PURCHASE ORDER → PURCHASE RECEIPT
  // =========================================================================
  "Purchase Order->Purchase Receipt": {
    sourceDoctype: "Purchase Order",
    targetDoctype: "Purchase Receipt",
    headerMappings: [
      { sourceField: "supplier", targetField: "supplier", isReadOnly: true, sourceLabel: "Supplier" },
      { sourceField: "supplier_name", targetField: "supplier_name", isReadOnly: true, sourceLabel: "Supplier Name" },
      { sourceField: "company", targetField: "company", isReadOnly: true, sourceLabel: "Company" },
      { sourceField: "currency", targetField: "currency", isReadOnly: true, sourceLabel: "Currency" },
    ],
    itemMappings: [
      { sourceField: "item_code", targetField: "item_code", isReadOnly: true, sourceLabel: "Item Code" },
      { sourceField: "item_name", targetField: "item_name", isReadOnly: true, sourceLabel: "Item Name" },
      { sourceField: "qty", targetField: "qty", isReadOnly: false, sourceLabel: "Quantity" },
      { sourceField: "rate", targetField: "rate", isReadOnly: true, sourceLabel: "Rate" },
      { sourceField: "warehouse", targetField: "warehouse", isReadOnly: false, sourceLabel: "Warehouse" },
    ],
    userMustFill: ["set_posting_time"],
    defaults: {
      naming_series: "MAT-PRE-.YYYY.-",
    },
  },

  // =========================================================================
  // PURCHASE RECEIPT → PURCHASE INVOICE
  // =========================================================================
  "Purchase Receipt->Purchase Invoice": {
    sourceDoctype: "Purchase Receipt",
    targetDoctype: "Purchase Invoice",
    headerMappings: [
      { sourceField: "supplier", targetField: "supplier", isReadOnly: true, sourceLabel: "Supplier" },
      { sourceField: "supplier_name", targetField: "supplier_name", isReadOnly: true, sourceLabel: "Supplier Name" },
      { sourceField: "company", targetField: "company", isReadOnly: true, sourceLabel: "Company" },
    ],
    itemMappings: [
      { sourceField: "item_code", targetField: "item_code", isReadOnly: true, sourceLabel: "Item Code" },
      { sourceField: "item_name", targetField: "item_name", isReadOnly: true, sourceLabel: "Item Name" },
      { sourceField: "qty", targetField: "qty", isReadOnly: false, sourceLabel: "Quantity" },
      { sourceField: "rate", targetField: "rate", isReadOnly: false, sourceLabel: "Rate" },
    ],
    userMustFill: ["due_date", "set_posting_time"],
    defaults: {
      naming_series: "ACC-PINV-.YYYY.-",
    },
  },

  // =========================================================================
  // LEAD → CUSTOMER (B8: CRM head = Lead → Customer)
  // =========================================================================
  "Lead->Customer": {
    sourceDoctype: "Lead",
    targetDoctype: "Customer",
    headerMappings: [
      { sourceField: "lead_name", targetField: "customer_name", isReadOnly: true, sourceLabel: "Name" },
      { sourceField: "company_name", targetField: "customer_name", isReadOnly: true, sourceLabel: "Company Name" },
      { sourceField: "email_id", targetField: "email_id", isReadOnly: true, sourceLabel: "Email" },
      { sourceField: "mobile_no", targetField: "mobile_no", isReadOnly: true, sourceLabel: "Mobile" },
      { sourceField: "territory", targetField: "territory", isReadOnly: true, sourceLabel: "Territory" },
    ],
    itemMappings: [],
    userMustFill: [],
    defaults: {
      customer_group: "All Customer Groups",
      customer_type: "Company",
    },
  },
  "Customer->Quotation": {
    sourceDoctype: "Customer",
    targetDoctype: "Quotation",
    headerMappings: [
      { sourceField: "name", targetField: "party_name", isReadOnly: true, sourceLabel: "Customer ID" },
      { sourceField: "customer_name", targetField: "customer_name", isReadOnly: true, sourceLabel: "Customer Name" },
      { sourceField: "territory", targetField: "territory", isReadOnly: true, sourceLabel: "Territory" },
    ],
    itemMappings: [],
    userMustFill: ["valid_till", "items"],
    defaults: {
      naming_series: "SAL-QTN-.YYYY.-",
      quotation_to: "Customer",
      order_type: "Sales",
    },
  },

  // =========================================================================
  // OPPORTUNITY → QUOTATION (demoted — secondary flow, not primary rail)
  // =========================================================================
  "Opportunity->Quotation": {
    sourceDoctype: "Opportunity",
    targetDoctype: "Quotation",
    headerMappings: [
      { sourceField: "party_name", targetField: "party_name", isReadOnly: true, sourceLabel: "Customer" },
      { sourceField: "company_name", targetField: "company_name", isReadOnly: true, sourceLabel: "Company Name" },
      { sourceField: "territory", targetField: "territory", isReadOnly: true, sourceLabel: "Territory" },
      { sourceField: "source", targetField: "source", isReadOnly: true, sourceLabel: "Source" },
    ],
    itemMappings: [],
    userMustFill: ["valid_till", "items"],
    defaults: {
      naming_series: "SAL-QTN-.YYYY.-",
      quotation_to: "Customer",
      order_type: "Sales",
    },
  },

  // =========================================================================
  // MATERIAL REQUEST → PURCHASE ORDER
  // =========================================================================
  "Material Request->Purchase Order": {
    sourceDoctype: "Material Request",
    targetDoctype: "Purchase Order",
    headerMappings: [
      { sourceField: "company", targetField: "company", isReadOnly: true, sourceLabel: "Company" },
    ],
    itemMappings: [
      { sourceField: "item_code", targetField: "item_code", isReadOnly: true, sourceLabel: "Item Code" },
      { sourceField: "item_name", targetField: "item_name", isReadOnly: true, sourceLabel: "Item Name" },
      { sourceField: "qty", targetField: "qty", isReadOnly: false, sourceLabel: "Quantity" },
      { sourceField: "warehouse", targetField: "warehouse", isReadOnly: false, sourceLabel: "Warehouse" },
      { sourceField: "schedule_date", targetField: "schedule_date", isReadOnly: false, sourceLabel: "Required Date" },
    ],
    userMustFill: ["supplier", "schedule_date"],
    defaults: {
      naming_series: "PUR-ORD-.YYYY.-",
    },
  },

  // =========================================================================
  // MATERIAL REQUEST → REQUEST FOR QUOTATION
  // =========================================================================
  "Material Request->Request for Quotation": {
    sourceDoctype: "Material Request",
    targetDoctype: "Request for Quotation",
    headerMappings: [
      { sourceField: "company", targetField: "company", isReadOnly: true, sourceLabel: "Company" },
    ],
    itemMappings: [
      { sourceField: "item_code", targetField: "item_code", isReadOnly: true, sourceLabel: "Item Code" },
      { sourceField: "item_name", targetField: "item_name", isReadOnly: true, sourceLabel: "Item Name" },
      { sourceField: "qty", targetField: "qty", isReadOnly: false, sourceLabel: "Quantity" },
      { sourceField: "schedule_date", targetField: "schedule_date", isReadOnly: false, sourceLabel: "Required Date" },
    ],
    userMustFill: ["suppliers"],
    defaults: {
      naming_series: "PUR-RFQ-.YYYY.-",
    },
  },

  // =========================================================================
  // REQUEST FOR QUOTATION → SUPPLIER QUOTATION
  // =========================================================================
  "Request for Quotation->Supplier Quotation": {
    sourceDoctype: "Request for Quotation",
    targetDoctype: "Supplier Quotation",
    headerMappings: [
      { sourceField: "company", targetField: "company", isReadOnly: true, sourceLabel: "Company" },
    ],
    itemMappings: [
      { sourceField: "item_code", targetField: "item_code", isReadOnly: true, sourceLabel: "Item Code" },
      { sourceField: "item_name", targetField: "item_name", isReadOnly: true, sourceLabel: "Item Name" },
      { sourceField: "qty", targetField: "qty", isReadOnly: false, sourceLabel: "Quantity" },
    ],
    userMustFill: ["supplier", "rate"],
    defaults: {
      naming_series: "PUR-SQTN-.YYYY.-",
    },
  },

  // =========================================================================
  // BOM → WORK ORDER
  // =========================================================================
  "BOM->Work Order": {
    sourceDoctype: "BOM",
    targetDoctype: "Work Order",
    headerMappings: [
      { sourceField: "company", targetField: "company", isReadOnly: true, sourceLabel: "Company" },
      { sourceField: "name", targetField: "bom_no", isReadOnly: true, sourceLabel: "BOM No" },
      { sourceField: "item", targetField: "production_item", isReadOnly: true, sourceLabel: "Production Item" },
    ],
    itemMappings: [
      { sourceField: "item_code", targetField: "item_code", isReadOnly: true, sourceLabel: "Item Code" },
      { sourceField: "item_name", targetField: "item_name", isReadOnly: true, sourceLabel: "Item Name" },
      { sourceField: "qty", targetField: "required_qty", isReadOnly: false, sourceLabel: "Required Qty" },
      { sourceField: "source_warehouse", targetField: "source_warehouse", isReadOnly: false, sourceLabel: "Source Warehouse" },
    ],
    userMustFill: ["fg_warehouse", "planned_start_date"],
    defaults: {
      naming_series: "MFG-WO-.YYYY.-",
      status: "Draft",
      docstatus: 0,
    },
  },

  // =========================================================================
  // WORK ORDER → STOCK ENTRY (Manufacture)
  // =========================================================================
  "Work Order->Stock Entry": {
    sourceDoctype: "Work Order",
    targetDoctype: "Stock Entry",
    headerMappings: [
      { sourceField: "company", targetField: "company", isReadOnly: true, sourceLabel: "Company" },
      { sourceField: "name", targetField: "work_order", isReadOnly: true, sourceLabel: "Work Order" },
      { sourceField: "fg_warehouse", targetField: "to_warehouse", isReadOnly: true, sourceLabel: "Target Warehouse" },
      { sourceField: "source_warehouse", targetField: "from_warehouse", isReadOnly: true, sourceLabel: "Source Warehouse" },
    ],
    itemMappings: [],
    userMustFill: [],
    defaults: {
      purpose: "Manufacture",
      docstatus: 0,
    },
  },

  // =========================================================================
  // SUPPLIER QUOTATION → PURCHASE ORDER
  // =========================================================================
  "Supplier Quotation->Purchase Order": {
    sourceDoctype: "Supplier Quotation",
    targetDoctype: "Purchase Order",
    headerMappings: [
      { sourceField: "supplier", targetField: "supplier", isReadOnly: true, sourceLabel: "Supplier" },
      { sourceField: "supplier_name", targetField: "supplier_name", isReadOnly: true, sourceLabel: "Supplier Name" },
      { sourceField: "company", targetField: "company", isReadOnly: true, sourceLabel: "Company" },
      { sourceField: "currency", targetField: "currency", isReadOnly: true, sourceLabel: "Currency" },
    ],
    itemMappings: [
      { sourceField: "item_code", targetField: "item_code", isReadOnly: true, sourceLabel: "Item Code" },
      { sourceField: "item_name", targetField: "item_name", isReadOnly: true, sourceLabel: "Item Name" },
      { sourceField: "qty", targetField: "qty", isReadOnly: false, sourceLabel: "Quantity" },
      { sourceField: "rate", targetField: "rate", isReadOnly: true, sourceLabel: "Rate" },
      { sourceField: "warehouse", targetField: "warehouse", isReadOnly: false, sourceLabel: "Warehouse" },
    ],
    userMustFill: ["schedule_date"],
    defaults: {
      naming_series: "PUR-ORD-.YYYY.-",
    },
  },
};

/**
 * Get auto-fill mapping for a source → target transition
 */
export function getAutoFillMapping(
  sourceDoctype: string,
  targetDoctype: string
): AutoFillRegistryEntry | undefined {
  return AUTO_FILL_REGISTRY[`${sourceDoctype}->${targetDoctype}`];
}

/**
 * Apply auto-fill mapping to a source document, returning target document data
 */
export function applyAutoFill(
  sourceDoc: Record<string, unknown>,
  mapping: AutoFillRegistryEntry
): Record<string, unknown> {
  // G1: If the mapping has a guard and it fails, return only the defaults
  if (mapping.autoFillGuard && !mapping.autoFillGuard(sourceDoc)) {
    return { ...mapping.defaults };
  }

  const target: Record<string, unknown> = { ...mapping.defaults };

  // Map header fields
  for (const m of mapping.headerMappings) {
    const value = sourceDoc[m.sourceField];
    if (value !== undefined && value !== null && value !== "") {
      target[m.targetField] = value;
    }
  }

  return target;
}

/**
 * Apply auto-fill to child table items
 */
export function applyItemAutoFill(
  sourceItems: Record<string, unknown>[],
  mapping: AutoFillRegistryEntry
): Record<string, unknown>[] {
  if (!sourceItems || sourceItems.length === 0) return [];

  return sourceItems.map((sourceItem) => {
    const targetItem: Record<string, unknown> = {};

    for (const m of mapping.itemMappings) {
      const value = sourceItem[m.sourceField];
      if (value !== undefined && value !== null && value !== "") {
        targetItem[m.targetField] = value;
      }
    }

    return targetItem;
  });
}

/**
 * Get all available transitions from a source doctype
 */
export function getAvailableTransitions(sourceDoctype: string): string[] {
  return Object.keys(AUTO_FILL_REGISTRY)
    .filter((key) => key.startsWith(`${sourceDoctype}->`))
    .map((key) => key.split("->")[1]);
}
