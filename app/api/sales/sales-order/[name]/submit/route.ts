// app/api/sales/sales-order/[name]/submit/route.ts
// Submit endpoint for Sales Order — sets docstatus to 1 via Frappe

import { NextRequest, NextResponse } from "next/server";
import { frappeClient } from "@/lib/frappe-client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  try {
    const { name } = await params;

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing Parameter",
          details: "Document name is required",
        },
        { status: 400 },
      );
    }

    const decodedName = decodeURIComponent(name);

    // Use Frappe's built-in submit via RPC
    await frappeClient.call.post("frappe.client.submit", {
      doctype: "Sales Order",
      name: decodedName,
    });

    return NextResponse.json({
      success: true,
      message: "Sales Order submitted successfully",
    });
  } catch (error) {
    const errorResponse = frappeClient.handleError(error);
    return NextResponse.json(errorResponse, {
      status: errorResponse.statusCode || 500,
    });
  }
}
