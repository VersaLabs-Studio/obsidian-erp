// app/api/manufacturing/work-order/[name]/make-stock-entry/route.ts
// Obsidian ERP v4.0 — Work Order → Stock Entry, the DESK-BUTTON way (2P live-fix).
//
// WHY THIS ROUTE EXISTS (the "WO never starts" bug):
//   The Start/Finish modals previously HAND-BUILT the Material Transfer /
//   Manufacture Stock Entry payload and submitted it via the generic CRUD
//   factory. That moved stock (per-item `transferred_qty` updated) but left
//   the Work Order on "Not Started" — because ERPNext only advances the WO
//   header (`material_transferred_for_manufacturing` → status "In Process")
//   when the submitted SE carries the FULL manufacturing linkage that
//   `on_submit → update_work_order_qty()` credits back to the BOM:
//   `fg_completed_qty > 0`, `from_bom`, `bom_no`, `use_multi_level_bom`, and
//   item rows tied to the WO's required materials. Re-deriving those private
//   invariants by hand is the loop we were stuck in.
//
//   This route stops guessing. It calls ERPNext's OWN server method
//   `...work_order.make_stock_entry(work_order_id, purpose, qty)` — the exact
//   function the ERPNext desk "Start"/"Finish" buttons invoke. That returns a
//   fully-formed SE dict (every field ERPNext expects), which we then insert +
//   submit in one shot via `frappe.client.submit`. Because ERPNext built the
//   doc, no linkage field can be missing, so the WO advances every time.
//
// RBAC (consistent with the rest of 2P-FINAL): both calls go through the
// per-request, sid-forwarded `getRequestClient(request)`. ERPNext runs its
// native DocPerm engine for the requesting user — they need create+submit on
// Stock Entry (the manufacturing roles do). Fail closed (401) with no session.
//
// Body: { purpose: "Material Transfer for Manufacture" | "Manufacture", qty?: number }
//   - "Material Transfer for Manufacture"  → Start production (move RM → WIP)
//   - "Manufacture"                        → Finish production (declare FG)
// Returns: { success, data: { name } } — the submitted Stock Entry name.

import { NextRequest, NextResponse } from "next/server";
import { frappeClient } from "@/lib/frappe-client";
import { getRequestClient } from "@/lib/auth/resolve-user";

const MAKE_STOCK_ENTRY =
  "erpnext.manufacturing.doctype.work_order.work_order.make_stock_entry";

const ALLOWED_PURPOSES = new Set([
  "Material Transfer for Manufacture",
  "Manufacture",
]);

// ---------------------------------------------------------------------------
// 2Y-R2 P5 — Implicit warehouse backfill
// ---------------------------------------------------------------------------
// ERPNext's make_stock_entry copies warehouses FROM the Work Order into the SE
// rows. When the WO was created without a wip/fg warehouse (older WOs, or WOs
// made outside the SO cockpit), those rows come back with an empty
// `t_warehouse`, and `validate_warehouse` throws
// "Target warehouse is mandatory for row N". Rather than force the user to pick
// a warehouse, we resolve the canonical company warehouses server-side and
// fill ONLY the blanks — never overwriting anything ERPNext set. This keeps
// warehouse selection fully implicit at the exact point production starts.

/** Extract the company abbr from any warehouse name on the built SE
 *  (e.g. "Stores - P" → "P"). Used as a fallback when the Company lookup
 *  fails; the SE rows already carry live, correctly-suffixed names. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function abbrFromDoc(seDoc: any): string {
  const rows: any[] = Array.isArray(seDoc?.items) ? seDoc.items : [];
  const candidates = [
    ...rows.map((r) => r?.s_warehouse),
    ...rows.map((r) => r?.t_warehouse),
    seDoc?.from_warehouse,
    seDoc?.to_warehouse,
  ];
  for (const wn of candidates) {
    if (typeof wn === "string" && wn.includes(" - ")) {
      return wn.slice(wn.lastIndexOf(" - ") + 3);
    }
  }
  return String(seDoc?.company ?? "").slice(0, 3).toUpperCase();
}

/** Resolve the canonical `<Kind> - <abbr>` manufacturing warehouses for the
 *  company. Mirrors /api/stock/warehouses/defaults: abbr comes from the
 *  Company doc, with the SE's own warehouse suffix as a fallback. */
async function resolveCompanyWarehouseNames(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  company: string,
  fallbackAbbr: string,
): Promise<{ wip: string; fg: string; stores: string; rawMaterials: string }> {
  let abbr = fallbackAbbr;
  try {
    const resp = await client.call.get("frappe.client.get_value", {
      doctype: "Company",
      filters: JSON.stringify({ name: company }),
      fieldname: "abbr",
    });
    const got = (resp?.message ?? resp)?.abbr;
    if (got) abbr = String(got);
  } catch {
    // Company lookup failed — keep the abbr derived from the SE doc.
  }
  return {
    wip: `Work In Progress - ${abbr}`,
    fg: `Finished Goods - ${abbr}`,
    stores: `Stores - ${abbr}`,
    rawMaterials: `Raw Materials - ${abbr}`,
  };
}

/** Fill blank warehouses on the ERPNext-built SE, purpose-aware. Transfers
 *  move every row to WIP; Manufacture only targets the finished/scrap rows. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function backfillWarehouses(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  seDoc: any,
  purpose: string,
  wh: { wip: string; fg: string; stores: string; rawMaterials: string },
): void {
  const isTransfer = purpose === "Material Transfer for Manufacture";
  const target = isTransfer ? wh.wip || wh.fg : wh.fg || wh.wip;
  const source = wh.stores || wh.rawMaterials || wh.wip;

  const rows: any[] = Array.isArray(seDoc?.items) ? seDoc.items : [];
  for (const row of rows) {
    if (isTransfer) {
      // Every row is RM → WIP: both endpoints must be present.
      if (!row.t_warehouse) row.t_warehouse = target;
      if (!row.s_warehouse) row.s_warehouse = source;
    } else {
      // Manufacture: only finished/scrap rows carry a target warehouse;
      // consumption rows keep a source only (t_warehouse stays empty).
      if ((row.is_finished_item || row.is_scrap_item) && !row.t_warehouse) {
        row.t_warehouse = target;
      }
      if (!row.is_finished_item && !row.is_scrap_item && !row.s_warehouse) {
        row.s_warehouse = wh.wip || source;
      }
    }
  }

  // Header defaults ERPNext uses to fill any row it re-derives on validate.
  if (isTransfer && !seDoc.from_warehouse) seDoc.from_warehouse = source;
  if (!seDoc.to_warehouse) seDoc.to_warehouse = target;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
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
    const { name } = await params;
    if (!name) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing Parameter",
          details: "Work Order name is required.",
          statusCode: 400,
        },
        { status: 400 },
      );
    }
    const workOrderId = decodeURIComponent(name);

    const body = (await request.json().catch(() => ({}))) as {
      purpose?: string;
      qty?: number;
    };
    const purpose = body.purpose ?? "Material Transfer for Manufacture";
    if (!ALLOWED_PURPOSES.has(purpose)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid purpose",
          details: `purpose must be one of: ${[...ALLOWED_PURPOSES].join(", ")}`,
          statusCode: 400,
        },
        { status: 400 },
      );
    }

    // 1) Ask ERPNext to BUILD the Stock Entry — the same call the desk
    //    Start/Finish buttons make. `qty` is the fg_completed_qty (the qty to
    //    transfer/manufacture); when omitted ERPNext defaults to the WO's
    //    remaining qty. The returned dict is unsaved and fully linked.
    const args: Record<string, unknown> = {
      work_order_id: workOrderId,
      purpose,
    };
    if (typeof body.qty === "number" && body.qty > 0) {
      args.qty = body.qty;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const built: any = await (client.call as any).get(MAKE_STOCK_ENTRY, args);
    const seDoc = built?.message ?? built;
    if (!seDoc || typeof seDoc !== "object") {
      return NextResponse.json(
        {
          success: false,
          error: "Empty draft from ERPNext",
          details: `make_stock_entry returned no document for '${workOrderId}'.`,
          statusCode: 502,
        },
        { status: 502 },
      );
    }

    // 1b) Backfill any warehouse ERPNext left blank because the source Work
    //     Order carried no wip/fg warehouse. Without this, `validate_warehouse`
    //     throws "Target warehouse is mandatory for row N" on submit. We only
    //     fill blanks, using the canonical company warehouses, so warehouse
    //     selection stays implicit and automated.
    const wh = await resolveCompanyWarehouseNames(
      client,
      String(seDoc.company ?? ""),
      abbrFromDoc(seDoc),
    );
    backfillWarehouses(seDoc, purpose, wh);

    // 2) Insert + submit the fully-formed doc in one server call. ERPNext's
    //    `frappe.client.submit` parses the doc, `get_doc()`s it, and submits —
    //    inserting first because it's new. on_submit then runs
    //    `update_work_order_qty()` with the proper linkage, so the WO flips to
    //    "In Process" (transfer) / "Completed" (manufacture).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const submitted: any = await (client.call as any).post("frappe.client.submit", {
      doc: JSON.stringify(seDoc),
    });
    const result = submitted?.message ?? submitted;
    const seName: string | undefined = result?.name;

    return NextResponse.json(
      {
        success: true,
        data: { name: seName ?? null, purpose },
        message:
          purpose === "Manufacture"
            ? "Production finished — finished goods declared."
            : "Production started — materials transferred to WIP.",
      },
      { status: 201 },
    );
  } catch (error) {
    // 2S Part 1 — graceful error for UOM fraction constraint. ERPNext raises
    // "Quantity (0.6) cannot be a fraction. To allow this, disable 'Must be
    // Whole Number' in UOM." when a BOM raw material has a fractional qty but
    // its UOM has must_be_whole_number = 1. Surface a guided error with a deep
    // link to Stock → Settings → UOM instead of the generic "Something went wrong."
    const errMessage = error instanceof Error ? error.message : String(error);
    if (
      errMessage.includes("cannot be a fraction") ||
      errMessage.includes("Must be Whole Number")
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "UOMMustBeIntegerError",
          details:
            "A raw material's quantity is fractional but its UOM requires whole numbers. " +
            "Open Stock → Settings → UOM and untick 'Whole Number' for the affected UOM.",
          actions: [
            {
              label: "Open UOM Settings",
              href: "/stock/settings/uom",
            },
          ],
          statusCode: 422,
        },
        { status: 422 },
      );
    }
    const err = frappeClient.handleError(error);
    return NextResponse.json(err, { status: err.statusCode ?? 500 });
  }
}
