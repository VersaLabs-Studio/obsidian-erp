// app/api/manufacturing/work-order/[name]/complete/route.ts
// 2Y-R5 — Complete a Work Order from the SO cockpit once every Job Card is
// done. Transitions the submitted WO to "Completed" and declares finished
// goods.
//
// WHY NOT a status PUT:
//   The cockpit previously PUT { status: "Completed" } via the generic CRUD
//   factory. ERPNext rejects direct status writes on submitted docs with
//   UpdateAfterSubmitError: "Not allowed to change Status after submission
//   from Not Started to Completed" (417). ERPNext's own desk "Finish" button
//   instead builds and submits a "Manufacture" Stock Entry; `on_submit`
//   credits produced_qty / fg_completed_qty and derives status = "Completed"
//   when the WO quantity is fully manufactured. We do exactly that via the
//   shared builder (`buildSeDoc`) — the mirror of /start.
//
// RBAC — per-request user-scoped client (fail closed 401), consistent with
// every other lifecycle route.

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

    // Build + submit the Manufacture SE (FG declaration) with ERPNext's own
    // doc builder. 2Y-R6 — UOM fraction blocks are resolved implicitly by the
    // shared builder (flag flip + retry). on_submit → update_work_order_qty()
    // marks the WO Completed when fully produced.
    const { name: seName, fixedUoms } = await buildAndSubmitStockEntry(
      client,
      workOrderId,
      "Manufacture",
    );

    return NextResponse.json({
      success: true,
      data: { name: seName ?? null, workOrder: workOrderId },
      message:
        "Production finished — finished goods declared." +
        (fixedUoms.length > 0
          ? ` (Auto-enabled fractional quantities for UOM: ${fixedUoms.join(", ")})`
          : ""),
    });
  } catch (error) {
    // Same UOM-fraction guided fallback as /start — used only when implicit
    // resolution couldn't run (extractRawMessage reads _server_messages).
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
