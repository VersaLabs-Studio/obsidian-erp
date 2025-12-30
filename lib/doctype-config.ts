// lib/doctype-config.ts
// Pana ERP v3.0 - Centralized DocType Configuration
// Single source of truth for all DocType metadata

/**
 * DocType module categories
 */
export type ModuleCategory =
  | "Stock"
  | "Manufacturing"
  | "Accounting"
  | "CRM"
  | "Purchasing"
  | "Assets"
  | "HR"
  | "Settings";

/**
 * Configuration for a single DocType
 */
export interface DocTypeConfig {
  /** API path for this doctype (e.g., "stock/item") */
  apiPath: string;
  /** Module this doctype belongs to */
  module: ModuleCategory;
  /** Field used for display labels (default: "name") */
  labelField?: string;
  /** Fields to search when filtering */
  searchFields?: string[];
  /** Default sort field */
  defaultSortField?: string;
  /** Default sort order */
  defaultSortOrder?: "asc" | "desc";
  /** Whether this is a settings/master data doctype */
  isSettings?: boolean;
}

/**
 * Centralized DocType Configuration Map
 *
 * Add all DocTypes here as you migrate them to v3.0.
 * This is the SINGLE SOURCE OF TRUTH for DocType metadata.
 */
export const DOCTYPE_CONFIG: Record<string, DocTypeConfig> = {
  // ============================================================================
  // STOCK MODULE
  // ============================================================================
  Item: {
    apiPath: "stock/item",
    module: "Stock",
    labelField: "item_name",
    searchFields: ["item_code", "item_name", "description"],
    defaultSortField: "creation",
    defaultSortOrder: "desc",
  },
  "Item Group": {
    apiPath: "stock/settings/item-group",
    module: "Stock",
    labelField: "item_group_name",
    searchFields: ["item_group_name"],
    isSettings: true,
  },
  "Item Price": {
    apiPath: "stock/settings/item-price",
    module: "Stock",
    labelField: "item_code",
    searchFields: ["item_code", "item_name"],
    isSettings: true,
  },
  UOM: {
    apiPath: "stock/settings/uom",
    module: "Stock",
    labelField: "uom_name",
    searchFields: ["uom_name"],
    isSettings: true,
  },
  Warehouse: {
    apiPath: "stock/settings/warehouse",
    module: "Stock",
    labelField: "warehouse_name",
    searchFields: ["warehouse_name"],
    isSettings: true,
  },
  "Stock Entry": {
    apiPath: "stock/stock-entries",
    module: "Stock",
    labelField: "name",
    searchFields: ["name"],
    defaultSortField: "posting_date",
    defaultSortOrder: "desc",
  },
  "Delivery Note": {
    apiPath: "stock/delivery-notes",
    module: "Stock",
    labelField: "name",
    searchFields: ["name", "customer"],
    defaultSortField: "posting_date",
    defaultSortOrder: "desc",
  },
  "Purchase Receipt": {
    apiPath: "stock/purchase-receipts",
    module: "Stock",
    labelField: "name",
    searchFields: ["name", "supplier"],
    defaultSortField: "posting_date",
    defaultSortOrder: "desc",
  },

  // ============================================================================
  // CRM MODULE
  // ============================================================================
  Customer: {
    apiPath: "crm/customer",
    module: "CRM",
    labelField: "customer_name",
    searchFields: ["customer_name", "customer_id"],
    defaultSortField: "creation",
    defaultSortOrder: "desc",
  },
  Lead: {
    apiPath: "crm/lead",
    module: "CRM",
    labelField: "lead_name",
    searchFields: ["lead_name", "company_name", "email_id"],
    defaultSortField: "creation",
    defaultSortOrder: "desc",
  },
  Opportunity: {
    apiPath: "crm/opportunity",
    module: "CRM",
    labelField: "title",
    searchFields: ["title", "customer_name"],
    defaultSortField: "creation",
    defaultSortOrder: "desc",
  },
  "Sales Order": {
    apiPath: "crm/sales-order",
    module: "CRM",
    labelField: "name",
    searchFields: ["name", "customer_name"],
    defaultSortField: "transaction_date",
    defaultSortOrder: "desc",
  },
  Quotation: {
    apiPath: "crm/quotation",
    module: "CRM",
    labelField: "name",
    searchFields: ["name", "party_name"],
    defaultSortField: "transaction_date",
    defaultSortOrder: "desc",
  },

  // ============================================================================
  // PURCHASING MODULE
  // ============================================================================
  Supplier: {
    apiPath: "purchasing/supplier",
    module: "Purchasing",
    labelField: "supplier_name",
    searchFields: ["supplier_name", "supplier_id"],
    defaultSortField: "creation",
    defaultSortOrder: "desc",
  },
  "Purchase Order": {
    apiPath: "purchasing/purchase-order",
    module: "Purchasing",
    labelField: "name",
    searchFields: ["name", "supplier_name"],
    defaultSortField: "transaction_date",
    defaultSortOrder: "desc",
  },

  // ============================================================================
  // ACCOUNTING MODULE
  // ============================================================================
  Company: {
    apiPath: "accounting/company",
    module: "Accounting",
    labelField: "company_name",
    searchFields: ["company_name"],
    isSettings: true,
  },
  Account: {
    apiPath: "accounting/account",
    module: "Accounting",
    labelField: "account_name",
    searchFields: ["account_name", "account_number"],
    isSettings: true,
  },
  "Payment Entry": {
    apiPath: "accounting/payment-entry",
    module: "Accounting",
    labelField: "name",
    searchFields: ["name", "party_name"],
    defaultSortField: "posting_date",
    defaultSortOrder: "desc",
  },

  // ============================================================================
  // MANUFACTURING MODULE
  // ============================================================================
  BOM: {
    apiPath: "manufacturing/bom",
    module: "Manufacturing",
    labelField: "name",
    searchFields: ["name", "item"],
    defaultSortField: "creation",
    defaultSortOrder: "desc",
  },
  "Work Order": {
    apiPath: "manufacturing/work-order",
    module: "Manufacturing",
    labelField: "name",
    searchFields: ["name", "production_item"],
    defaultSortField: "creation",
    defaultSortOrder: "desc",
  },

  // ============================================================================
  // ASSETS MODULE
  // ============================================================================
  Asset: {
    apiPath: "assets/asset",
    module: "Assets",
    labelField: "asset_name",
    searchFields: ["asset_name", "asset_id"],
    defaultSortField: "creation",
    defaultSortOrder: "desc",
  },
  "Asset Category": {
    apiPath: "assets/asset-category",
    module: "Assets",
    labelField: "asset_category_name",
    searchFields: ["asset_category_name"],
    isSettings: true,
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get API path for a DocType
 *
 * @example
 * getApiPath("Item") // => "stock/item"
 * getApiPath("Sales Order") // => "crm/sales-order"
 */
export function getApiPath(doctype: string): string {
  const config = DOCTYPE_CONFIG[doctype];
  if (config?.apiPath) {
    return config.apiPath;
  }
  // Fallback: convert to kebab-case
  return doctype.toLowerCase().replace(/\s+/g, "-");
}

/**
 * Get full configuration for a DocType
 */
export function getDocTypeConfig(doctype: string): DocTypeConfig | undefined {
  return DOCTYPE_CONFIG[doctype];
}

/**
 * Get the label field for a DocType (for dropdowns)
 */
export function getLabelField(doctype: string): string {
  return DOCTYPE_CONFIG[doctype]?.labelField || "name";
}

/**
 * Get search fields for a DocType
 */
export function getSearchFields(doctype: string): string[] {
  return DOCTYPE_CONFIG[doctype]?.searchFields || ["name"];
}

/**
 * Get all DocTypes for a module
 */
export function getDocTypesByModule(module: ModuleCategory): string[] {
  return Object.entries(DOCTYPE_CONFIG)
    .filter(([_, config]) => config.module === module)
    .map(([doctype]) => doctype);
}

/**
 * Check if a DocType is a settings/master data type
 */
export function isSettingsDocType(doctype: string): boolean {
  return DOCTYPE_CONFIG[doctype]?.isSettings || false;
}

/**
 * Get all registered DocTypes
 */
export function getAllDocTypes(): string[] {
  return Object.keys(DOCTYPE_CONFIG);
}
