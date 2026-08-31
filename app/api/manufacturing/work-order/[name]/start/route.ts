// app/api/manufacturing/work-order/[name]/start/route.ts
// 2Y-R5 — Start a Work Order: transitions from "Not Started" → "In Process".
//
// WHY NOT `start_work` / a status PUT:
//   - The previous version called the internal method
//     `...work_order.work_order.start_work`, which does NOT exist as a
//     whitelisted API on this install → AttributeError 417 (2Y-R5 find).
//   - A direct PATCH of `status` is rejected by ERPNext on submitted docs
//     ("Not allowed to change Status after submission").
//   ERPNext's own desk "Start" button actually builds and submits a
//   "Material Transfer for Manufacture" Stock Entry; `on_submit` then credits
//   `material_transferred_for_manufacturing` and flips the WO to "In Process".
//   We do exactly that via the shared builder (`buildSeDoc`) — the same
//   proven path as /make-stock-entry — so no private WO invariants are
//   re-derived by hand.
//
// 4.1 B1 — per-request user-scoped client (fail closed 401). This is the
// canonical "Start" action wired from BOTH the SO cockpit and the WO detail
// page, so it must run under the operator's own permissions.

import { NextRequest, NextResponse } from "next/server";
import { frappeClient } from "@/lib/frappe-client";
import { getRequestClient } from "@/lib/auth/resolve-user";
import {
  buildAndSubmitStockEntry,
  extractRawMessage,
} from "@/lib/manufacturing/stock-entry-builder";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
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

  const { name } = await params;

  try {
    const workOrderId = decodeURIComponent(name);

    // Build + submit the Material Transfer SE with ERPNext's own doc builder.
    // 2Y-R6 — UOMMustBeIntegerError (fractional BOM qty vs whole-number UOM)
    // is resolved IMPLICITLY: the builder flips the UOM flag and retries, so
    // the operator never sees the config error. on_submit →
    // update_work_order_qty() advances the WO to "In Process".
    const { name: seName, fixedUoms } = await buildAndSubmitStockEntry(
      client,
      workOrderId,
      "Material Transfer for Manufacture",
    );

    return NextResponse.json({
      success: true,
      data: { name: seName ?? null, workOrder: workOrderId },
      message:
        "Production started — materials transferred to WIP." +
        (fixedUoms.length > 0
          ? ` (Auto-enabled fractional quantities for UOM: ${fixedUoms.join(", ")})`
          : ""),
    });
  } catch (error) {
    // Guided fallback for the UOM-fraction block when implicit resolution
    // couldn't run (e.g. no UOM write permission). extractRawMessage reads
    // _server_messages — Error.message alone is often just "There was an
    // error."
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
            "A raw material's quantity is fractional but its UOM requires whole numbers, and it could not be unlocked automatically. " +
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
