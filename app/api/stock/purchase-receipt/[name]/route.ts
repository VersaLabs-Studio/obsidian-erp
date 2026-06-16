// @ts-nocheck
// app/api/stock/purchase-receipt/[name]/route.ts
// Obsidian ERP v4.0 — Purchase Receipt single-doc surface (GET/PUT/DELETE).
//
// Paired with ../route.ts. The wizard's onSuccess navigates to the detail
// page, which reads this GET; the edit page uses PUT. Same factory pattern
// as Delivery Note — RBAC via per-request sid forwarding → ERPNext DocPerm.
import {
  createGetHandler,
  createUpdateHandler,
  createDeleteHandler,
} from "@/lib/api-factory";
import { PurchaseReceiptUpdateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createGetHandler("Purchase Receipt");
export const PUT = createUpdateHandler(
  "Purchase Receipt",
  PurchaseReceiptUpdateSchema,
);
export const DELETE = createDeleteHandler("Purchase Receipt");
