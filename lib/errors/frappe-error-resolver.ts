// lib/errors/frappe-error-resolver.ts
// Obsidian ERP v4.0 — Server-Error Guided Resolution
// B5: No raw Frappe error may reach the user as a toast.
// All errors pass through resolveFrappeError → typed Resolution.
// Each future phase adds strategies as it meets new error classes.

import { extractFrappeMessage } from "./extract-frappe-message";

export interface ResolutionAction {
  label: string;
  kind: "navigate" | "prefill" | "mutate" | "dismiss";
  variant?: "default" | "secondary" | "ghost";
  /** G5: Optional deep-link href for notification panel navigation */
  href?: string;
  run: () => void | Promise<void>;
}

export interface Resolution {
  code: string;
  title: string;
  explanation: string;
  details?: string[];
  severity: "warning" | "error";
  actions: ResolutionAction[];
}

// ---------------------------------------------------------------------------
// Strategy: a regex/keyword signature + a resolver function
// ---------------------------------------------------------------------------
interface ErrorStrategy {
  code: string;
  match: (msg: string) => boolean;
  resolve: (
    msg: string,
    ctx: { doctype: string; values?: unknown },
  ) => Omit<Resolution, "code">;
}

// ---------------------------------------------------------------------------
// Known strategies (ordered — first match wins)
// ---------------------------------------------------------------------------
const strategies: ErrorStrategy[] = [
  // INSUFFICIENT_STOCK
  {
    code: "INSUFFICIENT_STOCK",
    match: (m) =>
      /units?\s+of\s+.+\s+needed\s+in\s+Warehouse/i.test(m) ||
      /insufficient\s+stock/i.test(m),
    resolve: (msg, ctx) => {
      // Parse: "1.0 units of Item P-001: Raw Paper needed in Warehouse Stores - P"
      const itemMatch = msg.match(
        /units?\s+of\s+(?:Item\s+)?(.+?)(?:\s+needed|\s+:\s+)/i,
      );
      const qtyMatch = msg.match(/([\d.]+)\s+units?/i);
      const whMatch = msg.match(/Warehouse\s+(.+?)(?:\s+to\s+complete|$)/i);

      const rawItem = itemMatch?.[1]?.trim() ?? "Unknown item";
      const qty = qtyMatch?.[1] ?? "?";
      const warehouse = whMatch?.[1]?.trim() ?? "unknown warehouse";

      const [itemCode, itemName] = rawItem.includes(": ")
        ? rawItem.split(": ", 2)
        : [rawItem, rawItem];

      return {
        title: "Not enough stock to deliver",
        explanation: `You need ${qty} more units of ${itemCode} in ${warehouse} to complete this transaction.`,
        details: [
          `Item: ${itemCode}`,
          `Short by: ${qty} units`,
          `Warehouse: ${warehouse}`,
        ],
        severity: "warning",
        actions: [
          {
            label: "Create Material Request",
            kind: "prefill",
            variant: "default",
            run: () => {
              const params = new URLSearchParams({
                item_code: itemCode,
                item_name: itemName || itemCode,
                qty: qty,
                warehouse: warehouse,
              });
              window.location.href = `/stock/material-request/new?${params.toString()}`;
            },
          },
          {
            label: "Dismiss",
            kind: "dismiss",
            variant: "ghost",
            run: () => {},
          },
        ],
      };
    },
  },

  // MANDATORY_MISSING
  {
    code: "MANDATORY_MISSING",
    match: (m) =>
      /is mandatory/i.test(m) ||
      /Mandatory\s+fields?\s+required/i.test(m) ||
      /missing\s+required/i.test(m),
    resolve: (msg) => {
      // Try to extract field name
      const fieldMatch = msg.match(/(?:Field\s+)?['"]?(.+?)['"]?\s+is mandatory/i);
      const field = fieldMatch?.[1] ?? "A required field";

      return {
        title: "Missing required information",
        explanation: `${field} is required before you can continue. Please fill it in and try again.`,
        details: [`Field: ${field}`],
        severity: "warning",
        actions: [
          {
            label: "Dismiss",
            kind: "dismiss",
            variant: "ghost",
            run: () => {},
          },
        ],
      };
    },
  },

  // LINK_VALIDATION
  {
    code: "LINK_VALIDATION",
    match: (m) =>
      /Could not find/i.test(m) || /not found/i.test(m) || /does not exist/i.test(m),
    resolve: (msg) => {
      const linkMatch = msg.match(
        /Could not find ['"]?(.+?)['"]?(?:;|\.|$)/i,
      );
      const link = linkMatch?.[1] ?? "The referenced record";

      return {
        title: "Record not found",
        explanation: `${link} could not be found. It may have been deleted or you may need to create it first.`,
        details: [`Missing: ${link}`],
        severity: "error",
        actions: [
          {
            label: "Dismiss",
            kind: "dismiss",
            variant: "ghost",
            run: () => {},
          },
        ],
      };
    },
  },

  // R2: FIELD_VALIDATION — formatted as "field: Required · field: msg"
  {
    code: "FIELD_VALIDATION",
    match: (m) => {
      // Match a single "field: message" pair OR a multi-segment summary
      // separated by · or ,. Exclude phrases owned by other strategies so
      // they take precedence (is mandatory → MANDATORY_MISSING, etc.).
      if (!/[A-Za-z_][A-Za-z0-9_]*\s*:\s*\S/.test(m)) return false;
      if (/is mandatory/i.test(m)) return false;
      if (/already exists/i.test(m)) return false;
      if (/Could not find/i.test(m)) return false;
      return true;
    },
    resolve: (msg) => {
      // Split on · (or commas) and re-parse "field: message" pairs
      const parts = msg.split(/\s+·\s+|\s*,\s+/).map((p) => p.trim()).filter(Boolean);
      const fields: { field: string; message: string }[] = [];
      for (const p of parts) {
        const m = p.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.+)$/);
        if (m) fields.push({ field: m[1], message: m[2] });
      }
      if (fields.length === 0) {
        // Fallback: treat the whole message as a single error
        return {
          title: "Validation failed",
          explanation: msg,
          details: [msg],
          severity: "error",
          actions: [
            {
              label: "Dismiss",
              kind: "dismiss",
              variant: "ghost",
              run: () => {},
            },
          ],
        };
      }
      const first = fields[0];
      return {
        title: `Missing or invalid: ${first.field}`,
        explanation:
          fields.length === 1
            ? `${first.field} — ${first.message}. Please fix this field and try again.`
            : `${fields.length} fields need attention. The first is ${first.field} — ${first.message}. See all fields below.`,
        details: fields.map((f) => `${f.field}: ${f.message}`),
        severity: "error",
        actions: [
          {
            label: "Dismiss",
            kind: "dismiss",
            variant: "ghost",
            run: () => {},
          },
        ],
      };
    },
  },

  // DUPLICATE
  {
    code: "DUPLICATE",
    match: (m) =>
      /Duplicate/i.test(m) || /already exists/i.test(m) || /already used/i.test(m) || /must be unique/i.test(m),
    resolve: (msg) => {
      // Parse: "Email Address must be unique, it is already used in CRM-LEAD-2026-00001"
      // Or: "Purchase Order PO-001 already exists"
      const nameMatch = msg.match(/([A-Z]{2,}-[\w-]+-\d+(?:-\d+)?)/i);
      const existing = nameMatch?.[1]?.trim() ?? "A record with these details";

      const routeMap: Record<string, string> = {
        "CRM-LEAD": "crm/lead",
        "CRM-OPP": "crm/opportunity",
        "CUST-": "crm/customer",
        "SAL-QTN": "sales/quotation",
        "SAL-ORD": "sales/sales-order",
        "MAT-DN": "stock/delivery-note",
        "MAT-STE": "stock/stock-entry",
        "MAT-MR": "stock/material-request",
        "MAT-PRE": "stock/purchase-receipt",
        "ACC-SINV": "accounting/sales-invoice",
        "ACC-PE": "accounting/payment-entry",
        "ACC-PINV": "accounting/purchase-invoice",
        "ACC-JE": "accounting/journal-entry",
        "PUR-ORD": "buying/purchase-order",
        "PUR-RFQ": "buying/request-for-quotation",
        "PUR-SQTN": "buying/supplier-quotation",
        "MFG-BOM": "manufacturing/bom",
        "MFG-WO": "manufacturing/work-order",
        "MAT-RECO": "stock/stock-reconciliation",
      };

      let route = "";
      if (nameMatch) {
        for (const [prefix, r] of Object.entries(routeMap)) {
          if (existing.startsWith(prefix)) {
            route = r;
            break;
          }
        }
      }

      const actions: Array<{
        label: string;
        kind: "navigate" | "dismiss";
        variant: "default" | "ghost";
        href?: string;
        run: () => void;
      }> = [];

      if (nameMatch && route) {
        const href = `/${route}/${encodeURIComponent(existing)}`;
        actions.push({
          label: `Open ${existing}`,
          kind: "navigate",
          variant: "default",
          href, // G5: populate href for notification deep-link
          run: () => {
            window.location.href = href;
          },
        });
      }

      actions.push({
        label: "Dismiss",
        kind: "dismiss",
        variant: "ghost",
        run: () => {},
      });

      return {
        title: "Duplicate entry",
        explanation: `${existing} already exists. You can open the existing record or change your entry to avoid the conflict.`,
        details: [`Existing: ${existing}`],
        severity: "warning",
        actions,
      };
    },
  },

  // LINK_EXISTS — 2L P2: deleting a Price List that's referenced by Item Prices
  // Listed BEFORE LINKED_DOC_EXISTS so the more specific "is referenced by"
  // / "is linked with N Item Price" patterns fire on the delete path;
  // LINKED_DOC_EXISTS handles the cancel path.
  {
    code: "LINK_EXISTS",
    match: (m) =>
      // The most specific delete pattern: "is referenced by"
      /is referenced by/i.test(m) ||
      // Or "is linked with N Item Price" (count) — distinct from cancel
      /is linked with \d+ Item Price/i.test(m) ||
      // Or the general "cannot be deleted ... linked with" shape
      (/cannot be deleted/i.test(m) && /linked/i.test(m) && !/submitted/i.test(m)),
    resolve: (msg) => {
      // Try to extract the count or the linked doctype
      const linkedDoctypeMatch = msg.match(/linked with\s+([A-Z][A-Za-z\s]+?)(?:\s+<|\s+\d|\.|$)/);
      const countMatch = msg.match(/(\d+)\s+(?:Item Prices?|records?|rows?)/i);
      const linkedDoctype = linkedDoctypeMatch?.[1]?.trim() || "Item Price";
      const count = countMatch?.[1] || "one or more";

      return {
        title: "Price List is in use",
        explanation: `This Price List can't be deleted while ${count} ${linkedDoctype}${count === "1" ? "" : "s"} reference${count === "1" ? "s" : ""} it. Remove or reassign the prices first, then try again.`,
        details: [`In use by: ${count} ${linkedDoctype}`],
        severity: "warning",
        actions: [
          {
            label: "View Item Prices",
            kind: "navigate",
            variant: "default",
            run: () => {
              window.location.href = "/stock/settings/item-price";
            },
          },
          {
            label: "Dismiss",
            kind: "dismiss",
            variant: "ghost",
            run: () => {},
          },
        ],
      };
    },
  },

  // LINKED_DOC_EXISTS — 2L P2: refined regex to not steal from LINK_EXISTS.
  // The cancel path is "Cannot cancel because <linked> exists" (the literal
  // phrase "cancel because ... exists"). The delete path is "Cannot delete
  // or cancel because <linked> is referenced by ..." (handled by LINK_EXISTS).
  {
    code: "LINKED_DOC_EXISTS",
    match: (m) =>
      // Strict cancel path: must start with "cannot cancel" (not "cannot delete")
      // AND contain "exists" (the cancel-time error shape)
      (/^Cannot\s+cancel\b/i.test(m) && /exists/i.test(m)) ||
      /linked with submitted/i.test(m) ||
      // "is linked with <submitted-doc>" — the cancel path. If the link
      // message does NOT mention "referenced by" and does NOT include
      // "cannot be deleted", it's a cancel-time link, not a delete-time one.
      (/is linked with/i.test(m) && !/is referenced by/i.test(m) && !/cannot be deleted/i.test(m)),
    resolve: (msg) => {
      const linkedNameMatch = msg.match(/([A-Z]{2,}-[\w-]+-\d+(?:-\d+)?)/i);
      const linkedName = linkedNameMatch?.[1]?.trim() ?? "the linked record";

      const idIndex = linkedNameMatch?.index ?? 0;
      const beforeId = msg.slice(0, idIndex);
      const noise = /^(?:submitted|existing|draft)\s+/i;
      const cleaned = beforeId.replace(noise, "").trim();
      const linkedDoctype = cleaned.split(/\s+/).slice(-2).join(" ") || "Linked document";

      const routeMap: Record<string, string> = {
        "Stock Entry": "stock/stock-entry",
        "Sales Order": "sales/sales-order",
        "Delivery Note": "stock/delivery-note",
        "Sales Invoice": "accounting/sales-invoice",
        "Purchase Order": "buying/purchase-order",
        "Purchase Invoice": "accounting/purchase-invoice",
        "Purchase Receipt": "stock/purchase-receipt",
        "Work Order": "manufacturing/work-order",
        "Material Request": "stock/material-request",
        "Payment Entry": "accounting/payment-entry",
        "Journal Entry": "accounting/journal-entry",
        "BOM": "manufacturing/bom",
        "Quotation": "sales/quotation",
        "Stock Reconciliation": "stock/stock-reconciliation",
      };
      const route = routeMap[linkedDoctype] ?? linkedDoctype.toLowerCase().replace(/\s+/g, "-");

      return {
        title: "Cancel the linked document first",
        explanation: `This can't be cancelled while ${linkedDoctype} ${linkedName} is still submitted. Cancel ${linkedName} first, then return here.`,
        details: [`Linked: ${linkedDoctype} ${linkedName}`],
        severity: "warning" as const,
        actions: [
          {
            label: `Open ${linkedDoctype} ${linkedName}`,
            kind: "navigate" as const,
            variant: "default" as const,
            href: `/${route}/${encodeURIComponent(linkedName)}`, // G5: populate href
            run: () => {
              window.location.href = `/${route}/${encodeURIComponent(linkedName)}`;
            },
          },
          {
            label: "Dismiss",
            kind: "dismiss" as const,
            variant: "ghost" as const,
            run: () => {},
          },
        ],
      };
    },
  },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function resolveFrappeError(
  err: unknown,
  ctx: { doctype: string; values?: unknown },
): Resolution {
  const rawMessage = extractFrappeMessage(err);

  // Try each strategy in order
  for (const strategy of strategies) {
    if (strategy.match(rawMessage)) {
      return { code: strategy.code, ...strategy.resolve(rawMessage, ctx) };
    }
  }

  // GENERIC_FALLBACK
  return {
    code: "GENERIC_FALLBACK",
    title: "Something went wrong",
    explanation:
      "The server rejected this action. See the technical details below or try again.",
    details: [rawMessage],
    severity: "error",
    actions: [
      {
        label: "Dismiss",
        kind: "dismiss",
        variant: "ghost",
        run: () => {},
      },
    ],
  };
}

/**
 * Get all known strategy codes (for testing).
 */
export const KNOWN_ERROR_CODES = strategies.map((s) => s.code);
