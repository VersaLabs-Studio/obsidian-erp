// app/api/sales/quotation/[name]/order/route.ts
// 5.1-A — One-click Quotation → Sales Order, the DESK-BUTTON way.
//
// ERPNext's own whitelisted mapper `make_sales_order(source_name)` (the
// function behind the desk "Create Sales Order" button) builds a fully
// formed, unsaved SO draft from the quotation — items, rates, taxes,
// party, and the linkage `quotation` fields that on_submit reads. We submit
// it in one `frappe.client.submit` call. (Mapper existence verified via a
// TypeError probe; the wizard redirect remains as the advanced path.)
//
// RBAC — per-request, sid-forwarded user client (fail closed 401). The
// user needs create+submit on Sales Order; ERPNext DocPerms enforce it.

import { NextRequest, NextResponse } from "next/server";
import { frappeClient } from "@/lib/frappe-client";
import { getRequestClient } from "@/lib/auth/resolve-user";

export const dynamic = "force-dynamic";

const MAKE_SALES_ORDER =
  "erpnext.selling.doctype.quotation.quotation.make_sales_order";

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
  const quotationId = decodeURIComponent(name);

  try {
    // 1) Fetch the quotation doc — we need `valid_till` for the delivery-date
    //    backfill below (the loosened 4.1 wizard leaves it optional).
    const qnDoc = await client.db.getDoc<{
      name: string;
      valid_till?: string;
      transaction_date?: string;
    }>("Quotation", quotationId);

    // 2) ERPNext builds the SO draft from the quotation.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const built: any = await (client.call as any).get(MAKE_SALES_ORDER, {
      source_name: quotationId,
    });
    const soDoc = built?.message ?? built;
    if (!soDoc || typeof soDoc !== "object") {
      return NextResponse.json(
        {
          success: false,
          error: "Empty draft from ERPNext",
          details: `make_sales_order returned no document for '${quotationId}'.`,
          statusCode: 502,
        },
        { status: 502 },
      );
    }

    // 3) 5.1-A2 — IMPLICIT delivery-date backfill. ERPNext's Sales Order
    //    requires `delivery_date` ("Please enter Delivery Date", 417) and
    //    neither the quotation nor the mapper guarantees one. Backfill from
    //    the quotation's valid_till when present, else transaction_date + 7
    //    days. (Chain verified live end-to-end: insert → submit → 200.)
    if (!soDoc.delivery_date) {
      const addDays = (days: number, iso?: string) =>
        iso
          ? new Date(new Date(iso).getTime() + days * 86_400_000)
              .toISOString()
              .slice(0, 10)
          : undefined;
      const resolved =
        qnDoc?.valid_till ||
        addDays(7, qnDoc?.transaction_date) ||
        addDays(7, new Date().toISOString().slice(0, 10));
      soDoc.delivery_date = resolved;
    }

    // 2) Insert + submit in one server call. on_submit flips the quotation
    //    status toward "Ordered" and links the SO back.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const submitted: any = await (client.call as any).post(
      "frappe.client.submit",
      { doc: JSON.stringify(soDoc) },
    );
    const result = submitted?.message ?? submitted;

    return NextResponse.json(
      {
        success: true,
        data: { sales_order: result?.name ?? null },
        message: `Sales Order ${result?.name ?? ""} created from ${quotationId}.`,
      },
      { status: 201 },
    );
  } catch (error) {
    const err = frappeClient.handleError(error);
    return NextResponse.json(err, { status: err.statusCode ?? 500 });
  }
}
