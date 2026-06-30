// lib/list-power/saved-views.ts
// Obsidian ERP v4.0 - Saved Views (localStorage-based filter+sort+column presets)

/**
 * A saved view captures a user's preferred filter, sort, and column state
 * for a specific doctype list page.
 */
export interface SavedView {
  /** Unique ID */
  id: string;
  /** User-facing name */
  name: string;
  /** Doctype this view applies to */
  doctype: string;
  /** Active filter state */
  filters: SavedViewFilters;
  /** Sort configuration */
  sort: SavedViewSort | null;
  /** Visible column keys */
  visibleColumns: string[];
  /** Whether this is a system-seeded default */
  isDefault: boolean;
  /** ISO timestamp of last use */
  lastUsed?: string;
}

/**
 * Filter state serialized in a saved view.
 */
export interface SavedViewFilters {
  /** Status filter value */
  status?: string;
  /** Search query */
  search?: string;
  /** Date range start (ISO date) */
  dateFrom?: string;
  /** Date range end (ISO date) */
  dateTo?: string;
  /** Party (customer/supplier) */
  party?: string;
  /** Amount range */
  amountMin?: number;
  amountMax?: number;
}

/**
 * Sort state serialized in a saved view.
 */
export interface SavedViewSort {
  /** Field key to sort by */
  field: string;
  /** Sort direction */
  order: "asc" | "desc";
}

// ---------------------------------------------------------------------------
// Storage key pattern
// ---------------------------------------------------------------------------

const STORAGE_PREFIX = "obsidian_list_view";

function storageKey(doctype: string): string {
  return `${STORAGE_PREFIX}:${doctype}`;
}

// ---------------------------------------------------------------------------
// CRUD operations
// ---------------------------------------------------------------------------

/**
 * Load all saved views for a doctype from localStorage.
 */
export function loadViews(doctype: string): SavedView[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(doctype));
    if (!raw) return getDefaultViews(doctype);
    const parsed: SavedView[] = JSON.parse(raw);
    // Merge with defaults in case new defaults were added
    const defaults = getDefaultViews(doctype);
    const existingIds = new Set(parsed.map((v) => v.id));
    const missingDefaults = defaults.filter((d) => !existingIds.has(d.id));
    return [...parsed, ...missingDefaults];
  } catch {
    return getDefaultViews(doctype);
  }
}

/**
 * Save all views for a doctype to localStorage.
 */
export function saveViews(doctype: string, views: SavedView[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(doctype), JSON.stringify(views));
  } catch (e) {
    console.warn("[saved-views] Failed to persist views:", e);
  }
}

/**
 * Create a new saved view and persist it.
 */
export function createView(
  doctype: string,
  name: string,
  filters: SavedViewFilters,
  sort: SavedViewSort | null,
  visibleColumns: string[]
): SavedView {
  const view: SavedView = {
    id: `sv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    doctype,
    filters,
    sort,
    visibleColumns,
    isDefault: false,
    lastUsed: new Date().toISOString(),
  };
  const views = loadViews(doctype);
  views.push(view);
  saveViews(doctype, views);
  return view;
}

/**
 * Update an existing saved view.
 */
export function updateView(
  doctype: string,
  viewId: string,
  updates: Partial<Omit<SavedView, "id" | "doctype">>
): SavedView | null {
  const views = loadViews(doctype);
  const idx = views.findIndex((v) => v.id === viewId);
  if (idx === -1) return null;
  views[idx] = { ...views[idx], ...updates, lastUsed: new Date().toISOString() };
  saveViews(doctype, views);
  return views[idx];
}

/**
 * Delete a saved view. System defaults cannot be deleted (they will be re-seeded).
 */
export function deleteView(doctype: string, viewId: string): boolean {
  const views = loadViews(doctype);
  const idx = views.findIndex((v) => v.id === viewId);
  if (idx === -1) return false;
  // Don't allow deleting system defaults
  if (views[idx].isDefault) return false;
  views.splice(idx, 1);
  saveViews(doctype, views);
  return true;
}

/**
 * Mark a view as recently used (updates lastUsed timestamp).
 */
export function touchView(doctype: string, viewId: string): void {
  const views = loadViews(doctype);
  const view = views.find((v) => v.id === viewId);
  if (view) {
    view.lastUsed = new Date().toISOString();
    saveViews(doctype, views);
  }
}

// ---------------------------------------------------------------------------
// Default seeded views per module
// ---------------------------------------------------------------------------

function getDefaultViews(doctype: string): SavedView[] {
  const now = new Date().toISOString();

  const defaults: Record<string, SavedView[]> = {
    "Sales Order": [
      {
        id: "default_all",
        name: "All Orders",
        doctype: "Sales Order",
        filters: {},
        sort: { field: "transaction_date", order: "desc" },
        visibleColumns: ["name", "customer_name", "transaction_date", "grand_total", "per_delivered", "status"],
        isDefault: true,
        lastUsed: now,
      },
      {
        id: "default_undelivered",
        name: "Undelivered",
        doctype: "Sales Order",
        filters: { status: "To Deliver" },
        sort: { field: "transaction_date", order: "desc" },
        visibleColumns: ["name", "customer_name", "transaction_date", "delivery_date", "per_delivered", "status"],
        isDefault: true,
        lastUsed: now,
      },
      {
        id: "default_completed",
        name: "Completed",
        doctype: "Sales Order",
        filters: { status: "Completed" },
        sort: { field: "transaction_date", order: "desc" },
        visibleColumns: ["name", "customer_name", "transaction_date", "grand_total", "per_delivered", "per_billed", "status"],
        isDefault: true,
        lastUsed: now,
      },
    ],
    "Sales Invoice": [
      {
        id: "default_all",
        name: "All Invoices",
        doctype: "Sales Invoice",
        filters: {},
        sort: { field: "posting_date", order: "desc" },
        visibleColumns: ["name", "customer_name", "posting_date", "grand_total", "outstanding_amount", "status"],
        isDefault: true,
        lastUsed: now,
      },
      {
        id: "default_overdue",
        name: "Overdue Invoices",
        doctype: "Sales Invoice",
        filters: { status: "Overdue" },
        sort: { field: "posting_date", order: "desc" },
        visibleColumns: ["name", "customer_name", "posting_date", "grand_total", "outstanding_amount", "status"],
        isDefault: true,
        lastUsed: now,
      },
      {
        id: "default_unpaid",
        name: "Unpaid",
        doctype: "Sales Invoice",
        filters: { status: "Unpaid" },
        sort: { field: "posting_date", order: "desc" },
        visibleColumns: ["name", "customer_name", "posting_date", "grand_total", "outstanding_amount", "status"],
        isDefault: true,
        lastUsed: now,
      },
    ],
    "Purchase Invoice": [
      {
        id: "default_all",
        name: "All Invoices",
        doctype: "Purchase Invoice",
        filters: {},
        sort: { field: "posting_date", order: "desc" },
        visibleColumns: ["name", "supplier_name", "posting_date", "grand_total", "outstanding_amount", "status"],
        isDefault: true,
        lastUsed: now,
      },
      {
        id: "default_overdue",
        name: "Overdue",
        doctype: "Purchase Invoice",
        filters: { status: "Overdue" },
        sort: { field: "posting_date", order: "desc" },
        visibleColumns: ["name", "supplier_name", "posting_date", "grand_total", "outstanding_amount", "status"],
        isDefault: true,
        lastUsed: now,
      },
    ],
    "Delivery Note": [
      {
        id: "default_all",
        name: "All DN",
        doctype: "Delivery Note",
        filters: {},
        sort: { field: "posting_date", order: "desc" },
        visibleColumns: ["name", "customer_name", "posting_date", "grand_total", "per_billed", "status"],
        isDefault: true,
        lastUsed: now,
      },
    ],
    "Quotation": [
      {
        id: "default_all",
        name: "All Quotations",
        doctype: "Quotation",
        filters: {},
        sort: { field: "transaction_date", order: "desc" },
        visibleColumns: ["name", "customer_name", "transaction_date", "grand_total", "status"],
        isDefault: true,
        lastUsed: now,
      },
      {
        id: "default_open",
        name: "Open",
        doctype: "Quotation",
        filters: { status: "Open" },
        sort: { field: "transaction_date", order: "desc" },
        visibleColumns: ["name", "customer_name", "transaction_date", "grand_total", "status"],
        isDefault: true,
        lastUsed: now,
      },
    ],
  };

  return defaults[doctype] ?? [];
}
