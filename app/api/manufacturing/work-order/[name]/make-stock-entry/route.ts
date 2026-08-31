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
// 2Y-R5 — doc building (ERPNext's own make_stock_entry + implicit warehouse
// backfill) now lives in the shared builder so the START/STOP lifecycle route
// reuses the exact same logic. Semantics unchanged from this route's 2P
// live-fix version; only the submission flow ("insert+submit in one shot")
// stays route-local here.
import {
  buildAndSubmitStockEntry,
  extractRawMessage,
} from "@/lib/manufacturing/stock-entry-builder";

const ALLOWED_PURPOSES = new Set([
  "Material Transfer for Manufacture",
  "Manufacture",
]);

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

    // 1+2) Build + submit via the shared builder. 2Y-R6 — UOM fraction blocks
    //    are resolved IMPLICITLY (flag flip + retry) instead of erroring.
    //    on_submit then runs `update_work_order_qty()` with the proper
    //    linkage, so the WO flips to "In Process" (transfer) / "Completed"
    //    (manufacture).
    const { name: seName, fixedUoms } = await buildAndSubmitStockEntry(
      client,
      workOrderId,
      purpose as "Material Transfer for Manufacture" | "Manufacture",
      typeof body.qty === "number" && body.qty > 0 ? body.qty : undefined,
    );

    return NextResponse.json(
      {
        success: true,
        data: { name: seName ?? null, purpose },
        message:
          (purpose === "Manufacture"
            ? "Production finished — finished goods declared."
            : "Production started — materials transferred to WIP.") +
          (fixedUoms.length > 0
            ? ` (Auto-enabled fractional quantities for UOM: ${fixedUoms.join(", ")})`
            : ""),
      },
      { status: 201 },
    );
  } catch (error) {
    // 2S Part 1 — graceful error for UOM fraction constraint. ERPNext raises
    // "Quantity (0.6) cannot be a fraction. To allow this, disable 'Must be
    // Whole Number' in UOM." when a BOM raw material has a fractional qty but
    // its UOM has must_be_whole_number = 1. 2Y-R6 — this is now only the
    // FALLBACK: buildAndSubmitStockEntry resolves it implicitly first; we get
    // here when the UOM couldn't be unlocked (e.g. permissions). Surface a
    // guided error with a deep link to Stock → Settings → UOM.
    const errMessage = extractRawMessage(error);
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
