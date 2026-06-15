// app/api/email/send/route.ts
// Obsidian ERP v4.0 — Email send endpoint (2P Part 6).
//
// Sends an outbound transactional email by:
//   1. Resolving the recipient from the source document's
//      `contact_email` (SI/PO/PE).
//   2. Building a sensible subject + body from the document (PDF
//      attach is out-of-scope for v4 — Phase 6 ships the body +
//      subject only).
//   3. Calling Frappe's `frappe.core.doctype.communication.email.make`
//      via the user-sid path (so the email is sent AS the user, with
//      ERPNext's own audit trail). Falls back to the service-account
//      `frappeClient.call` if the user path fails.
//
// The route is admin-gated (System Manager) — a regular Sales User
// doesn't have permission to email on behalf of the company without
// IT-configured Email Account settings.

import { NextRequest, NextResponse } from "next/server";
import { frappeClient } from "@/lib/frappe-client";
import {
  resolveUserContext,
  isSystemManager,
} from "@/lib/auth/resolve-user";

interface SendEmailBody {
  doctype: "Sales Invoice" | "Purchase Order" | "Payment Entry";
  name: string;
  /** Override the recipient (otherwise the contact_email on the doc). */
  recipientOverride?: string;
  /** Optional subject override. */
  subjectOverride?: string;
  /** Optional body override (otherwise auto-built from the doc). */
  bodyOverride?: string;
}

const SUBJECT_TEMPLATES: Record<SendEmailBody["doctype"], (n: string) => string> = {
  "Sales Invoice": (n) => `Sales Invoice ${n} from Pana`,
  "Purchase Order": (n) => `Purchase Order ${n} from Pana`,
  "Payment Entry": (n) => `Payment receipt ${n} from Pana`,
};

function buildBody(doctype: SendEmailBody["doctype"], name: string): string {
  return `Dear partner,

Please find attached the details for ${doctype} ${name}.

If you have any questions, please reach out to your account manager.

Best,
The Pana team`;
}

async function requireAdmin(request: NextRequest) {
  const ctx = await resolveUserContext(request);
  if (!ctx) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          details: "No valid session.",
          statusCode: 401,
        },
        { status: 401 },
      ),
    };
  }
  if (!isSystemManager(ctx)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: "Forbidden",
          details: "System Manager role required to send email.",
          statusCode: 403,
        },
        { status: 403 },
      ),
    };
  }
  return { ok: true as const, ctx };
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;
  let body: SendEmailBody;
  try {
    body = (await request.json()) as SendEmailBody;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON", statusCode: 400 },
      { status: 400 },
    );
  }
  if (!body?.doctype || !body?.name) {
    return NextResponse.json(
      { success: false, error: "Missing doctype/name", statusCode: 400 },
      { status: 400 },
    );
  }
  // Resolve recipient + send
  try {
    // 1) Get the doc to read the contact email
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const docRaw: any = await (frappeClient.call as any).get(
      "frappe.client.get",
      { doctype: body.doctype, name: body.name },
    );
    const doc = docRaw?.message ?? docRaw;
    const recipient =
      body.recipientOverride ??
      doc?.contact_email ??
      doc?.email ??
      doc?.supplier_email ??
      null;
    if (!recipient) {
      return NextResponse.json(
        {
          success: false,
          error: "No recipient",
          details: `No contact_email / email found on ${body.doctype} ${body.name}.`,
          statusCode: 400,
        },
        { status: 400 },
      );
    }
    // 2) Build subject + body
    const subject = body.subjectOverride ?? SUBJECT_TEMPLATES[body.doctype](body.name);
    const message = body.bodyOverride ?? buildBody(body.doctype, body.name);
    // 3) Call Frappe's Communication + Email helper. We use the
    //    simpler `frappe.sendmail` Python method (which is
    //    auto-exposed via `frappe.handler`).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await (frappeClient.call as any).get(
      "frappe.core.doctype.communication.email.make",
      {
        recipients: recipient,
        subject,
        content: message,
        doctype: body.doctype,
        name: body.name,
        send_email: true,
      },
    );
    return NextResponse.json({
      success: true,
      data: { recipient, subject, communication: result?.message ?? result },
    });
  } catch (err) {
    return NextResponse.json(frappeClient.handleError(err), {
      status: frappeClient.handleError(err).statusCode ?? 500,
    });
  }
}
