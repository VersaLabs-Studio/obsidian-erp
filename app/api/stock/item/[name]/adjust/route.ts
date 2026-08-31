// app/api/stock/item/[name]/adjust/route.ts
// Obsidian ERP v4.1.1 — Quick-adjust stock for an item (E1).
//
// Builds + submits a single-row Stock Reconciliation { purpose:
// "Stock Reconciliation", items: [{ item_code, warehouse, qty: <target>,
// valuation_rate: <current bin> }] }. Mirrors the stock-reconciliation/new
// row shape.
//
// RBAC: per-request, sid-forwarded user client (fail closed 401). The user
// needs create+submit on Stock Reconciliation.

import { NextRequest, NextResponse } from "next/server";
import { frappeClient } from "@/lib/frappe-client";
import { getRequestClient } from "@/lib/auth/resolve-user";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  const client = getRequestClient(request);
  if (!client) {
    return NextResponse.json(
      { success: false, error: "Unauthorized", details: "No valid session.", statusCode: 401 },
      { status: 401 },
    );
  }

  const { name } = await params;
  if (!name) {
    return NextResponse.json(
      { success: false, error: "Missing Parameter", details: "Item name is required.", statusCode: 400 },
      { status: 400 },
    );
  }
  const itemName = decodeURIComponent(name);

  const body = (await request.json().catch(() => ({}))) as {
    warehouse: string;
    qty: number;
    valuation_rate?: number;
  };

  if (!body.warehouse || body.qty == null) {
    return NextResponse.json(
      { success: false, error: "Missing fields", details: "warehouse and qty are required.", statusCode: 400 },
      { status: 400 },
    );
  }

  try {
    // Build a single-row Stock Reconciliation doc.
    const srDoc = {
      doctype: "Stock Reconciliation",
      purpose: "Stock Reconciliation",
      company: "Pana", // TODO: resolve from active company / session
      items: [
        {
          item_code: itemName,
          warehouse: body.warehouse,
          qty: body.qty,
          valuation_rate: body.valuation_rate ?? 0,
          doctype: "Stock Reconciliation Item",
        },
      ],
    };

    // Insert + submit in one call.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const submitted: any = await (client.call as any).post(
      "frappe.client.submit",
      { doc: JSON.stringify(srDoc) },
    );
    const result = submitted?.message ?? submitted;

    return NextResponse.json(
      { success: true, data: { stock_reconciliation: result?.name ?? null } },
      { status: 201 },
    );
  } catch (error) {
    const err = frappeClient.handleError(error);
    return NextResponse.json(err, { status: err.statusCode ?? 500 });
  }
}
