// lib/doctype-config.ts
// Obsidian ERP v4.0 - Centralized DocType Configuration
// Single source of truth for all DocType metadata

/**
 * DocType module categories
 */
export type ModuleCategory =
  | "Stock"
  | "Manufacturing"
  | "Accounting"
  | "CRM"
  | "Sales"
  | "Buying"
  | "Assets"
  | "HR"
  | "Settings";

/**
 * V4 Flow/AI/UX metadata for a DocType
 * Extends DocTypeConfig with flow engine, AI, and UX metadata
 * Per Architecture V4 Part 1 §6.4
 */
export interface DocTypeConfigV4 extends DocTypeConfig {
  /** Flow engine metadata */
  flow?: {
    /** Whether this doctype participates in a flow chain */
    hasFlow: boolean;
    /** Upstream doctype (e.g., Quotation → Sales Order) */
    upstreamDoctype?: string;
    /** Downstream doctypes (e.g., Sales Order → [Work Order, Delivery Note]) */
    downstreamDoctypes?: string[];
    /** Status machine key (references STATUS_MACHINES) */
    statusMachineKey?: string;
    /** Flow stage label (e.g., "Sales Order", "Invoice") */
    flowLabel?: string;
    /** Whether this is a terminal stage in the flow */
    isTerminal?: boolean;
  };
  /** AI integration metadata */
  ai?: {
    /** Whether AI can create documents of this type */
    canCreate: boolean;
    /** Whether AI can update documents of this type */
    canUpdate: boolean;
    /** Whether AI can read documents of this type */
    canRead: boolean;
    /** Custom AI tool description */
    toolDescription?: string;
    /** Fields AI should never touch */
    protectedFields?: string[];
  };
  /** UX metadata */
  ux?: {
    /** Number of wizard steps for creation */
    wizardSteps?: number;
    /** Whether to show the flow tracker on detail page */
    showFlowTracker?: boolean;
    /** Whether to show "What's Next" suggestions */
    showWhatsNext?: boolean;
    /** Whether to show activity timeline */
    showActivityTimeline?: boolean;
    /** KPI fields for dashboard cards */
    kpiFields?: string[];
    /** Default view: 'list' | 'kanban' | 'calendar' */
    defaultView?: "list" | "kanban" | "calendar";
  };
}

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
    apiPath: "stock/warehouse",
    module: "Stock",
    labelField: "warehouse_name",
    searchFields: ["warehouse_name"],
    defaultSortField: "creation",
    defaultSortOrder: "desc",
  },
  "Material Request": {
    apiPath: "stock/material-request",
    module: "Stock",
    labelField: "name",
    searchFields: ["name", "material_request_type", "status"],
    defaultSortField: "creation",
    defaultSortOrder: "desc",
  },
  "Material Request Item": {
    apiPath: "stock/material-request-item",
    module: "Stock",
    labelField: "item_code",
    isSettings: true,
  },
  "Stock Entry": {
    apiPath: "stock/stock-entry",
    module: "Stock",
    labelField: "name",
    searchFields: ["name", "purpose", "work_order"],
    defaultSortField: "creation",
    defaultSortOrder: "desc",
  },
  "Stock Entry Detail": {
    apiPath: "stock/stock-entry-detail",
    module: "Stock",
    labelField: "item_code",
    isSettings: true,
  },
  "Delivery Note": {
    apiPath: "stock/delivery-note",
    module: "Stock",
    labelField: "name",
    searchFields: ["name", "customer", "customer_name", "status"],
    defaultSortField: "posting_date",
    defaultSortOrder: "desc",
  },
  "Delivery Note Item": {
    apiPath: "stock/delivery-note-item",
    module: "Stock",
    labelField: "item_code",
    isSettings: true,
  },
  Driver: {
    apiPath: "stock/setup/driver",
    module: "Stock",
    labelField: "full_name",
    searchFields: ["full_name", "cell_number", "license_number"],
    isSettings: true,
  },
  Vehicle: {
    apiPath: "stock/setup/vehicle",
    module: "Stock",
    labelField: "license_plate",
    searchFields: ["license_plate", "make", "model"],
    isSettings: true,
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
  "Lead Source": {
    apiPath: "crm/lead-source",
    module: "CRM",
    labelField: "source_name",
    searchFields: ["source_name"],
    isSettings: true,
  },
  Territory: {
    apiPath: "crm/territory",
    module: "CRM",
    labelField: "territory_name",
    searchFields: ["territory_name"],
    isSettings: true,
  },
  "Industry Type": {
    apiPath: "crm/industry-type",
    module: "CRM",
    labelField: "industry",
    searchFields: ["industry"],
    isSettings: true,
  },

  // NEW: Address Configuration
  Address: {
    apiPath: "crm/address",
    module: "CRM",
    labelField: "address_title",
    searchFields: ["address_title", "address_line1", "city"],
    isSettings: false,
  },

  // NEW: Contact Configuration
  Contact: {
    apiPath: "crm/contact",
    module: "CRM",
    labelField: "full_name",
    searchFields: ["full_name", "email_id", "mobile_no"],
    isSettings: false,
  },

  // CRM Settings/Options DocTypes
  "Customer Group": {
    apiPath: "crm/customer-group",
    module: "CRM",
    labelField: "customer_group_name",
    searchFields: ["customer_group_name"],
    isSettings: true,
  },
  Country: {
    apiPath: "crm/country",
    module: "CRM",
    labelField: "country_name",
    searchFields: ["country_name", "code"],
    isSettings: true,
  },
  Salutation: {
    apiPath: "crm/salutation",
    module: "CRM",
    labelField: "salutation",
    searchFields: ["salutation"],
    isSettings: true,
  },
  Gender: {
    apiPath: "crm/gender",
    module: "CRM",
    labelField: "gender",
    searchFields: ["gender"],
    isSettings: true,
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
    apiPath: "sales/sales-order",
    module: "Sales",
    labelField: "name",
    searchFields: ["name", "customer_name"],
    defaultSortField: "transaction_date",
    defaultSortOrder: "desc",
  },
  Project: {
    apiPath: "sales/settings/project",
    module: "Sales",
    labelField: "project_name",
    searchFields: ["project_name", "name"],
    isSettings: false,
  },
  Quotation: {
    apiPath: "sales/quotation",
    module: "Sales",
    labelField: "name",
    searchFields: ["name", "party_name", "customer_name"],
    defaultSortField: "transaction_date",
    defaultSortOrder: "desc",
  },
  "Sales Taxes and Charges Template": {
    apiPath: "sales/taxes-template",
    module: "Sales",
    labelField: "title",
    searchFields: ["title"],
    isSettings: true,
  },
  "Terms and Conditions": {
    apiPath: "sales/terms",
    module: "Sales",
    labelField: "title",
    searchFields: ["title"],
    isSettings: true,
  },
  "Sales Person": {
    apiPath: "sales/settings/sales-person",
    module: "Sales",
    labelField: "sales_person_name",
    searchFields: ["sales_person_name"],
    isSettings: true,
  },
  "Sales Partner": {
    apiPath: "sales/settings/sales-partner",
    module: "Sales",
    labelField: "partner_name",
    searchFields: ["partner_name", "partner_type"],
    isSettings: true,
  },
  "Sales Partner Type": {
    apiPath: "sales/settings/sales-partner-type",
    module: "Sales",
    labelField: "name",
    searchFields: ["name"],
    isSettings: true,
  },

  // ============================================================================
  // BUYING MODULE
  // ============================================================================
  Supplier: {
    apiPath: "buying/supplier",
    module: "Buying",
    labelField: "supplier_name",
    searchFields: ["name", "supplier_name", "supplier_group"],
    defaultSortField: "supplier_name",
  },
  "Purchase Order": {
    apiPath: "buying/purchase-order",
    module: "Buying",
    labelField: "name",
    searchFields: ["name", "supplier", "supplier_name"],
    defaultSortField: "creation",
    defaultSortOrder: "desc",
  },
  "Purchase Order Item": {
    apiPath: "buying/purchase-order-item",
    module: "Buying",
    labelField: "item_code",
    isSettings: true,
  },

  // ============================================================================
  // ACCOUNTING MODULE
  // ============================================================================
  "Sales Invoice": {
    apiPath: "accounting/sales-invoice",
    module: "Accounting",
    labelField: "name",
    searchFields: ["name", "customer", "customer_name", "status"],
    defaultSortField: "posting_date",
    defaultSortOrder: "desc",
  },
  "Sales Invoice Item": {
    apiPath: "accounting/sales-invoice-item",
    module: "Accounting",
    labelField: "item_code",
    isSettings: true,
  },
  "Purchase Invoice": {
    apiPath: "accounting/purchase-invoice",
    module: "Accounting",
    labelField: "name",
    searchFields: ["name", "supplier", "supplier_name", "status", "bill_no"],
    defaultSortField: "posting_date",
    defaultSortOrder: "desc",
  },
  "Purchase Invoice Item": {
    apiPath: "accounting/purchase-invoice-item",
    module: "Accounting",
    labelField: "item_code",
    isSettings: true,
  },
  "Payment Entry": {
    apiPath: "accounting/payment-entry",
    module: "Accounting",
    labelField: "name",
    searchFields: ["name", "party", "party_name", "mode_of_payment"],
    defaultSortField: "posting_date",
    defaultSortOrder: "desc",
  },
  "Payment Entry Reference": {
    apiPath: "accounting/payment-entry-reference",
    module: "Accounting",
    isSettings: true,
  },
  "Journal Entry": {
    apiPath: "accounting/journal-entry",
    module: "Accounting",
    labelField: "name",
    searchFields: ["name", "voucher_type", "cheque_no"],
    defaultSortField: "posting_date",
    defaultSortOrder: "desc",
  },
  "Journal Entry Account": {
    apiPath: "accounting/journal-entry-account",
    module: "Accounting",
    isSettings: true,
  },
  Company: {
    apiPath: "accounting/settings/company",
    module: "Accounting",
    labelField: "company_name",
    searchFields: ["company_name"],
    isSettings: true,
  },
  Account: {
    apiPath: "accounting/setup/account",
    module: "Accounting",
    labelField: "account_name",
    searchFields: ["account_name", "account_number", "account_type"],
    isSettings: true,
  },
  "Cost Center": {
    apiPath: "accounting/setup/cost-center",
    module: "Accounting",
    labelField: "cost_center_name",
    searchFields: ["cost_center_name"],
    isSettings: true,
  },
  "Mode of Payment": {
    apiPath: "accounting/setup/mode-of-payment",
    module: "Accounting",
    labelField: "mode_of_payment",
    searchFields: ["mode_of_payment"],
    isSettings: true,
  },
  "Payment Terms Template": {
    apiPath: "accounting/setup/payment-terms-template",
    module: "Accounting",
    labelField: "template_name",
    searchFields: ["template_name"],
    isSettings: true,
  },
  "Fiscal Year": {
    apiPath: "accounting/setup/fiscal-year",
    module: "Accounting",
    labelField: "year",
    searchFields: ["year"],
    isSettings: true,
  },
  Currency: {
    apiPath: "accounting/currency",
    module: "Accounting",
    labelField: "currency_name",
    searchFields: ["currency_name", "name"],
    isSettings: true,
  },
  "Price List": {
    apiPath: "accounting/settings/price-list",
    module: "Accounting",
    labelField: "price_list_name",
    searchFields: ["price_list_name", "name"],
    isSettings: true,
  },

  // ============================================================================
  // MANUFACTURING MODULE
  // ============================================================================
  BOM: {
    apiPath: "manufacturing/bom",
    module: "Manufacturing",
    labelField: "name",
    searchFields: ["name", "item", "item_name"],
    defaultSortField: "creation",
    defaultSortOrder: "desc",
  },
  "BOM Item": {
    apiPath: "manufacturing/bom-item",
    module: "Manufacturing",
    labelField: "item_code",
    isSettings: true,
  },
  "BOM Operation": {
    apiPath: "manufacturing/bom-operation",
    module: "Manufacturing",
    labelField: "operation",
    isSettings: true,
  },
  "BOM Scrap Item": {
    apiPath: "manufacturing/bom-scrap-item",
    module: "Manufacturing",
    labelField: "item_code",
    isSettings: true,
  },
  "Work Order": {
    apiPath: "manufacturing/work-order",
    module: "Manufacturing",
    labelField: "name",
    searchFields: ["name", "production_item", "item_name", "sales_order"],
    defaultSortField: "creation",
    defaultSortOrder: "desc",
  },
  "Work Order Item": {
    apiPath: "manufacturing/work-order-item",
    module: "Manufacturing",
    labelField: "item_code",
    isSettings: true,
  },
  "Work Order Operation": {
    apiPath: "manufacturing/work-order-operation",
    module: "Manufacturing",
    labelField: "operation",
    isSettings: true,
  },
  Workstation: {
    apiPath: "manufacturing/workstation",
    module: "Manufacturing",
    labelField: "workstation_name",
    searchFields: ["workstation_name"],
    defaultSortField: "creation",
    defaultSortOrder: "desc",
  },
  Operation: {
    apiPath: "manufacturing/operation",
    module: "Manufacturing",
    labelField: "name",
    searchFields: ["name", "workstation"],
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

  // ============================================================================
  // HR MODULE
  // ============================================================================
  Employee: {
    apiPath: "hr/employee",
    module: "HR",
    labelField: "employee_name",
    searchFields: ["employee_name", "employee", "user_id"],
    defaultSortField: "creation",
    defaultSortOrder: "desc",
  },
  Department: {
    apiPath: "hr/settings/department",
    module: "HR",
    labelField: "department_name",
    searchFields: ["department_name"],
    isSettings: true,
  },
  Designation: {
    apiPath: "hr/settings/designation",
    module: "HR",
    labelField: "designation_name",
    searchFields: ["designation_name"],
    isSettings: true,
  },
};

/**
 * V4 DocType Configuration with Flow/AI/UX metadata
 * Extends DOCTYPE_CONFIG with v4-specific metadata for the Lead→Payment chain
 *
 * This registry drives:
 * - Flow Tracker (which stages exist, what's upstream/downstream)
 * - AI Tool generation (what AI can do with each doctype)
 * - Wizard steps (how many steps for creation)
 * - Dashboard KPIs (what metrics to show)
 */
export const DOCTYPE_CONFIG_V4: Record<string, DocTypeConfigV4> = {
  // ============================================================================
  // LEAD → OPPORTUNITY → QUOTATION → SALES ORDER → DELIVERY → INVOICE → PAYMENT
  // ============================================================================
  Lead: {
    ...DOCTYPE_CONFIG.Lead,
    flow: {
      hasFlow: true,
      downstreamDoctypes: ["Opportunity"],
      statusMachineKey: "Lead",
      flowLabel: "Lead",
    },
    ai: {
      canCreate: true,
      canUpdate: true,
      canRead: true,
      toolDescription: "Create or update sales leads from potential customers",
    },
    ux: {
      wizardSteps: 2,
      showFlowTracker: true,
      showWhatsNext: true,
      showActivityTimeline: true,
      defaultView: "list",
    },
  },
  Opportunity: {
    ...DOCTYPE_CONFIG.Opportunity,
    flow: {
      hasFlow: true,
      upstreamDoctype: "Lead",
      downstreamDoctypes: ["Quotation"],
      statusMachineKey: "Opportunity",
      flowLabel: "Opportunity",
    },
    ai: {
      canCreate: true,
      canUpdate: true,
      canRead: true,
      toolDescription: "Create sales opportunities from qualified leads",
    },
    ux: {
      wizardSteps: 2,
      showFlowTracker: true,
      showWhatsNext: true,
      showActivityTimeline: true,
      defaultView: "kanban",
    },
  },
  Quotation: {
    ...DOCTYPE_CONFIG.Quotation,
    flow: {
      hasFlow: true,
      upstreamDoctype: "Opportunity",
      downstreamDoctypes: ["Sales Order"],
      statusMachineKey: "Quotation",
      flowLabel: "Quotation",
    },
    ai: {
      canCreate: true,
      canUpdate: true,
      canRead: true,
      toolDescription: "Create quotations for customers with items and pricing",
    },
    ux: {
      wizardSteps: 3,
      showFlowTracker: true,
      showWhatsNext: true,
      showActivityTimeline: true,
      defaultView: "list",
    },
  },
  "Sales Order": {
    ...DOCTYPE_CONFIG["Sales Order"],
    flow: {
      hasFlow: true,
      upstreamDoctype: "Quotation",
      downstreamDoctypes: ["Work Order", "Delivery Note"],
      statusMachineKey: "Sales Order",
      flowLabel: "Sales Order",
    },
    ai: {
      canCreate: true,
      canUpdate: true,
      canRead: true,
      toolDescription: "Create sales orders from quotations or directly",
    },
    ux: {
      wizardSteps: 3,
      showFlowTracker: true,
      showWhatsNext: true,
      showActivityTimeline: true,
      kpiFields: ["grand_total", "per_delivered", "per_billed"],
      defaultView: "list",
    },
  },
  "Work Order": {
    ...DOCTYPE_CONFIG["Work Order"],
    flow: {
      hasFlow: true,
      upstreamDoctype: "Sales Order",
      downstreamDoctypes: ["Stock Entry"],
      statusMachineKey: "Work Order",
      flowLabel: "Work Order",
    },
    ai: {
      canCreate: true,
      canUpdate: false,
      canRead: true,
      toolDescription: "Create manufacturing work orders from sales orders",
    },
    ux: {
      wizardSteps: 2,
      showFlowTracker: true,
      showWhatsNext: true,
      showActivityTimeline: true,
      defaultView: "list",
    },
  },
  "Delivery Note": {
    ...DOCTYPE_CONFIG["Delivery Note"],
    flow: {
      hasFlow: true,
      upstreamDoctype: "Sales Order",
      downstreamDoctypes: ["Sales Invoice"],
      statusMachineKey: "Delivery Note",
      flowLabel: "Delivery",
    },
    ai: {
      canCreate: true,
      canUpdate: false,
      canRead: true,
      toolDescription: "Create delivery notes to ship goods to customers",
    },
    ux: {
      wizardSteps: 3,
      showFlowTracker: true,
      showWhatsNext: true,
      showActivityTimeline: true,
      defaultView: "list",
    },
  },
  "Sales Invoice": {
    ...DOCTYPE_CONFIG["Sales Invoice"],
    flow: {
      hasFlow: true,
      upstreamDoctype: "Delivery Note",
      downstreamDoctypes: ["Payment Entry"],
      statusMachineKey: "Sales Invoice",
      flowLabel: "Invoice",
    },
    ai: {
      canCreate: true,
      canUpdate: false,
      canRead: true,
      toolDescription: "Create sales invoices for delivered goods",
    },
    ux: {
      wizardSteps: 3,
      showFlowTracker: true,
      showWhatsNext: true,
      showActivityTimeline: true,
      kpiFields: ["grand_total", "outstanding_amount"],
      defaultView: "list",
    },
  },
  "Payment Entry": {
    ...DOCTYPE_CONFIG["Payment Entry"],
    flow: {
      hasFlow: true,
      upstreamDoctype: "Sales Invoice",
      statusMachineKey: "Payment Entry",
      flowLabel: "Payment",
      isTerminal: true,
    },
    ai: {
      canCreate: true,
      canUpdate: false,
      canRead: true,
      toolDescription: "Record payments received against invoices",
    },
    ux: {
      wizardSteps: 3,
      showFlowTracker: true,
      showWhatsNext: false,
      showActivityTimeline: true,
      kpiFields: ["paid_amount", "received_amount"],
      defaultView: "list",
    },
  },

  // ============================================================================
  // BUYING CHAIN
  // ============================================================================
  "Purchase Order": {
    ...DOCTYPE_CONFIG["Purchase Order"],
    flow: {
      hasFlow: true,
      downstreamDoctypes: ["Purchase Receipt", "Purchase Invoice"],
      statusMachineKey: "Purchase Order",
      flowLabel: "Purchase Order",
    },
    ai: {
      canCreate: true,
      canUpdate: true,
      canRead: true,
      toolDescription: "Create purchase orders for suppliers",
    },
    ux: {
      wizardSteps: 3,
      showFlowTracker: true,
      showWhatsNext: true,
      showActivityTimeline: true,
      defaultView: "list",
    },
  },
  "Purchase Invoice": {
    ...DOCTYPE_CONFIG["Purchase Invoice"],
    flow: {
      hasFlow: true,
      upstreamDoctype: "Purchase Order",
      downstreamDoctypes: ["Payment Entry"],
      statusMachineKey: "Purchase Invoice",
      flowLabel: "Purchase Invoice",
    },
    ai: {
      canCreate: true,
      canUpdate: false,
      canRead: true,
      toolDescription: "Create purchase invoices from suppliers",
    },
    ux: {
      wizardSteps: 3,
      showFlowTracker: true,
      showWhatsNext: true,
      showActivityTimeline: true,
      defaultView: "list",
    },
  },

  // ============================================================================
  // MANUFACTURING CHAIN
  // ============================================================================
  BOM: {
    ...DOCTYPE_CONFIG.BOM,
    flow: {
      hasFlow: false,
    },
    ai: {
      canCreate: true,
      canUpdate: true,
      canRead: true,
      toolDescription: "Create and manage Bills of Materials",
    },
    ux: {
      wizardSteps: 3,
      showFlowTracker: false,
      defaultView: "list",
    },
  },

  // ============================================================================
  // STOCK
  // ============================================================================
  "Stock Entry": {
    ...DOCTYPE_CONFIG["Stock Entry"],
    flow: {
      hasFlow: true,
      upstreamDoctype: "Work Order",
      statusMachineKey: "Stock Entry",
      flowLabel: "Stock Entry",
    },
    ai: {
      canCreate: true,
      canUpdate: false,
      canRead: true,
      toolDescription: "Create stock entries for material movement",
    },
    ux: {
      wizardSteps: 2,
      showFlowTracker: true,
      showWhatsNext: true,
      showActivityTimeline: true,
      defaultView: "list",
    },
  },
  "Material Request": {
    ...DOCTYPE_CONFIG["Material Request"],
    flow: {
      hasFlow: true,
      downstreamDoctypes: ["Purchase Order"],
      statusMachineKey: "Material Request",
      flowLabel: "Material Request",
    },
    ai: {
      canCreate: true,
      canUpdate: true,
      canRead: true,
      toolDescription: "Create material requests for procurement",
    },
    ux: {
      wizardSteps: 2,
      showFlowTracker: true,
      showWhatsNext: true,
      showActivityTimeline: true,
      defaultView: "list",
    },
  },
};

/**
 * Get V4 config for a DocType
 * Falls back to base config if no V4 config exists
 */
export function getDocTypeConfigV4(doctype: string): DocTypeConfigV4 | undefined {
  return DOCTYPE_CONFIG_V4[doctype];
}

/**
 * Get all DocTypes that participate in a flow chain
 */
export function getFlowDocTypes(): string[] {
  return Object.entries(DOCTYPE_CONFIG_V4)
    .filter(([_, config]) => config.flow?.hasFlow)
    .map(([doctype]) => doctype);
}

/**
 * Get downstream doctypes for a given doctype
 */
export function getDownstreamDocTypes(doctype: string): string[] {
  return DOCTYPE_CONFIG_V4[doctype]?.flow?.downstreamDoctypes || [];
}

/**
 * Get upstream doctype for a given doctype
 */
export function getUpstreamDocType(doctype: string): string | undefined {
  return DOCTYPE_CONFIG_V4[doctype]?.flow?.upstreamDoctype;
}

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
