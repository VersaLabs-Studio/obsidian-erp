// app/api/manufacturing/settings/provision/route.ts
// Obsidian ERP v4.0 — Manufacturing Settings Auto-Provision (2P Part 2.1).
//
// POST /api/manufacturing/settings/provision
//   Reads the active company's resolved warehouses and writes the
//   Manufacturing Settings single doc:
//     - default_wip_warehouse
//     - default_fg_warehouse
//     - backflush_raw_materials_based_on = "Material Transferred for Manufacture"
//     - material_consumption = 1
//
//   Idempotent — re-running is a no-op. Returns the resolved settings so
//   the caller can update its own state.
//
// 2P-FINAL Part A.3 — ADMIN GATE. Tenant-bootstrap route. Kept on the
// `frappeClient` service account (no sid-forwarding) so a fresh
// instance can be provisioned by the first admin who logs in. The
// gate prevents a regular user from elevating to admin scope by
// hitting the route.

import { NextRequest, NextResponse } from "next/server";
import { frappeClient } from "@/lib/frappe-client";
import {
  resolveUserContext,
  userHasRole,
} from "@/lib/auth/resolve-user";
import { getActiveCompany } from "@/lib/settings/company";

async function resolveWarehouses(company: string): Promise<{
  abbr: string;
  stores: string;
  wip: string;
  fg: string;
}> {
  // Reuse the same defaulting convention as
  // /api/stock/warehouses/defaults. We could call that route via HTTP,
  // but that re-does the abbr lookup + warehouse inserts; instead, we
  // resolve the abbr here and the warehouse names come from the same
  // helpers. The "warehouses exist" check is not repeated here — the
  // onboarding wizard runs /api/stock/warehouses/defaults first, which
  // is idempotent.
  let abbr = "";
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit any
    const raw: any = await (frappeClient.call as any).get(
      "frappe.client.get",
      { doctype: "Company", name: company },
    );
    const doc = raw?.message ?? raw;
    abbr = doc?.abbr ?? "";
  } catch {
    abbr = company.replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase();
  }
  if (!abbr) {
    abbr = company.replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase() || "CO";
  }
  return {
    abbr,
    stores: `Stores - ${abbr}`,
    wip: `Work In Progress - ${abbr}`,
    fg: `Finished Goods - ${abbr}`,
  };
}

export async function POST(request: NextRequest) {
  // 2P-FINAL Part A.3 — admin-gate the service-account path.
  const ctx = await resolveUserContext(request);
  if (!ctx) {
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
  if (!userHasRole(ctx, ["System Manager", "Manufacturing Manager"])) {
    return NextResponse.json(
      {
        success: false,
        error: "Forbidden",
        details: "System Manager or Manufacturing Manager role required to provision manufacturing settings.",
        statusCode: 403,
      },
      { status: 403 },
    );
  }

  const company = getActiveCompany();
  const wh = await resolveWarehouses(company);

  // Build the desired Manufacturing Settings patch. We `update` the
  // single existing doc; if none exists, ERPNext creates it on first
  // read. We re-fetch before writing to avoid clobbering concurrent
  // operator changes.
  const desired: Record<string, unknown> = {
    default_wip_warehouse: wh.wip,
    default_fg_warehouse: wh.fg,
    backflush_raw_materials_based_on: "Material Transferred for Manufacture",
    material_consumption: 1,
  };

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cur: any = await (frappeClient.call as any).get(
      "frappe.client.get",
      { doctype: "Manufacturing Settings", name: "Manufacturing Settings" },
    );
    const existing = cur?.message ?? cur ?? {};
    const merged = { ...existing, ...desired };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated: any = await (frappeClient.call as any).get(
      "frappe.client.save",
      { doc: { doctype: "Manufacturing Settings", name: "Manufacturing Settings", ...merged } },
    );
    const saved = updated?.message ?? updated;
    return NextResponse.json({ success: true, data: saved });
  } catch (err) {
    const error = frappeClient.handleError(err);
    return NextResponse.json(error, { status: error.statusCode ?? 500 });
  }
}
