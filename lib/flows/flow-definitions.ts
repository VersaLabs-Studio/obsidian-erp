// lib/flows/flow-definitions.ts
// Obsidian ERP v4.0 - Flow Definitions
// Per Architecture V4 Part 2 §2.3 and Workflow Part 3 §4.1

import type { FlowDefinition } from "@/types/flow-types";

/**
 * Lead-to-Cash flow — the complete business chain
 * From Architecture V4 Workflow Part 3 §4.1
 */
export const LEAD_TO_CASH_FLOW: FlowDefinition = {
  id: "lead-to-cash",
  name: "Lead to Cash",
  description: "Complete sales cycle from lead to payment collection",
  sourceDoctype: "Lead",
  targetDoctype: "Payment Entry",
  stages: [
    {
      id: "lead",
      label: "Lead",
      doctype: "Lead",
      status: "pending",
      icon: "UserPlus",
      canCreateDownstream: true,
      createAction: "convert_to_customer",
    },
    {
      id: "customer",
      label: "Customer",
      doctype: "Customer",
      status: "pending",
      icon: "User",
      canCreateDownstream: false,
    },
    {
      id: "quotation",
      label: "Quotation",
      doctype: "Quotation",
      status: "pending",
      icon: "FileText",
      canCreateDownstream: true,
      createAction: "create_sales_order",
    },
    {
      id: "sales-order",
      label: "Sales Order",
      doctype: "Sales Order",
      status: "pending",
      icon: "ShoppingCart",
      canCreateDownstream: true,
      createAction: "create_work_orders",
    },
    {
      id: "work-order",
      label: "Work Order",
      doctype: "Work Order",
      status: "pending",
      icon: "Factory",
      isOptional: true,
    },
    {
      id: "delivery",
      label: "Delivery",
      doctype: "Delivery Note",
      status: "pending",
      icon: "Truck",
      canCreateDownstream: true,
      createAction: "create_sales_invoice",
    },
    {
      id: "invoice",
      label: "Invoice",
      doctype: "Sales Invoice",
      status: "pending",
      icon: "Receipt",
      canCreateDownstream: true,
      createAction: "create_payment_entry",
    },
    {
      id: "payment",
      label: "Payment",
      doctype: "Payment Entry",
      status: "pending",
      icon: "CreditCard",
    },
  ],
};

/**
 * Sales Order flow — from quotation to fulfillment
 * Per Architecture V4 Part 2 §2.3
 */
export const SALES_ORDER_FLOW: FlowDefinition = {
  id: "sales-order",
  name: "Sales Order Fulfillment",
  description: "Process a sales order from creation to delivery and billing",
  sourceDoctype: "Quotation",
  targetDoctype: "Payment Entry",
  stages: [
    {
      id: "quotation",
      label: "Quotation",
      doctype: "Quotation",
      status: "pending",
      icon: "FileText",
    },
    {
      id: "sales-order",
      label: "Sales Order",
      doctype: "Sales Order",
      status: "pending",
      icon: "ShoppingCart",
      canCreateDownstream: true,
      createAction: "create_work_orders",
    },
    {
      id: "work-order",
      label: "Work Order",
      doctype: "Work Order",
      status: "pending",
      icon: "Factory",
      canCreateDownstream: true,
      createAction: "create_stock_entry",
    },
    {
      id: "delivery",
      label: "Delivery Note",
      doctype: "Delivery Note",
      status: "pending",
      icon: "Truck",
      canCreateDownstream: true,
      createAction: "create_sales_invoice",
    },
    {
      id: "invoice",
      label: "Sales Invoice",
      doctype: "Sales Invoice",
      status: "pending",
      icon: "Receipt",
      canCreateDownstream: true,
      createAction: "create_payment_entry",
    },
    {
      id: "payment",
      label: "Payment",
      doctype: "Payment Entry",
      status: "pending",
      icon: "CreditCard",
    },
  ],
};

/**
 * Purchase flow — from material request to payment
 * 2S Part 0.5 — RFQ and SQ stages removed from the rail (Kidus's request).
 * The edges remain in flow-link-map.ts for CrossFlow adjacency; they just
 * don't appear on the procure-to-pay rail. Rail renders:
 * MR → PO → PR → PI → PE only.
 */
export const PURCHASE_FLOW: FlowDefinition = {
  id: "purchase",
  name: "Procurement",
  description: "Complete procurement cycle from request to payment",
  sourceDoctype: "Material Request",
  targetDoctype: "Payment Entry",
  stages: [
    {
      id: "material-request",
      label: "Material Request",
      doctype: "Material Request",
      status: "pending",
      icon: "ClipboardList",
    },
    // 2S Part 0.5 — RFQ and SQ temporarily removed from the rail.
    // They remain reachable via CrossFlow navigation.
    {
      id: "purchase-order",
      label: "Purchase Order",
      doctype: "Purchase Order",
      status: "pending",
      icon: "ShoppingCart",
      canCreateDownstream: true,
      createAction: "create_purchase_receipt",
    },
    {
      id: "purchase-receipt",
      label: "Purchase Receipt",
      doctype: "Purchase Receipt",
      status: "pending",
      icon: "PackageCheck",
      canCreateDownstream: true,
      createAction: "create_purchase_invoice",
    },
    {
      id: "purchase-invoice",
      label: "Purchase Invoice",
      doctype: "Purchase Invoice",
      status: "pending",
      icon: "Receipt",
      canCreateDownstream: true,
      createAction: "create_payment_entry",
    },
    {
      id: "payment",
      label: "Payment",
      doctype: "Payment Entry",
      status: "pending",
      icon: "CreditCard",
    },
  ],
};

/**
 * Manufacturing flow — from Sales Order through production to Stock Entry
 * Phase 2V — concise manufacturing-scoped flow for the WO detail page.
 * Stages: Sales Order → Work Order → Job Card (optional) → Stock Entry (FG).
 * Job Card is optional (routing-dependent, per ADR-1).
 */
export const MANUFACTURING_FLOW: FlowDefinition = {
  id: "manufacturing",
  name: "Manufacturing",
  description: "Production flow from Sales Order to finished goods",
  sourceDoctype: "Sales Order",
  targetDoctype: "Stock Entry",
  stages: [
    {
      id: "sales-order",
      label: "Sales Order",
      doctype: "Sales Order",
      status: "pending",
      icon: "ShoppingCart",
    },
    {
      id: "work-order",
      label: "Work Order",
      doctype: "Work Order",
      status: "pending",
      icon: "Factory",
      canCreateDownstream: true,
      createAction: "create_job_cards",
    },
    {
      id: "job-card",
      label: "Job Card",
      doctype: "Job Card",
      status: "pending",
      icon: "ClipboardList",
      isOptional: true,
    },
    {
      id: "stock-entry",
      label: "Stock Entry (FG)",
      doctype: "Stock Entry",
      status: "pending",
      icon: "PackageCheck",
    },
  ],
};

/**
 * All flow definitions indexed by ID
 */
export const FLOW_DEFINITIONS: Record<string, FlowDefinition> = {
  "lead-to-cash": LEAD_TO_CASH_FLOW,
  "sales-order": SALES_ORDER_FLOW,
  "purchase": PURCHASE_FLOW,
  "manufacturing": MANUFACTURING_FLOW,
};

/**
 * Get a flow definition by ID
 */
export function getFlowDefinition(flowId: string): FlowDefinition | undefined {
  return FLOW_DEFINITIONS[flowId];
}

/**
 * Get the appropriate flow for a doctype
 * Returns the first flow where the doctype appears as a stage
 */
export function getFlowForDocType(doctype: string): FlowDefinition | undefined {
  return Object.values(FLOW_DEFINITIONS).find((flow) =>
    flow.stages.some((stage) => stage.doctype === doctype)
  );
}

/**
 * Get all flows a doctype participates in
 */
export function getFlowsForDocType(doctype: string): FlowDefinition[] {
  return Object.values(FLOW_DEFINITIONS).filter((flow) =>
    flow.stages.some((stage) => stage.doctype === doctype)
  );
}
