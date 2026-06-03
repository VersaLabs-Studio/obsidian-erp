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
    },
    {
      id: "opportunity",
      label: "Opportunity",
      doctype: "Opportunity",
      status: "pending",
      icon: "Target",
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
 * All flow definitions indexed by ID
 */
export const FLOW_DEFINITIONS: Record<string, FlowDefinition> = {
  "lead-to-cash": LEAD_TO_CASH_FLOW,
  "sales-order": SALES_ORDER_FLOW,
  "purchase": PURCHASE_FLOW,
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
