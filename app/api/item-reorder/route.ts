// app/api/item-reorder/route.ts
// Obsidian ERP v4.0 — Item Reorder child-table proxy (2P-FINAL Part A follow-up).
//
// The global dashboard (components/dashboard/GlobalDashboard.tsx) reads the
// `Item Reorder` child table to compute low-stock counts. ERPNext exposes
// this as a child doctype of `Item`; it has no dedicated REST surface, so
// we route through the same factory pattern as the other list handlers —
// forwarding the user's `sid` cookie (per 2P-FINAL Part A.2) so Frappe
// runs its native DocPerm check.
//
// 2P-FINAL Part A.2 — per-request user-scoped Frappe client, fail-closed 401.

import { NextRequest, NextResponse } from "next/server";
import { frappeClient } from "@/lib/frappe-client";
import { getRequestClient } from "@/lib/auth/resolve-user";
import { createListHandler } from "@/lib/api-factory";

const ETB = new Intl.NumberFormat("en-ET", {
  style: "currency",
  currency: "ETB",
  maximumFractionDigits: 0,
});

// Default GET — read all rows the user is allowed to see.
export const GET = createListHandler("Item Reorder", {
  allowedFields: [
    "name",
    "parent",
    "warehouse",
    "warehouse_reorder_level",
    "warehouse_reorder_qty",
  ],
  defaultLimit: 200,
  maxLimit: 1000,
});

// Keep the unused import warning happy in case future handlers are
// added below this line. (frappeClient is imported for the handleError
// path the factory uses internally; explicit re-export is a no-op.)
export { frappeClient, ETB };
