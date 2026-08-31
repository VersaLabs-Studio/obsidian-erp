// lib/manufacturing/stock-entry-builder.ts
// Obsidian ERP v4.2.2 — shared Work Order → Stock Entry builder.
//
// Extracted from app/api/manufacturing/work-order/[name]/make-stock-entry
// (v4.0 "2P live-fix") so the WO START / STOP / COMPLETE lifecycle routes can
// all drive ERPNext's own `make_stock_entry` doc builder instead of a raw
// `status` PUT (ERPNext rejects direct status writes on a submitted WO with
// "Not allowed to change Status after submission", and `start_work` is not a
// whitelisted API method on this install — 2Y-R5 find).
//
// Semantics are unchanged from the original route (same purpose strings, same
// implicit-warehouse backfill policy). The builder RETURNS the insert-ready
// Stock Entry doc; the caller decides whether to submit it inline
// (`frappe.client.submit`) or hand it to a save/submit flow.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyDoc = any;

/** Extract the company abbr from any warehouse name on the built SE
 *  (e.g. "Stores - P" → "P"). Used as a fallback when the Company lookup
 *  fails; the SE rows already carry live, correctly-suffixed names. */
export function abbrFromDoc(seDoc: AnyDoc): string {
  const rows: AnyDoc[] = Array.isArray(seDoc?.items) ? seDoc.items : [];
  const candidates = [
    ...rows.map((r) => r?.s_warehouse),
    ...rows.map((r) => r?.t_warehouse),
    seDoc?.from_warehouse,
    seDoc?.to_warehouse,
  ];
  for (const wn of candidates) {
    if (typeof wn === "string" && wn.includes(" - ")) {
      return wn.slice(wn.lastIndexOf(" - ") + 3);
    }
  }
  return String(seDoc?.company ?? "").slice(0, 3).toUpperCase();
}

/** Resolve the canonical `<Kind> - <abbr>` manufacturing warehouses for the
 *  company. Mirrors /api/stock/warehouses/defaults: abbr comes from the
 *  Company doc, with the SE's own warehouse suffix as a fallback. */
export async function resolveCompanyWarehouseNames(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: { call: any },
  company: string,
  fallbackAbbr: string,
): Promise<{ wip: string; fg: string; stores: string; rawMaterials: string }> {
  let abbr = fallbackAbbr;
  try {
    const resp = await client.call.get("frappe.client.get_value", {
      doctype: "Company",
      filters: JSON.stringify({ name: company }),
      fieldname: "abbr",
    });
    const got = (resp?.message ?? resp)?.abbr;
    if (got) abbr = String(got);
  } catch {
    // Company lookup failed — keep the abbr derived from the SE doc.
  }
  return {
    wip: `Work In Progress - ${abbr}`,
    fg: `Finished Goods - ${abbr}`,
    stores: `Stores - ${abbr}`,
    rawMaterials: `Raw Materials - ${abbr}`,
  };
}

/** Fill blank warehouses on the ERPNext-built SE, purpose-aware. Transfers
 *  move every row to WIP; Manufacture only targets the finished/scrap rows. */
export function backfillWarehouses(
  seDoc: AnyDoc,
  purpose: string,
  wh: { wip: string; fg: string; stores: string; rawMaterials: string },
): void {
  const isTransfer = purpose === "Material Transfer for Manufacture";
  const target = isTransfer ? wh.wip || wh.fg : wh.fg || wh.wip;
  const source = wh.stores || wh.rawMaterials || wh.wip;

  const rows: AnyDoc[] = Array.isArray(seDoc?.items) ? seDoc.items : [];
  for (const row of rows) {
    if (isTransfer) {
      // Every row is RM → WIP: both endpoints must be present.
      if (!row.t_warehouse) row.t_warehouse = target;
      if (!row.s_warehouse) row.s_warehouse = source;
    } else {
      // Manufacture: only finished/scrap rows carry a target warehouse;
      // consumption rows keep a source only (t_warehouse stays empty).
      if ((row.is_finished_item || row.is_scrap_item) && !row.t_warehouse) {
        row.t_warehouse = target;
      }
      if (!row.is_finished_item && !row.is_scrap_item && !row.s_warehouse) {
        row.s_warehouse = wh.wip || source;
      }
    }
  }

  // Header defaults ERPNext uses to fill any row it re-derives on validate.
  if (isTransfer && !seDoc.from_warehouse) seDoc.from_warehouse = source;
  if (!seDoc.to_warehouse) seDoc.to_warehouse = target;
}

const MAKE_STOCK_ENTRY =
  "erpnext.manufacturing.doctype.work_order.work_order.make_stock_entry";

// ---------------------------------------------------------------------------
// 2Y-R6 — IMPLICIT UOM RESOLUTION
// ERPNext raises UOMMustBeIntegerError ("Row N: Quantity (1.8) cannot be a
// fraction. To allow this, disable 'Must be Whole Number' in UOM <X>.") when a
// BOM line's fractional qty meets a UOM flagged must_be_whole_number. This is
// a CONFIG blocker, not an operator mistake — so instead of bouncing a guided
// error at the user, we flip the flag server-side and retry. The operator just
// sees the Stock Entry submit.
// ---------------------------------------------------------------------------

/** Strip HTML tags (<strong>…) that Frappe embeds in server messages. */
function stripHtml(msg: string): string {
  return msg.replace(/<[^>]+>/g, "");
}

/** Pull the human-readable message out of a thrown sdk error. Prefers
 *  `_server_messages` (the msgprint text), falls back to `exception`
 *  (traceback) and finally Error.message. Exported for route catch-blocks
 *  that classify errors (Error.message alone is often just "There was an
 *  error."). */
export function extractRawMessage(error: unknown): string {
  const e = error as {
    _server_messages?: unknown;
    exception?: unknown;
    message?: unknown;
  };
  if (typeof e?._server_messages === "string") {
    try {
      const arr = JSON.parse(e._server_messages) as unknown[];
      const first = arr?.[0];
      const parsed: { message?: unknown } | null =
        typeof first === "string"
          ? JSON.parse(first)
          : (first as { message?: unknown } | null);
      if (
        parsed &&
        typeof parsed === "object" &&
        typeof parsed.message === "string" &&
        parsed.message
      ) {
        return parsed.message;
      }
    } catch {
      // Malformed _server_messages — fall through to the other sources.
    }
  }
  if (typeof e?.exception === "string") return e.exception;
  if (error instanceof Error) return error.message;
  return String(error);
}

/** Extract the offending UOM name from a UOMMustBeIntegerError message.
 *  Matches "... disable 'Must be Whole Number' in UOM Set." → "Set". */
export function parseFractionUom(rawMessage: string): string | null {
  const msg = stripHtml(rawMessage);
  if (!/cannot be a fraction/i.test(msg)) return null;
  const m = msg.match(/in\s+UOM\s+([^.<]+?)\s*\.?\s*$/i);
  return m?.[1]?.trim() || null;
}

/** Flip must_be_whole_number off on the UOM doc. Returns false when the
 *  session lacks UOM write permission — callers then fall back to the
 *  guided error. */
async function unlockUomWholeNumber(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: { call: any },
  uom: string,
): Promise<boolean> {
  try {
    await client.call.post("frappe.client.set_value", {
      doctype: "UOM",
      name: uom,
      fieldname: "must_be_whole_number",
      value: 0,
    });
    return true;
  } catch {
    return false;
  }
}

export interface StockEntrySubmitResult {
  /** Submitted Stock Entry name (null when ERPNext omitted it). */
  name: string | null;
  /** UOMs whose whole-number constraint was lifted automatically. */
  fixedUoms: string[];
}

/**
 * Build AND submit a Work Order Stock Entry with implicit UOM resolution.
 *
 * Builds via ERPNext's own `make_stock_entry` (see {@link buildSeDoc}),
 * submits via `frappe.client.submit`, and — when ERPNext rejects the submit
 * with UOMMustBeIntegerError — automatically disables 'Must be Whole Number'
 * on the offending UOM and retries (max 3 attempts, one new UOM per attempt).
 * The SE is REBUILT each attempt so every other linkage stays pristine.
 *
 * @throws the original error when the failure isn't a fixable UOM block, the
 *         UOM can't be unlocked (permissions), or attempts are exhausted.
 */
export async function buildAndSubmitStockEntry(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: { call: any },
  workOrderId: string,
  purpose: "Material Transfer for Manufacture" | "Manufacture",
  qty?: number,
): Promise<StockEntrySubmitResult> {
  const fixedUoms: string[] = [];
  const MAX_ATTEMPTS = 3;

  for (let attempt = 1; ; attempt++) {
    const seDoc = await buildSeDoc(client, workOrderId, purpose, qty);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const submitted: any = await (client.call as any).post(
        "frappe.client.submit",
        { doc: JSON.stringify(seDoc) },
      );
      const result = submitted?.message ?? submitted;
      return { name: result?.name ?? null, fixedUoms };
    } catch (error) {
      const uom = parseFractionUom(extractRawMessage(error));
      if (!uom || fixedUoms.includes(uom) || attempt >= MAX_ATTEMPTS) {
        throw error;
      }
      const unlocked = await unlockUomWholeNumber(client, uom);
      if (!unlocked) throw error;
      fixedUoms.push(uom);
    }
  }
}

/**
 * Build an Insert-ready Stock Entry doc for a Work Order via ERPNext's own
 * `work_order.make_stock_entry` server method — the EXACT call the desk
 * Start/Finish buttons make. Returns the full unsaved doc with implicit
 * warehouse gaps backfilled; the caller inserts/submits it.
 *
 * @param client   Per-request, user-scoped client (`getRequestClient`).
 * @param workOrderId  WO name to build the entry for.
 * @param purpose  "Material Transfer for Manufacture" | "Manufacture".
 * @param qty      Optional fg_completed_qty (defaults to the WO's remaining qty).
 * @throws FrappeError (as thrown by the sdk) when the WO can't be built
 *         (e.g. already fully transferred) — callers shape via
 *         `frappeClient.handleError`.
 */
export async function buildSeDoc(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: { call: any },
  workOrderId: string,
  purpose: "Material Transfer for Manufacture" | "Manufacture",
  qty?: number,
): Promise<AnyDoc> {
  const args: Record<string, unknown> = {
    work_order_id: workOrderId,
    purpose,
  };
  if (typeof qty === "number" && qty > 0) {
    args.qty = qty;
  }

  const built: AnyDoc = await client.call.get(MAKE_STOCK_ENTRY, args);
  const seDoc = built?.message ?? built;
  if (!seDoc || typeof seDoc !== "object") {
    throw new Error(
      `make_stock_entry returned no document for '${workOrderId}'`,
    );
  }

  const wh = await resolveCompanyWarehouseNames(
    client,
    String(seDoc.company ?? ""),
    abbrFromDoc(seDoc),
  );
  backfillWarehouses(seDoc, purpose, wh);

  return seDoc;
}
