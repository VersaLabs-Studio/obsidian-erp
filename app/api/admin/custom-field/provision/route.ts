// app/api/admin/custom-field/provision/route.ts
// Obsidian ERP v4.0 — Phase 2Y Part 1: Fiscal Custom Field Provisioning.
//
// Creates a "Pana Fiscal Serial Number" Custom Field on both Sales Invoice
// and Purchase Invoice DocTypes. Idempotent — safe to re-run.

import { NextRequest, NextResponse } from "next/server";
import { frappeClient } from "@/lib/frappe-client";
import { z } from "zod";

const provisionSchema = z.object({
  doctype: z.enum(["Sales Invoice", "Purchase Invoice"]),
});

const CUSTOM_FIELD_DEF = {
  fieldname: "pana_fs_number",
  label: "Fiscal Serial Number",
  fieldtype: "Data",
  insert_after: "po_no",
  reqd: 0,
  in_list_view: 1,
  in_standard_filter: 1,
  translatable: 0,
  description: "Government-issued fiscal serial number for this transaction (Ethiopia e-invoicing requirement).",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const call = frappeClient.call as any;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = provisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Validation Error", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { doctype } = parsed.data;

  try {
    // Check if the custom field already exists (idempotent)
    const filters = JSON.stringify([["dt", "=", doctype], ["fieldname", "=", CUSTOM_FIELD_DEF.fieldname]]);
    const existing = await call.get(
      `/api/resource/Custom Field?filters=${filters}&fields=["name"]&limit=1`
    ) as { data?: Array<{ name: string }> };

    if (existing?.data && existing.data.length > 0) {
      return NextResponse.json({
        success: true,
        data: { name: existing.data[0].name, doctype, fieldname: CUSTOM_FIELD_DEF.fieldname },
        message: `Custom Field "${CUSTOM_FIELD_DEF.fieldname}" already exists on ${doctype}`,
      });
    }

    // Create the Custom Field
    const result = await call.post(
      "/api/resource/Custom Field",
      { dt: doctype, ...CUSTOM_FIELD_DEF }
    ) as { data?: { name: string } };

    return NextResponse.json(
      {
        success: true,
        data: result?.data ?? { doctype, fieldname: CUSTOM_FIELD_DEF.fieldname },
        message: `Custom Field "${CUSTOM_FIELD_DEF.fieldname}" created on ${doctype}`,
      },
      { status: 201 },
    );
  } catch (err) {
    const errorResponse = frappeClient.handleError(err);
    return NextResponse.json(errorResponse, { status: errorResponse.statusCode ?? 500 });
  }
}

export async function GET() {
  const doctypes = ["Sales Invoice", "Purchase Invoice"] as const;
  const status: Record<string, { exists: boolean; name?: string }> = {};

  for (const dt of doctypes) {
    try {
      const filters = JSON.stringify([["dt", "=", dt], ["fieldname", "=", CUSTOM_FIELD_DEF.fieldname]]);
      const existing = await call.get(
        `/api/resource/Custom Field?filters=${filters}&fields=["name"]&limit=1`
      ) as { data?: Array<{ name: string }> };

      status[dt] = {
        exists: Boolean(existing?.data && existing.data.length > 0),
        name: existing?.data?.[0]?.name,
      };
    } catch {
      status[dt] = { exists: false };
    }
  }

  return NextResponse.json({ success: true, data: status });
}
