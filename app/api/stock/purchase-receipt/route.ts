// @ts-nocheck
// app/api/stock/purchase-receipt/route.ts
// Obsidian ERP v4.0 — Purchase Receipt REST surface (Stock module).
//
// Mirrors the Delivery Note route (same factory pattern). This file was
// MISSING — the doctype-config pointed the client at `stock/purchase-receipts`
// (a stray plural; every sibling is singular) and no route existed at either
// path, so the wizard's POST 404'd. The apiPath is now corrected to the
// singular `stock/purchase-receipt` (matching the error-resolver + flow-chain
// maps), and this handler answers it. RBAC is enforced by the factory via
// per-request `sid` forwarding → ERPNext DocPerm (Purchase User / Stock roles).
import { createListHandler, createCreateHandler } from "@/lib/api-factory";
import { PurchaseReceiptCreateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createListHandler("Purchase Receipt", {
  allowedFields: [
    "name",
    "supplier",
    "supplier_name",
    "supplier_delivery_note",
    "posting_date",
    "posting_time",
    "status",
    "currency",
    "grand_total",
    "base_grand_total",
    "total_qty",
    "per_billed",
    "per_returned",
    "is_return",
    "return_against",
    "set_warehouse",
    "company",
    "docstatus",
    "creation",
  ],
  defaultSort: { field: "posting_date", order: "desc" },
  defaultLimit: 50,
});

export const POST = createCreateHandler(
  "Purchase Receipt",
  PurchaseReceiptCreateSchema,
);
