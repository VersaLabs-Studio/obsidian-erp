// app/api/accounting/purchase-invoice/[name]/cancel/route.ts
// 4.1-C3 — Implicit cascade cancel: submitted Payment Entries referencing
// this invoice are cancelled first (via lib/erp/cascade-cancel), then the
// invoice itself. ERPNext blocks the bare cancel while submitted PEs link
// to it ("Cancel the linked document first").

import { NextRequest, NextResponse } from "next/server";
import { frappeClient } from "@/lib/frappe-client";
import { getRequestClient } from "@/lib/auth/resolve-user";
import { cascadeCancel, unauthorizedResponse } from "@/lib/erp/cascade-cancel";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  const client = getRequestClient(request);
  if (!client) {
    return NextResponse.json(unauthorizedResponse(), { status: 401 });
  }

  const { name } = await params;
  const docName = decodeURIComponent(name);

  try {
    const cancelled = await cascadeCancel(client, "Purchase Invoice", docName);
    return NextResponse.json({
      success: true,
      data: { cancelled },
      message: `Purchase Invoice ${docName} cancelled` +
        (cancelled.length > 1
          ? ` along with ${cancelled.length - 1} linked document(s).`
          : "."),
    });
  } catch (error) {
    const err = frappeClient.handleError(error);
    return NextResponse.json(err, { status: err.statusCode ?? 500 });
  }
}
