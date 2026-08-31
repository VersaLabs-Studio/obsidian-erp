// app/api/manufacturing/bom/quick/route.ts
// Obsidian ERP v4.0 — 2Y-R3: Quick BOM, the server-side way.
//
// WHY THIS ROUTE EXISTS (the "No BOM available" dead-end):
//   ERPNext hard-requires a BOM on every Work Order — there is no setting to
//   disable it. For the Pana SME the answer is to make the BOM AUTOMATIC, not
//   to surface it. The SO cockpit previously tried to create a fallback BOM
//   client-side via `POST /api/resource/BOM`, which fails twice over:
//     1. `/api/*` is the Next.js namespace — that URL 404s, it never reaches
//        Frappe.
//     2. Even if it had, the payload had `items: []` (ERPNext rejects a BOM
//        with no raw-material rows) and the doc was never SUBMITTED — a draft
//        BOM cannot back a Work Order (frappe.client.submit needs the full
//        doc; see make-stock-entry/route.ts for the same pattern).
//
//   This route builds a REAL single-level BOM server-side:
//     - Lines come from the configurator option-sets: the `is_default`
//       choices' `component_item`/`qty_formula` — the "default selections ==
//       default BOM" rule. The configurator and this route share
//       lib/configurator/option-sets.ts as the single source of truth.
//     - Items with no option set fall back to one qty-1 line of the first
//       stock item in the Raw Material group (a placeholder to refine later).
//     - The doc is inserted + submitted in ONE call via `frappe.client.submit`
//       so the Work Order can consume it immediately.
//
// Idempotent: if an active, submitted default BOM already exists for the item
// it is returned untouched.
//
// Body: { item_code: string, company?: string, quantity?: number }
// Returns: { success, data: { name, created } }

import { NextRequest, NextResponse } from "next/server";
import { frappeClient } from "@/lib/frappe-client";
import { getRequestClient } from "@/lib/auth/resolve-user";
import { OPTION_SETS } from "@/lib/configurator/option-sets";

interface BomLine {
  item_code: string;
  qty: number;
}

/** Default raw-material lines for an item, derived from its configurator
 *  option set: every `is_default` choice that consumes a component. */
function defaultBomLines(itemCode: string): BomLine[] {
  const optionSet = OPTION_SETS[itemCode];
  if (!optionSet) return [];
  const lines: BomLine[] = [];
  for (const group of optionSet.options) {
    for (const choice of group.choices) {
      if (choice.is_default && choice.component_item) {
        lines.push({
          item_code: choice.component_item,
          qty: choice.qty_formula ?? 1,
        });
      }
    }
  }
  return lines;
}

export async function POST(request: NextRequest) {
  // Per-request, user-scoped client — fail closed (401) with no session.
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

  try {
    const body = (await request.json().catch(() => ({}))) as {
      item_code?: string;
      company?: string;
      quantity?: number;
    };
    const itemCode = body.item_code?.trim();
    if (!itemCode) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing Parameter",
          details: "item_code is required.",
          statusCode: 400,
        },
        { status: 400 },
      );
    }

    // 0) Idempotency — an active, submitted default BOM already covers this
    //    item; hand it back instead of minting a duplicate.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing: any = await (client.call as any).get(
      "frappe.client.get_list",
      {
        doctype: "BOM",
        filters: JSON.stringify({
          item: itemCode,
          is_active: 1,
          docstatus: 1,
        }),
        fields: JSON.stringify(["name"]),
        limit_page_length: 1,
      },
    );
    const existingRows = existing?.message ?? existing;
    if (Array.isArray(existingRows) && existingRows[0]?.name) {
      return NextResponse.json(
        {
          success: true,
          data: { name: existingRows[0].name, created: false },
          message: `Existing BOM ${existingRows[0].name} reused.`,
        },
        { status: 200 },
      );
    }

    // 1) Build the raw-material lines. Configurator defaults first (the item's
    //    real recipe); otherwise a single placeholder RM line so the BOM is
    //    valid and the Work Order can proceed.
    let lines = defaultBomLines(itemCode);
    let placeholder = false;
    if (lines.length === 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rm: any = await (client.call as any).get("frappe.client.get_list", {
        doctype: "Item",
        filters: JSON.stringify({
          item_group: "Raw Material",
          is_stock_item: 1,
          disabled: 0,
        }),
        fields: JSON.stringify(["name"]),
        limit_page_length: 1,
      });
      const rmRows = rm?.message ?? rm;
      if (Array.isArray(rmRows) && rmRows[0]?.name) {
        lines = [{ item_code: rmRows[0].name, qty: 1 }];
        placeholder = true;
      }
    }
    if (lines.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "NoRawMaterialAvailable",
          details:
            `No default recipe is configured for '${itemCode}' and no raw-material ` +
            "item exists to build a minimal BOM from. Create at least one stock item " +
            "in the Raw Material group (or seed the catalog), then retry.",
          statusCode: 422,
        },
        { status: 422 },
      );
    }

    // 2) Resolve company (+ its currency) — never hardcode the tenant.
    let company = body.company?.trim() ?? "";
    if (!company) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const comp: any = await (client.call as any).get("frappe.client.get_list", {
        doctype: "Company",
        fields: JSON.stringify(["name"]),
        limit_page_length: 1,
      });
      const compRows = comp?.message ?? comp;
      company = compRows?.[0]?.name ?? "";
    }
    let currency = "";
    if (company) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cur: any = await (client.call as any).get("frappe.client.get_value", {
          doctype: "Company",
          filters: JSON.stringify({ name: company }),
          fieldname: "default_currency",
        });
        currency = String((cur?.message ?? cur)?.default_currency ?? "");
      } catch {
        // ERPNext fills the company currency on validate; proceed without.
      }
    }

    // 3) Insert + submit the BOM in one server call (same pattern as
    //    make-stock-entry). Submitted immediately so the WO can reference it.
    const bomDoc: Record<string, unknown> = {
      doctype: "BOM",
      item: itemCode,
      company,
      quantity: typeof body.quantity === "number" && body.quantity > 0 ? body.quantity : 1,
      is_active: 1,
      is_default: 1,
      with_operations: 0,
      ...(currency ? { currency } : {}),
      ...(placeholder
        ? { remarks: "Quick BOM — placeholder raw material; refine the recipe later." }
        : { remarks: "Quick BOM — auto-generated from the configurator's default recipe." }),
      items: lines.map((l) => ({ item_code: l.item_code, qty: l.qty })),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const submitted: any = await (client.call as any).post("frappe.client.submit", {
      doc: JSON.stringify(bomDoc),
    });
    const result = submitted?.message ?? submitted;
    const bomName: string | undefined = result?.name;

    return NextResponse.json(
      {
        success: true,
        data: { name: bomName ?? null, created: true },
        message: placeholder
          ? `Quick BOM ${bomName} created with a placeholder material — refine it later.`
          : `Quick BOM ${bomName} created from the default recipe.`,
      },
      { status: 201 },
    );
  } catch (error) {
    const err = frappeClient.handleError(error);
    return NextResponse.json(err, { status: err.statusCode ?? 500 });
  }
}
