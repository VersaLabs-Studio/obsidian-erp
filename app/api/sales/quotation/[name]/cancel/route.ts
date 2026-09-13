// app/api/sales/quotation/[name]/cancel/route.ts
// 5.1-A3 — Implicit cascade cancel: submitted Sales Orders generated from
// this quotation are cancelled first (depth-first, via
// lib/erp/cascade-cancel), then the quotation itself. The bare docstatus-2
// PUT was rejected with LinkExistsError while a submitted SO linked it
// ("Cancel the linked document first") — F5 finding, mirrored from the
// buying-side fix (4.1-C3).

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
    const cancelled = await cascadeCancel(client, "Quotation", docName);
    return NextResponse.json({
      success: true,
      data: { cancelled },
      message: `Quotation ${docName} cancelled` +
        (cancelled.length > 1
          ? ` along with ${cancelled.length - 1} linked document(s).`
          : "."),
    });
  } catch (error) {
    const err = frappeClient.handleError(error);
    return NextResponse.json(err, { status: err.statusCode ?? 500 });
  }
}
