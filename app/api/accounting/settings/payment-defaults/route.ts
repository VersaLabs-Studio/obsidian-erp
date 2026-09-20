// app/api/accounting/settings/payment-defaults/route.ts
// Obsidian ERP v4.1.1 — Global default Mode of Payment (D1).
//
// Reads/writes the default Mode of Payment stored on the Accounts Settings
// single via the custom field `custom_default_mode_of_payment`. The Mark-as-Paid
// dialog on SI/PI detail pages prefills from this config.
//
// 5.2-A — the live site was missing the custom field entirely (probe: the
// Accounts Settings doc has no `custom_default_mode_of_payment`, and Frappe
// silently drops unknown fields on a resource PUT — the settings page looked
// saved but stored nothing). PUT now ENSURES the Custom Field first
// (idempotent, mirroring the admin custom-field provision route pattern), so
// the write lands on any site without a manual desk step.
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

const CUSTOM_FIELD = {
  doctype: "Custom Field",
  dt: "Accounts Settings",
  fieldname: "custom_default_mode_of_payment",
  label: "Default Mode of Payment",
  fieldtype: "Link",
  options: "Mode of Payment",
  description:
    "Pre-fills the one-click Mark as Paid payment mode (and the payment/quick route).",
  translatable: 0,
};

/** Idempotent: create the Accounts Settings custom field if absent.
 *  Frappe's meta cache clears on Custom Field insert, so a write in the
 *  SAME request sees the new field. */
async function ensureModeOfPaymentField(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const found: any = await (client.call as any).get(
    "frappe.client.get_list",
    {
      doctype: "Custom Field",
      filters: JSON.stringify([
        ["dt", "=", "Accounts Settings"],
        ["fieldname", "=", CUSTOM_FIELD.fieldname],
      ]),
      fields: JSON.stringify(["name"]),
      limit_page_length: 1,
    },
  );
  const rows = found?.message ?? found;
  if (Array.isArray(rows) && rows[0]?.name) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (client.call as any).post("frappe.client.insert", {
    doc: JSON.stringify(CUSTOM_FIELD),
  });
}

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

    // 5.2-A — the write must land on a field that actually exists: ensure the
    // custom field first, else Frappe drops the unknown key silently.
    await ensureModeOfPaymentField(client);

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
