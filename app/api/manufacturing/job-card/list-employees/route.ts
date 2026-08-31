// app/api/manufacturing/job-card/list-employees/route.ts
// Obsidian ERP v4.2 — Composite Job Card list: parent rows + `employee` child
// data in one response.
//
// WHY this route exists: Frappe's parent getDocList cannot return child-table
// fields (requesting `employee` in the factory list handler 500s — see the
// 2Y-R2 note in the SO cockpit). The manufacturing Job Card list is the shop
// floor's primary tool — each card MUST show its assigned employee so a
// manufacturing user can instantly find the Job Cards assigned to them. This
// route fetches the parent rows once, then merges the `employee` child rows
// (fetched from the FULL doc per card, bounded) so the page does one network
// round-trip instead of one full-doc fetch per card.
//
// Same query contract as the factory list handler (fields / filters / search /
// order_by / limit / offset) so the page keeps its useFrappeList shape.

import { NextRequest, NextResponse } from "next/server";
import { frappeClient } from "@/lib/frappe-client";
import { getRequestClient } from "@/lib/auth/resolve-user";

export const dynamic = "force-dynamic";

// Parent columns the shop-floor list needs. `employee` is merged below.
const PARENT_FIELDS = [
  "name",
  "work_order",
  "operation",
  "workstation",
  "status",
  "company",
  "posting_date",
  "for_quantity",
  "total_completed_qty",
  "process_loss_qty",
  "production_item",
  "item_name",
  "docstatus",
  "creation",
];

const MAX_LIMIT = 100;

export async function GET(request: NextRequest) {
  // 4.1 B1 — per-request user-scoped client. Fail closed (401) when no
  // session is present, matching every other manufacturing route.
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
    const { searchParams } = new URL(request.url);

    // -- Parse the same query contract useFrappeList sends -------------------
    let fields: string[] = PARENT_FIELDS;
    if (searchParams.get("fields")) {
      const requested = JSON.parse(searchParams.get("fields")!) as string[];
      if (Array.isArray(requested) && requested.length > 0) {
        // Keep only safe parent columns; `employee` is always merged anyway.
        fields = requested.filter((f) => PARENT_FIELDS.includes(f));
        if (fields.length === 0) fields = PARENT_FIELDS;
      }
    }

    let filters: [string, string, unknown][] = [];
    if (searchParams.get("filters")) {
      filters = JSON.parse(searchParams.get("filters")!) as [string, string, unknown][];
    }

    const search = searchParams.get("search");
    if (search) {
      filters.push(["name", "like", `%${search}%`]);
    }

    let orderBy: { field: string; order: "asc" | "desc" } = {
      field: "creation",
      order: "desc",
    };
    const orderByStr = searchParams.get("order_by");
    if (orderByStr) {
      const lastSpace = orderByStr.lastIndexOf(" ");
      if (lastSpace !== -1) {
        orderBy = {
          field: orderByStr.slice(0, lastSpace),
          order: orderByStr.slice(lastSpace + 1) as "asc" | "desc",
        };
      }
    }

    const limit = Math.min(
      parseInt(searchParams.get("limit") || "100", 10) || 100,
      MAX_LIMIT,
    );
    const offset = parseInt(searchParams.get("offset") || "0", 10) || 0;

    // -- Step 1: parent rows (no child fields — they 500 on getDocList) ------
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: any[] = (await client.db.getDocList("Job Card", {
      fields,
      filters: filters as any,
      orderBy,
      limit,
      start: offset,
    } as any)) as any[];

    if (rows.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    // -- Step 2: full doc per card (bounded, resilient) to read `employee` ---
    // The `employee` child rows carry { employee, employee_name }. We fetch
    // the full docs server-side so the client never issues N per-card calls.
    const fullDocs = await Promise.allSettled(
      rows.map((r) => client.db.getDoc("Job Card", r.name)),
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const merged: any[] = rows.map((row, i) => {
      const settled = fullDocs[i];
      if (settled.status !== "fulfilled") return { ...row, employee: [] };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const doc = settled.value as any;
      return {
        ...row,
        employee: Array.isArray(doc?.employee) ? doc.employee : [],
      };
    });

    // 2Y-R6 — Backfill `employee_name` for rows stored without it (e.g.
    // assigned before the name was captured). Without this the shop-floor
    // list shows raw employee CODES on chips and in the assignee filter.
    // One batched lookup covers every card on the page.
    const employeeIds = [
      ...new Set(
        merged.flatMap((row) =>
          Array.isArray(row.employee)
            ? row.employee
                .map((e: { employee?: string }) => e?.employee)
                .filter(Boolean)
            : [],
        ),
      ),
    ] as string[];

    if (employeeIds.length > 0) {
      try {
        const employees: Array<{ name: string; employee_name?: string }> =
          await client.db.getDocList("Employee", {
            fields: ["name", "employee_name"],
            filters: [["name", "in", employeeIds]],
            limit: employeeIds.length,
          });
        const nameById = new Map(
          employees.map((e) => [e.name, e.employee_name || e.name]),
        );
        for (const row of merged) {
          if (!Array.isArray(row.employee)) continue;
          row.employee = row.employee.map(
            (e: { employee?: string; employee_name?: string }) => ({
              ...e,
              employee_name:
                e.employee_name || nameById.get(String(e.employee)) || e.employee,
            }),
          );
        }
      } catch {
        // Name lookup is cosmetic — never fail the list over it. Rows keep
        // whatever employee_name they carried (or the raw ID).
      }
    }

    return NextResponse.json({ success: true, data: merged });
  } catch (error) {
    const errorResponse = frappeClient.handleError(error);
    return NextResponse.json(errorResponse, {
      status: errorResponse.statusCode || 500,
    });
  }
}
