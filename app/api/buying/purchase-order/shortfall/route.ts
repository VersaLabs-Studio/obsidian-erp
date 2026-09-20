// app/api/buying/purchase-order/shortfall/route.ts
// Obsidian ERP v5.2-A — Shortfall auto-PO (4.1.1 deferred item).
//
// The SME path when production can't start for lack of materials: the
// StartProductionModal already computes the shortfall (required vs Bin qty
// per item). Previously "Order" deep-linked into the 3-step PO wizard with
// prefilled rows and left the rest to the operator. This route performs the
// transition instead: group the short lines by each item's DEFAULT SUPPLIER
// (ERPNext's own source: the Item → item_defaults row for the company, with
// the same any-company fallback ERPNext's mapper uses), build one Purchase
// Order per supplier, and submit — so short materials are ordered in one
// click from the modal.
//
// Live-probe-verified mechanics (this site):
//   • PO items REQUIRE schedule_date ("Please enter Reqd by Date" 417
//     otherwise) → each row gets transaction_date + 7 days.
//   • rate is auto-filled by ERPNext's pricing from the price list on insert
//     (probe: 66.92 filled with no rate sent) → we send none.
//   • item_defaults.default_supplier is a real field here (probe confirmed)
//     but often null → guided 422 listing the unsupplied items, exactly the
//     plain-language shape the MR "Order (auto)" route uses. The wizard stays
//     as the advanced path.
//
// Warehouse: set_warehouse + per-row warehouse backfilled from Stock
// Settings.default_warehouse (same resolution order as the MR order route).
//
// Partial-failure contract: submits run per supplier group; if a later group
// fails after earlier ones were created, the already-submitted PO names are
// returned with the error so nothing is ever lost.
//
// RBAC: per-request, sid-forwarded user client (fail closed 401). The user
// needs create+submit on Purchase Order.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { frappeClient } from "@/lib/frappe-client";
import { getRequestClient } from "@/lib/auth/resolve-user";

const shortfallSchema = z.object({
  /** Optional WO for the PO remarks trail ("ordered for <WO> shortfall"). */
  work_order: z.string().trim().optional(),
  items: z
    .array(
      z.object({
        item_code: z.string().trim().min(1),
        qty: z.number().positive(),
      }),
    )
    .min(1),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Receiving warehouse: Stock Settings.default_warehouse, then the canonical
 *  "Stores - <abbr>" — the same order the MR order route uses. */
async function resolveReceivingWarehouse(
  client: AnyClient,
  company: string,
): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resp: any = await (client.call as any).get(
      "frappe.client.get_value",
      {
        doctype: "Stock Settings",
        filters: { name: "Stock Settings" },
        fieldname: "default_warehouse",
      },
    );
    const saved = (resp?.message ?? resp)?.default_warehouse as string | undefined;
    if (saved) return saved;
  } catch {
    /* best-effort */
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resp: any = await (client.call as any).get(
      "frappe.client.get_value",
      {
        doctype: "Company",
        filters: { name: company },
        fieldname: "abbr",
      },
    );
    const abbr = (resp?.message ?? resp)?.abbr as string | undefined;
    if (abbr) return `Stores - ${abbr}`;
  } catch {
    /* best-effort */
  }
  return "";
}

/** Default supplier for an item: the company's item_defaults row first, then
 *  ANY company row with a supplier set (ERPNext's own fallback order). */
async function resolveDefaultSupplier(
  client: AnyClient,
  itemCode: string,
  company: string,
): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resp: any = await (client.call as any).get("frappe.client.get", {
      doctype: "Item",
      name: itemCode,
    });
    const item = resp?.message ?? resp;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: any[] = Array.isArray(item?.item_defaults) ? item.item_defaults : [];
    const forCompany = rows.find((r) => r?.company === company && r?.default_supplier);
    if (forCompany?.default_supplier) return String(forCompany.default_supplier);
    const anyRow = rows.find((r) => r?.default_supplier);
    if (anyRow?.default_supplier) return String(anyRow.default_supplier);
  } catch {
    /* missing item / no read perm → treated as unsupplied below */
  }
  return "";
}

export async function POST(request: NextRequest) {
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

  const parsed = shortfallSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Validation Error",
        details: "Body needs { items: [{ item_code, qty > 0 }], work_order? }.",
        statusCode: 400,
      },
      { status: 400 },
    );
  }
  const { items, work_order: workOrder } = parsed.data;

  try {
    // 1) Company — the WO's when linked, else the tenant's first Company.
    let company = "";
    if (workOrder) {
      try {
        const wo = await client.db.getDoc<{ company?: string }>(
          "Work Order",
          workOrder,
        );
        company = String(wo?.company ?? "");
      } catch {
        /* fall through */
      }
    }
    if (!company) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const comp: any = await (client.call as any).get(
        "frappe.client.get_list",
        { doctype: "Company", fields: JSON.stringify(["name"]), limit_page_length: 1 },
      );
      company = (comp?.message ?? comp)?.[0]?.name ?? "";
    }
    if (!company) {
      return NextResponse.json(
        {
          success: false,
          error: "NoCompany",
          details: "No Company found to own the Purchase Order.",
          statusCode: 422,
        },
        { status: 422 },
      );
    }

    // 2) Resolve each item's default supplier; group lines by supplier.
    const groups = new Map<string, { item_code: string; qty: number }[]>();
    const unsupplied: string[] = [];
    for (const line of items) {
      const supplier = await resolveDefaultSupplier(client, line.item_code, company);
      if (!supplier) {
        unsupplied.push(line.item_code);
        continue;
      }
      const bucket = groups.get(supplier) ?? [];
      bucket.push(line);
      groups.set(supplier, bucket);
    }
    if (unsupplied.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "SupplierRequired",
          details:
            `No default supplier is set on: ${unsupplied.join(", ")}. ` +
            "Set a Default Supplier on those Items (Item → Defaults) or use " +
            "the Purchase Order wizard, then order again.",
          statusCode: 422,
        },
        { status: 422 },
      );
    }

    // 3) One submitted PO per supplier group.
    const today = new Date();
    const transactionDate = isoDate(today);
    const scheduleDate = isoDate(new Date(today.getTime() + 7 * 86_400_000));
    const warehouse = await resolveReceivingWarehouse(client, company);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const created: string[] = [];
    for (const [supplier, lines] of groups) {
      const poDoc: Record<string, unknown> = {
        doctype: "Purchase Order",
        supplier,
        company,
        transaction_date: transactionDate,
        ...(warehouse ? { set_warehouse: warehouse } : {}),
        items: lines.map((l) => ({
          item_code: l.item_code,
          qty: l.qty,
          schedule_date: scheduleDate,
          ...(warehouse ? { warehouse } : {}),
        })),
        ...(workOrder
          ? { remarks: `Auto-ordered for shortfall on ${workOrder}.` }
          : {}),
      };
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const submitted: any = await (client.call as any).post(
          "frappe.client.submit",
          { doc: JSON.stringify(poDoc) },
        );
        const name = (submitted?.message ?? submitted)?.name ?? null;
        if (name) created.push(String(name));
      } catch (error) {
        const err = frappeClient.handleError(error);
        return NextResponse.json(
          {
            // Never lose the POs that DID get created.
            success: false,
            error: err.error ?? "Shortfall order failed",
            details:
              created.length > 0
                ? `Created ${created.join(", ")} but the order for ${supplier} failed: ${err.details ?? err.error}`
                : (err.details ?? err.error),
            statusCode: err.statusCode ?? 500,
            data: { purchase_orders: created },
            ...("actions" in err && err.actions ? { actions: err.actions } : {}),
          },
          { status: err.statusCode ?? 500 },
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: { purchase_orders: created },
        message:
          created.length === 1
            ? `Purchase Order ${created[0]} created and submitted.`
            : `${created.length} Purchase Orders created and submitted (${created.join(", ")}).`,
      },
      { status: 201 },
    );
  } catch (error) {
    const err = frappeClient.handleError(error);
    return NextResponse.json(err, { status: err.statusCode ?? 500 });
  }
}
