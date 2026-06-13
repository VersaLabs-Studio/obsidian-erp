// app/api/auth/me/route.ts
// Obsidian ERP v4.0 — Current-user endpoint (2P Part 5).
//
// Returns the real Frappe user + roles for the requesting session.
// 401 when no valid session is present. The client uses this in
// `useCurrentUser` and the layout guard. Caching: no-store (the
// user context may change on a logout / role reassignment).

import { NextRequest, NextResponse } from "next/server";
import { resolveUserContext } from "@/lib/auth/resolve-user";

export async function GET(request: NextRequest) {
  const ctx = await resolveUserContext(request);
  if (!ctx) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized",
        details: "No valid Frappe session cookie present.",
        statusCode: 401,
      },
      { status: 401 },
    );
  }
  return NextResponse.json({ success: true, data: ctx });
}
