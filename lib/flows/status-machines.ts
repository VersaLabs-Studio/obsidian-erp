// lib/flows/status-machines.ts
// Obsidian ERP v4.0 - Status Machines
// Per Workflow Part 3 §2 — defines legal status transitions for each doctype

import type { StatusMachine } from "@/types/flow-types";

/**
 * Sales Order status machine
 * Per Workflow Part 3 §2.1
 */
export const SALES_ORDER_MACHINE: StatusMachine = {
  doctype: "Sales Order",
  defaultStatus: "Draft",
  statuses: [
    "Draft",
    "To Deliver and Bill",
    "To Bill",
    "To Deliver",
    "Completed",
    "Cancelled",
    "Closed",
  ],
  usesDocStatus: true,
  transitions: [
    {
      from: "Draft",
      to: "To Deliver and Bill",
      action: "submit",
      sideEffects: [
        "Updates stock reservation",
        "Triggers production planning if manufacturing",
      ],
    },
    {
      from: "To Deliver and Bill",
      to: "To Bill",
      action: "deliver",
      sideEffects: [
        "Creates Delivery Note",
        "Updates per_delivered",
        "Stock moved from warehouse",
      ],
    },
    {
      from: "To Deliver and Bill",
      to: "To Deliver",
      action: "invoice",
      sideEffects: [
        "Creates Sales Invoice",
        "Updates per_billed",
      ],
    },
    {
      from: "To Bill",
      to: "Completed",
      action: "invoice",
      sideEffects: [
        "Creates Sales Invoice",
        "Updates per_billed to 100%",
      ],
    },
    {
      from: "To Deliver",
      to: "Completed",
      action: "deliver",
      sideEffects: [
        "Creates Delivery Note",
        "Updates per_delivered to 100%",
      ],
    },
    {
      from: "Draft",
      to: "Cancelled",
      action: "cancel",
      requiresConfirmation: true,
    },
    {
      from: "To Deliver and Bill",
      to: "Closed",
      action: "close",
      requiresConfirmation: true,
      sideEffects: [
        "Prevents further transactions",
        "Can be reopened",
      ],
    },
    {
      from: "To Bill",
      to: "Closed",
      action: "close",
      requiresConfirmation: true,
    },
    {
      from: "To Deliver",
      to: "Closed",
      action: "close",
      requiresConfirmation: true,
    },
    {
      from: "Closed",
      to: "To Deliver and Bill",
      action: "reopen",
    },
  ],
};

/**
 * Quotation status machine
 */
export const QUOTATION_MACHINE: StatusMachine = {
  doctype: "Quotation",
  defaultStatus: "Draft",
  statuses: ["Draft", "Open", "Partially Ordered", "Ordered", "Lost", "Cancelled", "Expired"],
  usesDocStatus: true,
  transitions: [
    { from: "Draft", to: "Open", action: "submit" },
    { from: "Open", to: "Partially Ordered", action: "partial_order" },
    { from: "Open", to: "Ordered", action: "full_order" },
    { from: "Partially Ordered", to: "Ordered", action: "full_order" },
    { from: "Draft", to: "Cancelled", action: "cancel", requiresConfirmation: true },
    { from: "Open", to: "Lost", action: "mark_lost", requiresConfirmation: true },
  ],
};

/**
 * Sales Invoice status machine
 */
export const SALES_INVOICE_MACHINE: StatusMachine = {
  doctype: "Sales Invoice",
  defaultStatus: "Draft",
  statuses: ["Draft", "Unpaid", "Paid", "Partly Paid", "Overdue", "Cancelled", "Credit Note Issued", "Return"],
  usesDocStatus: true,
  transitions: [
    { from: "Draft", to: "Unpaid", action: "submit", sideEffects: ["Posts GL entries", "Updates accounts receivable"] },
    { from: "Unpaid", to: "Paid", action: "payment", sideEffects: ["Creates Payment Entry", "Updates outstanding_amount"] },
    { from: "Unpaid", to: "Partly Paid", action: "partial_payment", sideEffects: ["Creates partial Payment Entry"] },
    { from: "Partly Paid", to: "Paid", action: "payment", sideEffects: ["Clears remaining outstanding"] },
    { from: "Draft", to: "Cancelled", action: "cancel", requiresConfirmation: true },
  ],
};

/**
 * Delivery Note status machine
 */
export const DELIVERY_NOTE_MACHINE: StatusMachine = {
  doctype: "Delivery Note",
  defaultStatus: "Draft",
  statuses: ["Draft", "To Bill", "Completed", "Cancelled", "Return"],
  usesDocStatus: true,
  transitions: [
    { from: "Draft", to: "To Bill", action: "submit", sideEffects: ["Stock moved from warehouse", "Updates per_delivered on Sales Order"] },
    { from: "To Bill", to: "Completed", action: "invoice", sideEffects: ["Sales Invoice created", "per_billed updated"] },
    { from: "Draft", to: "Cancelled", action: "cancel", requiresConfirmation: true },
  ],
};

/**
 * Payment Entry status machine
 */
export const PAYMENT_ENTRY_MACHINE: StatusMachine = {
  doctype: "Payment Entry",
  defaultStatus: "Draft",
  statuses: ["Draft", "Submitted", "Cancelled"],
  usesDocStatus: true,
  transitions: [
    { from: "Draft", to: "Submitted", action: "submit", sideEffects: ["Posts GL entries", "Updates outstanding on referenced invoices"] },
    { from: "Draft", to: "Cancelled", action: "cancel", requiresConfirmation: true },
  ],
};

/**
 * Lead status machine
 */
export const LEAD_MACHINE: StatusMachine = {
  doctype: "Lead",
  defaultStatus: "Lead",
  statuses: ["Lead", "Open", "Replied", "Opportunity", "Quotation", "Converted", "Do Not Contact", "Closed"],
  usesDocStatus: false,
  transitions: [
    { from: "Lead", to: "Open", action: "contact" },
    { from: "Open", to: "Replied", action: "reply" },
    { from: "Replied", to: "Opportunity", action: "qualify" },
    { from: "Opportunity", to: "Converted", action: "convert" },
    { from: "Lead", to: "Do Not Contact", action: "block", requiresConfirmation: true },
    { from: "Open", to: "Closed", action: "close", requiresConfirmation: true },
  ],
};

/**
 * Work Order status machine
 */
export const WORK_ORDER_MACHINE: StatusMachine = {
  doctype: "Work Order",
  defaultStatus: "Draft",
  statuses: ["Draft", "Not Started", "In Process", "Completed", "Cancelled", "Stopped", "Closed"],
  usesDocStatus: true,
  transitions: [
    { from: "Draft", to: "Not Started", action: "submit", sideEffects: ["Reserves raw materials"] },
    { from: "Not Started", to: "In Process", action: "start", sideEffects: ["Creates Stock Entry for manufacture"] },
    { from: "In Process", to: "Completed", action: "finish", sideEffects: ["Stock Entry submitted", "Finished goods added"] },
    { from: "Draft", to: "Cancelled", action: "cancel", requiresConfirmation: true },
    { from: "Not Started", to: "Stopped", action: "stop", requiresConfirmation: true },
    { from: "In Process", to: "Stopped", action: "stop", requiresConfirmation: true },
    { from: "Stopped", to: "Not Started", action: "unstop" },
  ],
};

/**
 * All status machines indexed by doctype
 */
export const STATUS_MACHINES: Record<string, StatusMachine> = {
  "Sales Order": SALES_ORDER_MACHINE,
  "Quotation": QUOTATION_MACHINE,
  "Sales Invoice": SALES_INVOICE_MACHINE,
  "Delivery Note": DELIVERY_NOTE_MACHINE,
  "Payment Entry": PAYMENT_ENTRY_MACHINE,
  "Lead": LEAD_MACHINE,
  "Work Order": WORK_ORDER_MACHINE,
};

/**
 * Get the status machine for a doctype
 */
export function getStatusMachine(doctype: string): StatusMachine | undefined {
  return STATUS_MACHINES[doctype];
}

/**
 * Check if a status transition is legal
 */
export function isTransitionLegal(
  doctype: string,
  fromStatus: string,
  toStatus: string
): boolean {
  const machine = STATUS_MACHINES[doctype];
  if (!machine) return false;
  return machine.transitions.some(
    (t) => t.from === fromStatus && t.to === toStatus
  );
}

/**
 * Get all legal transitions from a given status
 */
export function getLegalTransitions(
  doctype: string,
  currentStatus: string
): StatusMachine["transitions"] {
  const machine = STATUS_MACHINES[doctype];
  if (!machine) return [];
  return machine.transitions.filter((t) => t.from === currentStatus);
}

/**
 * Get the next possible statuses from current status
 */
export function getNextStatuses(
  doctype: string,
  currentStatus: string
): string[] {
  return getLegalTransitions(doctype, currentStatus).map((t) => t.to);
}
