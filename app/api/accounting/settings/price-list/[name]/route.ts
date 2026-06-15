// app/api/accounting/settings/price-list/[name]/route.ts
// Obsidian ERP v4.0 — Single Price List API Routes (Factory Pattern)

import {
  createGetHandler,
  createUpdateHandler,
  createDeleteHandler,
} from "@/lib/api-factory";

export const GET = createGetHandler("Price List");
export const PUT = createUpdateHandler("Price List");
export const DELETE = createDeleteHandler("Price List");
