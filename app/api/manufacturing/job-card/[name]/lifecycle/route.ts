// app/api/manufacturing/job-card/[name]/lifecycle/route.ts
// Obsidian ERP v4.2.1 — Job Card lifecycle (Start / Complete) server route.
//
// WHY this route exists: the client previously drove Start/Complete through the
// generic REST PUT (`db.updateDoc` → `PUT /api/resource/Job Card/{name}`).
// Two separate problems made Complete fail:
//   1. The client sent `time_logs` WITHOUT each row's `name`, so Frappe treated
//      every row as a new row and appended duplicates — the open time_log was
//      never closed.
//   2. Even with `name` preserved, ERPNext's Job Card controller DERIVES
//      `status` in validate() → set_status(): for docstatus 0 with any
//      time_logs present, status is ALWAYS "Work In Progress" (any explicit
//      status is overridden). "Completed" is ONLY reached when docstatus == 1
//      (submitted) AND for_quantity <= total_completed_qty + process_loss_qty.
//      So a plain PUT can never complete a Job Card — it must be SUBMITTED.
//
// This route fetches the FRESH doc server-side, closes the open time_log by
// preserving its real `name`, saves via REST PUT, then SUBMITS the Job Card
// (docstatus 0 → 1) so the controller derives "Completed". One fix point
// serves both the SO cockpit and the JC detail page.

import { NextRequest, NextResponse } from "next/server";
import { frappeClient } from "@/lib/frappe-client";
import { getRequestClient } from "@/lib/auth/resolve-user";
import { buildAndSubmitStockEntry } from "@/lib/manufacturing/stock-entry-builder";
import type { JobCard } from "@/types/doctype-types";

export const dynamic = "force-dynamic";

interface LifecycleBody {
  action: "start" | "complete" | "assign_employee";
  /** Required for action = "assign_employee". */
  employeeId?: string;
  /** Optional display name captured from the selector label. */
  employeeName?: string;
}

/** WO statuses that must never be auto-completed. */
const WO_TERMINAL_STATUSES = new Set(["Completed", "Stopped", "Closed", "Cancelled"]);

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
  const docName = decodeURIComponent(name);

  let action: "start" | "complete" | "assign_employee";
  let employeeId: string | undefined;
  let employeeName: string | undefined;
  try {
    const body = (await request.json().catch(() => ({}))) as LifecycleBody;
    action = body.action;
    employeeId = body.employeeId;
    employeeName = body.employeeName;
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Bad Request",
        details:
          "Body must be JSON with { action: 'start' | 'complete' | 'assign_employee', employeeId? }.",
      },
      { status: 400 },
    );
  }

  if (action !== "start" && action !== "complete" && action !== "assign_employee") {
    return NextResponse.json(
      {
        success: false,
        error: "Bad Request",
        details: `action must be 'start', 'complete' or 'assign_employee', got '${action}'.`,
      },
      { status: 400 },
    );
  }

  if (action === "assign_employee" && !employeeId) {
    return NextResponse.json(
      {
        success: false,
        error: "Bad Request",
        details: "assign_employee requires { employeeId }.",
      },
      { status: 400 },
    );
  }

  try {
    // 1) Fetch the FRESH doc so we never operate on stale time_logs.
    const doc = await client.db.getDoc<JobCard>("Job Card", docName);
    if (!doc || !doc.name) {
      return NextResponse.json(
        {
          success: false,
          error: "Not Found",
          details: `Job Card ${docName} not found.`,
          statusCode: 404,
        },
        { status: 404 },
      );
    }

    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    const forQty = Number(doc.for_quantity ?? 0);
    const existingLogs = Array.isArray(doc.time_logs) ? doc.time_logs : [];

    // Resolve the assigned employee (first row of the `employee` child table).
    const employeeRows = Array.isArray(doc.employee) ? doc.employee : [];
    const assignedEmployeeId =
      (employeeRows[0] as { employee?: string } | undefined)?.employee || "";

    let result: JobCard;

    if (action === "assign_employee") {
      // 2Y-R6b — Employee changes go through THIS route because the generic
      // REST PUT fails on submitted Job Cards: replacing the `employee` table
      // with brand-new child rows trips Frappe's child-permission check
      // ("No permission for Job Card Time Log" / "Please specify a valid
      // parent DocType"). The Start/Complete path proved that UPDATING
      // existing child rows by their real `name` passes those checks — so we
      // swap the link IN PLACE on the first row when one exists, and only
      // append a fresh row for drafts with no assignment yet.
      const first = employeeRows[0] as
        | { name?: string; employee_name?: string }
        | undefined;

      const nextEmployeeRows: unknown[] =
        first?.name && employeeId
          ? employeeRows.map((r: unknown, i: number) =>
              i === 0
                ? {
                    ...(r as object),
                    employee: employeeId,
                    ...(employeeName ? { employee_name: employeeName } : {}),
                  }
                : r,
            )
          : [
              ...employeeRows,
              {
                employee: employeeId,
                ...(employeeName ? { employee_name: employeeName } : {}),
              },
            ];

      await client.db.updateDoc("Job Card", docName, {
        employee: nextEmployeeRows,
      });
      result = await client.db.getDoc<JobCard>("Job Card", docName);

      return NextResponse.json({
        success: true,
        data: result,
        message: `Assigned ${
          employeeName || employeeId
        } to ${docName}`,
      });
    }

    let time_logs: unknown[];
    let total_completed_qty: number | undefined;

    if (action === "start") {
      if (!assignedEmployeeId) {
        return NextResponse.json(
          {
            success: false,
            error: "ValidationError",
            details: "Assign an employee before starting this Job Card.",
            statusCode: 412,
          },
          { status: 412 },
        );
      }
      // Append a new OPEN time_log (no to_time). set_status() derives the
      // status to "Work In Progress" automatically.
      time_logs = [
        ...(existingLogs as unknown[]),
        { employee: assignedEmployeeId, from_time: now, completed_qty: 0 },
      ];
    } else {
      // complete: close EVERY open time_log (the ones with no to_time) —
      // mirrors ERPNext's native add_time_log(complete_time) which closes all
      // open rows. completed_qty is NORMALIZED: the LAST open row carries
      // forQty, every other row carries 0. This guarantees the controller's
      // validate_time_logs() sums to for_quantity, so validate_job_card()
      // passes on submit — and it self-heals duplicate/partial rows left by
      // earlier buggy attempts. If no log is open, append a closed one.
      const openIdx: number[] = [];
      existingLogs.forEach((log: unknown, idx: number) => {
        if (!(log as { to_time?: string }).to_time) openIdx.push(idx);
      });

      if (openIdx.length > 0) {
        const lastOpen = openIdx[openIdx.length - 1];
        time_logs = existingLogs.map((log: unknown, idx: number) => {
          if (openIdx.includes(idx)) {
            return {
              ...(log as object),
              to_time: now,
              completed_qty: idx === lastOpen ? forQty : 0,
            };
          }
          // Already-closed rows: zero their completed_qty so the running sum
          // always equals forQty (self-heals polluted data).
          return { ...(log as object), completed_qty: 0 };
        });
      } else {
        time_logs = [
          ...(existingLogs as unknown[]).map((log: unknown) => ({
            ...(log as object),
            completed_qty: 0,
          })),
          {
            employee: assignedEmployeeId,
            from_time: now,
            to_time: now,
            completed_qty: forQty,
          },
        ];
      }

      total_completed_qty = forQty;
    }

    // 2) Save the time_log changes via REST PUT. We fetched the FRESH doc and
    // preserved each time_log row's `name`, so Frappe updates the existing
    // child rows in place rather than appending duplicates. We do NOT send
    // `status` — the controller derives it in set_status().
    const saved = await client.db.updateDoc("Job Card", docName, {
      ...(total_completed_qty !== undefined
        ? { total_completed_qty }
        : {}),
      time_logs,
    });

    // 3) Complete = SUBMIT. set_status() only derives "Completed" when
    // docstatus == 1 (submitted) AND for_quantity <= total_completed_qty +
    // process_loss_qty. A draft Job Card can never be "Completed", so we
    // submit via frappe.client.submit (db.submit normalizes errors). If it is
    // already submitted (docstatus 1), it is already completed — no-op.
    result = saved as unknown as JobCard;
    if (action === "complete") {
      const docstatus = Number(saved.docstatus ?? 0);
      if (docstatus === 0) {
        await client.db.submit(saved);
        // Re-fetch so the response reflects the submitted doc (status
        // "Completed", docstatus 1).
        result = await client.db.getDoc<JobCard>("Job Card", docName);
      }
    }

    // 4) 2Y-R6 — AUTO-COMPLETE the parent Work Order when this was its last
    // open Job Card. The operator marks JCs done; the WO finishes itself via
    // ERPNext's own "Manufacture" Stock Entry path (same as the desk Finish
    // button — a direct status PUT is rejected post-submit). Best-effort:
    // an auto-complete failure NEVER fails the JC completion — it surfaces
    // as autoCompleteError and the operator can still use Complete WO.
    let workOrderAutoCompleted: {
      workOrder: string;
      stockEntry: string | null;
    } | null = null;
    let autoCompleteError: string | null = null;

    if (action === "complete" && doc.work_order) {
      try {
        const woName = String(doc.work_order);
        const wo = await client.db.getDoc<{
          name: string;
          docstatus: number;
          status: string;
        }>("Work Order", woName);

        const woEligible =
          wo &&
          Number(wo.docstatus) === 1 && // submitted only
          !WO_TERMINAL_STATUSES.has(String(wo.status ?? ""));

        if (woEligible) {
          const siblings = await client.db.getDocList("Job Card", {
            fields: ["name", "status"],
            filters: [["work_order", "=", woName], ["docstatus", "<", 2]],
            limit: 100,
          });
          const allDone =
            siblings.length > 0 &&
            siblings.every((jc) => jc.status === "Completed");

          if (allDone) {
            const se = await buildAndSubmitStockEntry(client, woName, "Manufacture");
            workOrderAutoCompleted = { workOrder: woName, stockEntry: se.name };
          }
        }
      } catch (e) {
        autoCompleteError = e instanceof Error ? e.message : String(e);
      }
    }

    return NextResponse.json({
      success: true,
      data: result,
      ...(workOrderAutoCompleted ? { workOrderAutoCompleted } : {}),
      ...(autoCompleteError ? { autoCompleteError } : {}),
      message:
        `Job Card ${docName} ${action === "start" ? "started" : "completed"}` +
        (workOrderAutoCompleted
          ? ` — Work Order ${workOrderAutoCompleted.workOrder} auto-completed`
          : ""),
    });
  } catch (error) {
    const errorResponse = frappeClient.handleError(error);
    return NextResponse.json(errorResponse, {
      status: errorResponse.statusCode || 500,
    });
  }
}
