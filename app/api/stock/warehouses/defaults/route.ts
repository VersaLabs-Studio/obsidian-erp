// app/api/stock/warehouses/defaults/route.ts
// Obsidian ERP v4.0 — Implicit Warehouse Resolver (2P Part 2.1).
//
// Returns the three default warehouse names for the active company:
//   - Stores      (raw materials + finished goods awaiting shipment)
//   - WIP         (work-in-progress, between start and finish)
//   - FG          (finished goods, ready to ship)
//
// Behavior:
//   1. Fetch the Company doc to get its `abbr` (the warehouse-name
//      suffix ERPNext expects — e.g. "PAB" for "Pana Business").
//   2. Compute the three expected names (`Stores - <abbr>`, etc.).
//   3. Query the Warehouse doctype for existing docs with those names.
//      For each missing one, INSERT it (idempotent — `frappe.client.insert`
//      raises DuplicateEntryError on re-run, which we swallow).
//   4. Return the resolved names so `lib/settings/warehouses.ts` can cache
//      them. The Manufacturing Settings auto-config (default WIP/FG +
//      backflush) is handled by a sibling route (`/api/manufacturing/
//      settings/provision`) — kept separate to keep this route pure
//      (read or insert-warehouses, no settings mutation).
//
// Why this is separate from the existing `/api/stock/warehouse` CRUD:
//   - That route is the public Warehouse list/create for the Warehouses
//     admin page. This route is a SPECIFIC bootstrapper for the implicit
//     warehouse model — it KNOWS the three canonical names and the abbr
//     suffix convention. Don't duplicate the resolver in CRUD.
//
// 2P-FINAL Part A.3 — ADMIN GATE. This is a tenant-bootstrap route; it
// needs to create Warehouses the user may not have write-permission for
// on a fresh tenant. Per the rule of thumb: "if the action is something
// the logged-in user is doing → user client. If it's tenant bootstrap /
// admin tooling → service account BEHIND A ROLE GATE." So we keep the
// `frappeClient` service account (no sid-forwarding), but require
// System Manager (or Stock Manager) to reach the elevated path. Without
// the gate a regular Sales User could create warehouses.

import { NextRequest, NextResponse } from "next/server";
import { frappeClient } from "@/lib/frappe-client";
import {
  resolveUserContext,
  userHasRole,
} from "@/lib/auth/resolve-user";
import { getActiveCompany } from "@/lib/settings/company";

interface CompanyDoc {
  name: string;
  abbr: string;
}

interface WarehouseList {
  name: string;
  warehouse_name: string;
}

const STORES = (abbr: string) => `Stores - ${abbr}`;
const WIP = (abbr: string) => `Work In Progress - ${abbr}`;
const FG = (abbr: string) => `Finished Goods - ${abbr}`;
// 2R Part 4 — Raw Materials is provisioned like the others; some tenants
// (Pana) have it, others don't. We best-effort provision and surface
// it to the Receive Materials modal as a secondary warehouse option.
const RAW_MATERIALS = (abbr: string) => `Raw Materials - ${abbr}`;

async function fetchCompanyAbbr(company: string): Promise<string> {
  // The Company doc carries `abbr` — the suffix ERPNext appends to
  // child warehouses. We use a 3-character abbreviation of the company
  // name as a last-resort fallback.
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: any = await (frappeClient.call as any).get(
      "frappe.client.get",
      { doctype: "Company", name: company },
    );
    const doc: CompanyDoc | undefined = raw?.message ?? raw;
    if (doc?.abbr) return String(doc.abbr);
  } catch {
    // network or 404 — fall through
  }
  // Fallback: uppercase first 3 letters. Better than nothing for
  // pre-onboarding states.
  return company.replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase() || "CO";
}

async function findWarehouse(
  abbr: string,
  expectedName: string,
): Promise<WarehouseList | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: any = await (frappeClient.call as any).get(
      "frappe.client.get_list",
      {
        doctype: "Warehouse",
        filters: [["warehouse_name", "=", expectedName]],
        fields: ["name", "warehouse_name"],
        limit: 1,
      },
    );
    const list = (raw?.message ?? raw) as WarehouseList[] | undefined;
    if (Array.isArray(list) && list.length > 0) {
      return list[0] ?? null;
    }
  } catch {
    // list endpoint 404'd or auth failed — fall through
  }
  return null;
}

async function createWarehouseIfMissing(
  company: string,
  abbr: string,
  name: string,
  isGroup = false,
): Promise<string> {
  const existing = await findWarehouse(abbr, name);
  if (existing) return existing.name;
  try {
    // 2U §5a — FIX: use POST instead of GET for inserts.
    // The previous code used `.get("frappe.client.insert", ...)` which sends
    // an HTTP GET to `frappe.client.insert`; Frappe requires POST, causing
    // `is_valid_http_method` → PermissionError (403 → 500). We now POST to
    // the Frappe REST API via a direct fetch using the service-account client's
    // ERP_API_URL and auth headers.
    const erpApiUrl = (process.env.ERP_API_URL || "").replace(/\/+$/, "");
    const apiKey = process.env.ERP_API_KEY || "";
    const apiSecret = process.env.ERP_API_SECRET || "";
    let created: { name?: string } | null = null;
    if (erpApiUrl && apiKey && apiSecret) {
      const insertRes = await fetch(`${erpApiUrl}/api/method/frappe.client.insert`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `token ${apiKey}:${apiSecret}`,
        },
        body: JSON.stringify({
          doc: {
            doctype: "Warehouse",
            warehouse_name: name,
            company,
            is_group: isGroup ? 1 : 0,
            disabled: 0,
          },
        }),
      });
      if (insertRes.ok) {
        const json = await insertRes.json();
        created = json?.message ?? json;
      }
    }
    if (created?.name) return created.name;
  } catch (err) {
    // DuplicateEntryError (or any other race) → re-resolve.
    const existing2 = await findWarehouse(abbr, name);
    if (existing2) return existing2.name;
    throw err;
  }
  // Fallback: return the computed name when creation is not configured or fails
  return name;
}

export async function GET(request: NextRequest) {
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
  if (!userHasRole(ctx, ["System Manager", "Stock Manager"])) {
    return NextResponse.json(
      {
        success: false,
        error: "Forbidden",
        details: "System Manager or Stock Manager role required to bootstrap warehouses.",
        statusCode: 403,
      },
      { status: 403 },
    );
  }

  const company = getActiveCompany();
  const abbr = await fetchCompanyAbbr(company);

  // Provision (idempotent) the canonical warehouses. We use a best-
  // effort create-if-missing — a create that fails (e.g. on a multi-
  // tenant instance where the Warehouse route is the only allowed
  // entry point) leaves the resolution to the client fallback.
  const storesName = await createWarehouseIfMissing(company, abbr, STORES(abbr));
  const wipName = await createWarehouseIfMissing(company, abbr, WIP(abbr));
  const fgName = await createWarehouseIfMissing(company, abbr, FG(abbr));
  // 2R Part 4 — Raw Materials is best-effort (we wrap in try/catch so a
  // failure doesn't block the three canonical names).
  let rawMaterialsName: string | undefined;
  try {
    rawMaterialsName = await createWarehouseIfMissing(
      company,
      abbr,
      RAW_MATERIALS(abbr),
    );
  } catch {
    rawMaterialsName = undefined;
  }

  return NextResponse.json({
    success: true,
    data: {
      abbr,
      stores: storesName,
      wip: wipName,
      fg: fgName,
      rawMaterials: rawMaterialsName,
    },
  });
}
