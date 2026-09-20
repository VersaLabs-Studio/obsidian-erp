// app/api/stock/item/quick/route.ts
// Obsidian ERP v5.2-A — Quick Item: the 1-field fast path (4.1.1 deferred).
//
// The full Item form is ceremony a print shop doesn't need for "just add
// this paper/board". This route creates a working Item from a NAME alone:
//   • item_code = the trimmed name (ERPNext item codes are free text; the
//     live probe confirmed a minimal item_code/item_name/item_group/
//     stock_uom insert validates and persists).
//   • item_group defaults to "Products" (live-confirmed on this site);
//     "Services" (also live) flips the item to non-stock — the only thing
//     ERPNext would otherwise get wrong for a service.
//   • stock_uom defaults to "Nos"; company + receiving warehouse are written
//     into the item_defaults child (mirrors the MR order route's warehouse
//     resolution) so order/DN prefill works on the new item immediately.
//
// Idempotent: an item with the resolved code already existing returns it
// untouched (created: false) — a double-click never mints a duplicate.
//
// RBAC: per-request, sid-forwarded user client (fail closed 401). The user
// needs create on Item.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { frappeClient } from "@/lib/frappe-client";
import { getRequestClient } from "@/lib/auth/resolve-user";

const quickItemSchema = z.object({
  item_name: z.string().trim().min(1).max(140),
  item_group: z.string().trim().optional(),
  stock_uom: z.string().trim().optional(),
});

/** item_code from the name: collapse whitespace runs, trim edges. */
function codeFromName(name: string): string {
  return name.replace(/\s+/g, " ").trim();
}

export async function POST(request: NextRequest) {
  const client = getRequestClient(request);
  if (!client) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized",
        details: "No valid session.",
        statusCode: 401,
      },
      { status: 401 },
    );
  }

  const parsed = quickItemSchema.safeParse(
    await request.json().catch(() => ({})),
  );
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Validation Error",
        details: "item_name is required (the rest gets sensible defaults).",
        statusCode: 400,
      },
      { status: 400 },
    );
  }
  const { item_name: itemName } = parsed.data;
  const itemGroup = parsed.data.item_group?.trim() || "Products";
  const stockUom = parsed.data.stock_uom?.trim() || "Nos";
  // Services can't be stock items — the one inference that keeps ERPNext
  // consistent. Every other group (Products, Raw Material, …) is stocked.
  const isStock = itemGroup !== "Services" ? 1 : 0;
  const itemCode = codeFromName(itemName);

  try {
    // 1) Idempotency — exact item_code already exists → return it.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing: any = await (client.call as any).get(
      "frappe.client.get_list",
      {
        doctype: "Item",
        filters: JSON.stringify({ item_code: itemCode }),
        fields: JSON.stringify(["name", "item_name"]),
        limit_page_length: 1,
      },
    );
    const rows = existing?.message ?? existing;
    if (Array.isArray(rows) && rows[0]?.name) {
      return NextResponse.json({
        success: true,
        data: { name: rows[0].name, created: false },
        message: `Item ${rows[0].name} already exists — reused.`,
      });
    }

    // 2) Resolve company + receiving warehouse for the item_defaults row
    //    (same sources as the MR order route: explicit → first Company,
    //    Stock Settings.default_warehouse).
    let company = "";
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const comp: any = await (client.call as any).get(
        "frappe.client.get_list",
        {
          doctype: "Company",
          fields: JSON.stringify(["name"]),
          limit_page_length: 1,
        },
      );
      company = (comp?.message ?? comp)?.[0]?.name ?? "";
    } catch {
      /* item_defaults row is a nice-to-have; never block the create */
    }
    let defaultWarehouse = "";
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ss: any = await (client.call as any).get(
        "frappe.client.get_value",
        {
          doctype: "Stock Settings",
          filters: { name: "Stock Settings" },
          fieldname: "default_warehouse",
        },
      );
      defaultWarehouse = String(
        (ss?.message ?? ss)?.default_warehouse ?? "",
      );
    } catch {
      /* same */
    }

    // 3) Insert the minimal Item (master doc — no submit step).
    const itemDoc: Record<string, unknown> = {
      doctype: "Item",
      item_code: itemCode,
      item_name: itemName,
      item_group: itemGroup,
      stock_uom: stockUom,
      is_stock_item: isStock,
      ...(company
        ? {
            item_defaults: [
              {
                company,
                ...(defaultWarehouse ? { default_warehouse: defaultWarehouse } : {}),
              },
            ],
          }
        : {}),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inserted: any = await (client.call as any).post(
      "frappe.client.insert",
      { doc: JSON.stringify(itemDoc) },
    );
    const result = inserted?.message ?? inserted;
    const name: string | null = result?.name ?? null;

    return NextResponse.json(
      {
        success: true,
        data: { name, created: true },
        message: `Item ${name ?? itemCode} created.`,
      },
      { status: 201 },
    );
  } catch (error) {
    const err = frappeClient.handleError(error);
    return NextResponse.json(err, { status: err.statusCode ?? 500 });
  }
}
