// lib/flows/idempotency.ts
// Obsidian ERP v4.0 - Automation Idempotency Utilities
// Per DECISIONS.md B3 — prevents duplicate document creation on retry/double-click

/**
 * Build a deterministic idempotency key from source document and action
 *
 * Same inputs always produce the same key, ensuring idempotent behavior
 * across retries, double-clicks, and cron job restarts.
 *
 * @param sourceDoctype - The originating document type (e.g., "Sales Order")
 * @param sourceName - The document name (e.g., "SO-2026-001")
 * @param action - The action being performed (e.g., "create_work_orders")
 * @param targetDoctype - Optional target doctype for multi-target actions
 * @returns Deterministic idempotency key string
 *
 * @example
 * ```ts
 * buildIdempotencyKey("Sales Order", "SO-2026-001", "create_work_orders")
 * // => "Sales Order:SO-2026-001:create_work_orders"
 *
 * buildIdempotencyKey("Sales Order", "SO-2026-001", "create", "Delivery Note")
 * // => "Sales Order:SO-2026-001:create:Delivery Note"
 * ```
 */
export function buildIdempotencyKey(
  sourceDoctype: string,
  sourceName: string,
  action: string,
  targetDoctype?: string
): string {
  const parts = [sourceDoctype, sourceName, action];
  if (targetDoctype) parts.push(targetDoctype);
  return parts.join(":");
}

/**
 * Check if a downstream document already exists for the given source
 *
 * Queries the target doctype for submitted documents linked to the source.
 * Used as a guard before "Create downstream document" buttons.
 *
 * @param sourceDoctype - The source document type
 * @param sourceName - The source document name
 * @param targetDoctype - The target document type to check
 * @param linkField - The field on target that links to source (e.g., "sales_order")
 * @returns Object with canCreate flag and list of existing document names
 *
 * @example
 * ```ts
 * const result = await guardDuplicateCreation(
 *   "Sales Order", "SO-2026-001",
 *   "Work Order", "sales_order"
 * );
 * if (!result.canCreate) {
 *   toast.info(`Work Orders already exist: ${result.existingDocs.join(", ")}`);
 * }
 * ```
 */
export async function guardDuplicateCreation(
  sourceDoctype: string,
  sourceName: string,
  targetDoctype: string,
  linkField: string
): Promise<{ canCreate: boolean; existingDocs: string[] }> {
  // In Phase 1, this will query Frappe via scopedClient.db.getDocList
  // For now, return a stub that always allows creation
  // Implementation requires the scoped FrappeClient from Phase 1

  void sourceDoctype;
  void sourceName;
  void targetDoctype;
  void linkField;

  return {
    canCreate: true,
    existingDocs: [],
  };
}

/**
 * Cron job run record for idempotent scheduled tasks
 */
export interface CronRunRecord {
  /** Task identifier (e.g., "overdue-check", "auto-repeat-po") */
  taskId: string;
  /** UUID per run */
  runId: string;
  /** ISO timestamp when run started */
  startedAt: string;
  /** ISO timestamp when run completed (undefined if still running) */
  completedAt?: string;
  /** Run status */
  status: "running" | "completed" | "failed";
  /** Document names processed this run */
  affectedDocs: string[];
}

/**
 * Idempotency guard map for financial automations
 * Maps automation action to the target doctype and link field
 */
export const AUTOMATION_GUARDS: Record<
  string,
  { targetDoctype: string; linkField: string }
> = {
  "Sales Order:create_work_orders": {
    targetDoctype: "Work Order",
    linkField: "sales_order",
  },
  "Sales Order:create_delivery_note": {
    targetDoctype: "Delivery Note",
    linkField: "against_sales_order",
  },
  "Delivery Note:create_sales_invoice": {
    targetDoctype: "Sales Invoice",
    linkField: "delivery_note",
  },
  "Sales Invoice:create_payment_entry": {
    targetDoctype: "Payment Entry",
    linkField: "reference_name",
  },
} as const;

/**
 * Get the idempotency guard configuration for a given automation action
 *
 * @param sourceDoctype - Source document type
 * @param action - The automation action
 * @returns Guard config or undefined if no guard exists
 */
export function getAutomationGuard(
  sourceDoctype: string,
  action: string
): { targetDoctype: string; linkField: string } | undefined {
  return AUTOMATION_GUARDS[`${sourceDoctype}:${action}`];
}
