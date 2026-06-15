// app/api/stock/stock-ledger-entry/[name]/route.ts
// Obsidian ERP v4.0 — Stock Ledger Entry detail (read-only)
//
// Stock Ledger Entry is a system-generated, append-only DocType in ERPNext.
// It has no POST / PUT / DELETE — only GET (single + list).

import { createGetHandler } from "@/lib/api-factory";

export const GET = createGetHandler("Stock Ledger Entry");
