// app/api/sales/sales-order/[name]/submit/route.ts
// Submit endpoint for Sales Order — sets docstatus to 1 via Frappe
//
// 2P-FINAL Part A.3 — USER CLIENT. Submit must run as the user so
// Frappe's native submit perm is enforced (a user without "submit"
// perm on Sales Order gets 403 PermissionError → clean 403 via
// handleError). The service-account path would have let any
// authenticated user submit any SO regardless of role.

import { NextRequest, NextResponse } from "next/server";
import { frappeClient } from "@/lib/frappe-client";
import { getRequestClient } from "@/lib/auth/resolve-user";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  // 2P-FINAL Part A.3 — user-scoped client, fail closed (401).
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

    // Use Frappe's built-in submit via RPC, authenticated as the user.
    await (client.call as any).post("frappe.client.submit", {
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
