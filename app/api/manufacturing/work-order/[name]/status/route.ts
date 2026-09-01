// app/api/manufacturing/work-order/[name]/status/route.ts
// 2Z-R8 — Work Order Stop / Resume / Close via ERPNext's OWN whitelisted
// methods (desk-button parity).
//
// WHY this route exists: the detail page previously did a direct REST PUT of
// `status` on SUBMITTED Work Orders. ERPNext rejects that with
// UpdateAfterSubmitError ("Not allowed to change Status after submission") —
// the same class of failure that broke cockpit Complete (2Y-R5). The desk's
// Stop/Resume/Close buttons instead call these whitelisted module methods,
// which use db_set internally and run the proper side effects
// (reserve/unreserve updates, status derivation):
//   stop   → erpnext...work_order.stop_unstop(work_order, "Stopped")
//   resume → erpnext...work_order.stop_unstop(work_order, "Resumed")
//            (ERPNext re-derives the resting status — "In Process"/"Not
//             Started" — from production data; we do NOT hand-pick it)
//   close  → erpnext...work_order.close_work_order(work_order, "Closed")
// (Signatures verified live: TypeError probes confirmed both methods exist
// and take (work_order, status); set_status/update_status do NOT exist as
// whitelisted methods on this install.)
//
// RBAC — per-request user-scoped client (fail closed 401). The requesting
// user needs write access on Work Order; Frappe enforces it on the call.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { frappeClient } from "@/lib/frappe-client";
import { getRequestClient } from "@/lib/auth/resolve-user";

export const dynamic = "force-dynamic";

const STOP_UNSTOP =
  "erpnext.manufacturing.doctype.work_order.work_order.stop_unstop";
const CLOSE_WORK_ORDER =
  "erpnext.manufacturing.doctype.work_order.work_order.close_work_order";

const BodySchema = z.object({
  action: z.enum(["stop", "resume", "close"]),
});

/** action → whitelisted method + status argument (desk-button parity). */
const ACTION_MAP: Record<
  "stop" | "resume" | "close",
  { method: string; status: string }
> = {
  stop: { method: STOP_UNSTOP, status: "Stopped" },
  resume: { method: STOP_UNSTOP, status: "Resumed" },
  close: { method: CLOSE_WORK_ORDER, status: "Closed" },
};

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
  const workOrderId = decodeURIComponent(name);

  const parsed = BodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Validation Error",
        details: "Body must be { action: 'stop' | 'resume' | 'close' }.",
        statusCode: 400,
      },
      { status: 400 },
    );
  }
  const { method, status } = ACTION_MAP[parsed.data.action];

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await (client.call as any).post(method, {
      work_order: workOrderId,
      status,
    });
    const message = result?.message ?? result;

    // Re-fetch so the response reflects the DERIVED status (resume may land
    // on "In Process" or "Not Started" depending on production progress).
    const wo = await client.db.getDoc<{ name: string; status: string }>(
      "Work Order",
      workOrderId,
    );

    return NextResponse.json({
      success: true,
      data: { name: wo?.name ?? workOrderId, status: wo?.status ?? String(message) },
      message: `Work Order ${workOrderId} is now ${wo?.status ?? message}.`,
    });
  } catch (error) {
    const err = frappeClient.handleError(error);
    return NextResponse.json(err, { status: err.statusCode ?? 500 });
  }
}
