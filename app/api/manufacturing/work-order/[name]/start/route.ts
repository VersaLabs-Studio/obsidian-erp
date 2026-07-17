// app/api/manufacturing/work-order/[name]/start/route.ts
// 2Y-R3 — Start a Work Order: transitions from "Not Started" → "In Process".
// ERPNext requires calling the internal start_work method — direct PATCH on
// the status field is rejected ("Not allowed to change Status after submission").
//
// 4.1 B1 — hardened to the per-request user-scoped client (fail closed 401),
// matching every other lifecycle route. This is now the single canonical
// "Start" action, wired from BOTH the SO cockpit and the WO detail page, so it
// must run under the operator's own permissions, not the admin singleton.

import { NextRequest, NextResponse } from "next/server";
import { frappeClient } from "@/lib/frappe-client";
import { getRequestClient } from "@/lib/auth/resolve-user";

export const dynamic = "force-dynamic";

const START_WORK =
  "erpnext.manufacturing.doctype.work_order.work_order.start_work";

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
    // ERPNext whitelisted method: WorkOrder.start_work()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (client.call as any).post(START_WORK, {
      docname: decodeURIComponent(name),
    });
    return NextResponse.json({ success: true, data: result?.message ?? result });
  } catch (error) {
    const err = frappeClient.handleError(error);
    return NextResponse.json(err, { status: err.statusCode ?? 500 });
  }
}
