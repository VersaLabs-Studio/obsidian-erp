// app/api/accounting/settings/payment-defaults/route.ts
// Obsidian ERP v4.1.1 — Global default Mode of Payment (D1).
//
// Reads/writes the default Mode of Payment stored on the Accounts Settings
// single via the custom field `custom_default_mode_of_payment`. The Mark-as-Paid
// dialog on SI/PI detail pages prefills from this config.
//
// 2U §B — BOUNDARY FIX (mirrored from warehouse-defaults/route.ts). The client
// lib (`lib/accounting/payment-defaults.ts`) is "use client" and MUST NOT
// import the server-only `frappeClient` singleton. All ERPNext access goes
// through THIS route, on the server, where the env vars exist.
//
// User-scoped client: ERPNext runs its native DocPerm engine for the
// requesting user. Writing the single requires the appropriate role
// (System Manager / Accounts Manager); a user without it gets a clean 403
// surfaced through `handleError` rather than a silent service-account write.

import { NextRequest, NextResponse } from "next/server";
import { getRequestClient } from "@/lib/auth/resolve-user";
import { frappeClient } from "@/lib/frappe-client";

function unauthorized() {
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

export async function GET(request: NextRequest) {
  const client = getRequestClient(request);
  if (!client) return unauthorized();
  try {
    const accounts = await client.db.getDoc(
      "Accounts Settings",
      "Accounts Settings",
    );
    const a = (accounts ?? {}) as Record<string, unknown>;
    return NextResponse.json({
      success: true,
      data: {
        defaultModeOfPayment: String(a.custom_default_mode_of_payment ?? ""),
      },
    });
  } catch (error) {
    const err = frappeClient.handleError(error);
    return NextResponse.json(err, { status: err.statusCode ?? 500 });
  }
}

export async function PUT(request: NextRequest) {
  const client = getRequestClient(request);
  if (!client) return unauthorized();
  try {
    const body = (await request.json()) as {
      defaultModeOfPayment?: string;
    };

    // ERPNext clears a Link field when sent null (an empty string can trip
    // "field does not exist" link validation on some builds), so coalesce
    // blanks to null.
    const orNull = (v?: string) => (v && v.trim() ? v.trim() : null);

    await client.db.updateDoc(
      "Accounts Settings",
      "Accounts Settings",
      {
        custom_default_mode_of_payment: orNull(body.defaultModeOfPayment),
      },
    );

    return NextResponse.json({
      success: true,
      data: {
        defaultModeOfPayment: body.defaultModeOfPayment ?? "",
      },
    });
  } catch (error) {
    const err = frappeClient.handleError(error);
    return NextResponse.json(err, { status: err.statusCode ?? 500 });
  }
}
