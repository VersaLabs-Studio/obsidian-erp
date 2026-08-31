// lib/flows/flow-chain-resolver.ts
// Obsidian ERP v4.0 - Flow Chain Resolver
// Per Workflow Part 3 §4.2 — resolves the complete chain status for a document

import type { FlowChainResult, FlowStage, FlowStageStatus } from "@/types/flow-types";
import { getFlowForDocType, getFlowDefinition } from "./flow-definitions";
import { isModuleBuilt } from "./module-availability";

// Re-export for the 2N Part 1.1 `useFlowChain` hook.
export { getFlowForDocType, getFlowDefinition };

/**
 * Resolve the complete flow chain for a document
 *
 * Given a doctype and document name, this function:
 * 1. Finds the appropriate flow definition
 * 2. Queries the status of each stage in the chain
 * 3. Returns a FlowChainResult with resolved statuses
 *
 * @param doctype - The doctype of the current document
 * @param name - The document name
 * @param stageStatuses - Pre-resolved stage statuses (from API or cache)
 * @returns FlowChainResult with all stages resolved
 */
export function resolveFlowChain(
  doctype: string,
  name: string,
  stageStatuses?: Record<string, { status: FlowStageStatus; documentName?: string; documentUrl?: string }>,
  /**
   * 2U §3 FIX — explicit flow override. A doctype in multiple flows
   * (Payment Entry → sales + purchase) otherwise renders the FIRST match
   * (sales) regardless of the resolved data. When the caller knows the
   * flow (Pay-type PE → "purchase") it passes `flowId` and we render that
   * flow's stage list, which the server projected the resolved map onto.
   */
  flowId?: string
): FlowChainResult {
  const flow = flowId ? getFlowDefinition(flowId) : getFlowForDocType(doctype);

  if (!flow) {
    return {
      flowId: "unknown",
      stages: [
        {
          id: "current",
          label: doctype,
          doctype,
          status: "current",
          documentName: name,
        },
      ],
      currentIndex: 0,
      completedCount: 0,
      pendingCount: 0,
      isComplete: false,
    };
  }

  // Resolve each stage's status
  const stages: FlowStage[] = flow.stages.map((stage, index) => {
    const resolved = stageStatuses?.[stage.doctype];

    if (resolved) {
      return {
        ...stage,
        status: resolved.status,
        documentName: resolved.documentName,
        documentUrl: resolved.documentUrl,
      };
    }

    // If this is the current document's stage, mark as current
    if (stage.doctype === doctype) {
      return {
        ...stage,
        status: "current",
        documentName: name,
        documentUrl: `/${getDocTypeRoute(doctype)}/${name}`,
      };
    }

    // Default to pending
    return {
      ...stage,
      status: "pending" as FlowStageStatus,
    };
  });

  // Calculate metrics
  const currentIndex = stages.findIndex((s) => s.status === "current");
  const completedCount = stages.filter((s) => s.status === "completed").length;
  const pendingCount = stages.filter((s) => s.status === "pending").length;
  const isComplete = stages.every((s) => s.status === "completed");

  // Determine next action — the CREATE affordance belongs on the downstream
  // stage, gated by isModuleBuilt. Never self-referential.
  let nextAction: FlowChainResult["nextAction"];
  if (currentIndex >= 0 && currentIndex < stages.length - 1) {
    const currentStage = stages[currentIndex];
    const downstreamStage = stages[currentIndex + 1];
    const downstreamDoctype = downstreamStage?.doctype;

    if (
      currentStage.canCreateDownstream &&
      currentStage.createAction &&
      downstreamDoctype &&
      isModuleBuilt(downstreamDoctype)
    ) {
      nextAction = {
        label: `Create ${downstreamStage.label}`,
        stageId: currentStage.id,
        action: currentStage.createAction,
      };
    }
  }

  return {
    flowId: flow.id,
    stages,
    currentIndex,
    completedCount,
    pendingCount,
    isComplete,
    nextAction,
  };
}

/**
 * Get the route path for a doctype
 * Maps doctype names to their URL paths
 */
export function getDocTypeRoute(doctype: string): string {
  const routeMap: Record<string, string> = {
    Lead: "crm/lead",
    Opportunity: "crm/opportunity",
    Customer: "crm/customer",
    Quotation: "sales/quotation",
    "Sales Order": "sales/sales-order",
    "Work Order": "manufacturing/work-order",
    "Delivery Note": "stock/delivery-note",
    "Sales Invoice": "accounting/sales-invoice",
    "Payment Entry": "accounting/payment-entry",
    "Purchase Order": "buying/purchase-order",
    "Purchase Receipt": "stock/purchase-receipt",
    "Purchase Invoice": "accounting/purchase-invoice",
    "Material Request": "stock/material-request",
    "Request for Quotation": "buying/request-for-quotation",
    "Supplier Quotation": "buying/supplier-quotation",
    "Stock Entry": "stock/stock-entry",
    BOM: "manufacturing/bom",
    "Job Card": "manufacturing/job-card",
    "Stock Reconciliation": "stock/stock-reconciliation",
    "Stock Ledger Entry": "stock/stock-ledger",
  };

  return routeMap[doctype] || doctype.toLowerCase().replace(/\s+/g, "-");
}

/**
 * G2: Derive the auto-fill query-param name from a source doctype.
 * E.g. "Quotation" → "quotation", "Sales Order" → "sales_order"
 * This is the same param the WhatsNext "Create X" links already use.
 */
export function getAutoFillParam(sourceDoctype: string): string {
  return sourceDoctype.toLowerCase().replace(/\s+/g, "_");
}

/**
 * G2: Build the real create URL for a downstream doctype from a source document.
 * E.g. buildCreateUrl("Quotation", "QTN-001", "Sales Order")
 *   → "/sales/sales-order/new?quotation=QTN-001"
 */
export function buildCreateUrl(
  sourceDoctype: string,
  sourceName: string,
  targetDoctype: string,
): string {
  const route = getDocTypeRoute(targetDoctype);
  const param = getAutoFillParam(sourceDoctype);
  return `/${route}/new?${param}=${encodeURIComponent(sourceName)}`;
}

/**
 * Resolve stage statuses from Frappe document data
 *
 * Queries Frappe for each stage's document status and returns
 * a map of doctype → status info.
 *
 * This is a helper that the API routes or hooks can use.
 * In production, this would make actual Frappe API calls.
 *
 * @param _doctype - The current doctype
 * @param _name - The current document name
 * @returns Map of doctype → resolved status
 */
export async function resolveStageStatuses(
  _doctype: string,
  _name: string
): Promise<Record<string, { status: FlowStageStatus; documentName?: string; documentUrl?: string }>> {
  // In Phase 1, this returns a stub
  // In production, this would query Frappe for linked documents
  // Example: query Sales Order for the SO that references this Quotation
  return {};
}

/**
 * Get a human-readable description of the flow progress
 */
export function getFlowProgressDescription(result: FlowChainResult): string {
  if (result.isComplete) {
    return "Flow complete — all stages finished";
  }

  if (result.completedCount === 0) {
    return `Flow started — at ${result.stages[result.currentIndex]?.label || "initial stage"}`;
  }

  return `${result.completedCount} of ${result.stages.length} stages complete — at ${result.stages[result.currentIndex]?.label || "current stage"}`;
}
