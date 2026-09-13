// app/api/stock/delivery-note/[name]/cancel/route.ts
// 5.1-A3 — Implicit cascade cancel: submitted Sales Invoices raised from
// this Delivery Note are cancelled first (via lib/erp/cascade-cancel), then
// the DN itself. Mirrors the PR cancel route (4.1-C3).

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
    const cancelled = await cascadeCancel(client, "Delivery Note", docName);
    return NextResponse.json({
      success: true,
      data: { cancelled },
      message: `Delivery Note ${docName} cancelled` +
        (cancelled.length > 1
          ? ` along with ${cancelled.length - 1} linked document(s).`
          : "."),
    });
  } catch (error) {
    const err = frappeClient.handleError(error);
    return NextResponse.json(err, { status: err.statusCode ?? 500 });
  }
}
