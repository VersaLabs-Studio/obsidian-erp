// lib/flows/module-availability.ts
// Single source of truth for "is this doctype's UI built?"
// Every header action, WhatsNext action, and FlowTracker create affordance
// checks isModuleBuilt(target) → enabled link vs disabled+tooltip.
// As each phase lands, add the doctype to the set.

export const BUILT_MODULES = new Set<string>([
  // Phase 0/1 — Sales Order golden template
  "Sales Order",
  "Quotation",
  // Phase 2a — Sales/Stock fulfillment
  "Delivery Note",
  "Stock Entry",
  // 4.1-C3 — Material Request DEACTIVATED system-wide per product decision:
  // procurement starts directly from the Purchase Order. Kept out of
  // BUILT_MODULES so every create-affordance / WhatsNext action gating on it
  // fails closed with a "module not available" tooltip. The MR pages remain
  // reachable by URL for admin/audit (Stock Entries precedent).
  // "Material Request",
  // Phase 2b — Accounting suite
  "Sales Invoice",
  "Payment Entry",
  "Purchase Invoice",
  "Journal Entry",
  // Phase 3 — Buying module
  "Request for Quotation",
  "Supplier Quotation",
  "Purchase Order",
  // Phase 4 — Manufacturing module
  "BOM",
  "Work Order",
  // Phase 2V — Job Card UI
  "Job Card",
  // Phase 2f — CRM head
  "Lead",
  "Opportunity",
  // Phase 2g — CRM pivot (Lead → Customer)
  "Customer",
  // Phase 2h — Purchase Receipt (procure-to-pay close)
  "Purchase Receipt",
  // Phase 2i — Stock Visibility
  "Stock Reconciliation",
]);

export function isModuleBuilt(doctype: string): boolean {
  return BUILT_MODULES.has(doctype);
}
