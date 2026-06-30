// app/api/flows/resolve/route.ts
// Obsidian ERP v4.0 — Server-side flow-graph resolver (2R Part 1, P0
// headline).
//
// Collapses the 16-slot client-side cascade (8 primary + 8 secondary
// `useFrappeList` calls per detail page) into ONE server-side BFS over
// the registered link map. The response is the full `{ stage: name |
// null }` map for the anchor's flow.
//
// Per-request user-scoped Frappe client (`getRequestClient`) so ERPNext's
// DocPerms still apply. A user without READ on the anchor gets 401/403
// from Frappe and we surface it as a guided error.

import { NextRequest, NextResponse } from "next/server";
import { getRequestClient } from "@/lib/auth/resolve-user";
import { frappeClient } from "@/lib/frappe-client";
import {
  resolveFlowGraph,
  createBatchedGetDoc,
  type ListDoc,
  type ResolvedFlowChainResult,
} from "@/lib/flows/flow-graph";
import { getFlowForDocType, getFlowDefinition } from "@/lib/flows/flow-chain-resolver";

// ---------------------------------------------------------------------------
// Server-side I/O adapters
// ---------------------------------------------------------------------------

/**
 * Server `getDoc`: `frappe.client.get(doctype, name)` returns the full
 * document. The BFS uses this to read header fields + child tables.
 */
async function serverGetDoc(
  client: ReturnType<typeof getRequestClient>,
  doctype: string,
  name: string,
): Promise<Record<string, unknown> | null> {
  // 2S Part 0.1 — guard empty doctype: a misconfigured edge that produces
  // an empty queryDoctype must not call Frappe (which would 404 with
  // "DocType  not found"). Return null and let the BFS skip this edge.
  if (!client || !doctype || !name) {
    if (!doctype || !name) {
      console.warn(
        `[flow-graph] serverGetDoc skipped: empty doctype=${JSON.stringify(doctype)} name=${JSON.stringify(name)}`,
      );
    }
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any = await (client.call as any).get("frappe.client.get", {
    doctype,
    name,
  });
  const doc = Array.isArray(raw) ? raw[0] : raw?.message ?? raw;
  return doc && typeof doc === "object" ? (doc as Record<string, unknown>) : null;
}

/**
 * Server `listDoc`: list `doctype` via the REST resource endpoint
 * (`client.db.getDocList`). The BFS uses this for back-link filters and
 * verify-existence filters.
 *
 * 2U §A — TRANSPORT FIX. The previous implementation called
 * `frappe.client.get_list` over RPC. For the resolver's child-table
 * back-links (PR→PI, PO→PR, SO→DN, DN→SI, QN→SO …) the BFS passed the
 * CHILD doctype as `doctype`; `frappe.client.get_list` then runs
 * `check_parent_permission`, which raises PermissionError (403) — and the
 * whole rail goes dark. The resolver now passes the PARENT doctype with a
 * 4-tuple child-table filter (see `resolveBackLink` Path B), and we route
 * through `client.db.getDocList` — the same REST resource path the app's
 * own list routes use and that returns 200 for 4-tuple child filters on
 * live. ERPNext still runs DocPerm for the requesting user on the parent.
 */
async function serverListDoc(
  client: ReturnType<typeof getRequestClient>,
  doctype: string,
  filters: ReadonlyArray<unknown>,
  fields: string[],
  limit: number,
): Promise<Array<{ name: string; parent?: string }>> {
  // 2S Part 0.1 — guard empty doctype: same as serverGetDoc above.
  if (!client || !doctype) {
    if (!doctype) {
      console.warn(
        `[flow-graph] serverListDoc skipped: empty doctype=${JSON.stringify(doctype)}`,
      );
    }
    return [];
  }
  const selectFields = ["name", ...fields.filter((f) => f !== "name")];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any = await (client.db as any).getDocList(doctype, {
    fields: selectFields,
    filters: filters as unknown,
    limit: Math.max(1, limit),
  });
  const rows = Array.isArray(raw) ? raw : raw?.message ?? [];
  if (!Array.isArray(rows)) return [];
  return rows.map((r: { name: string; parent?: string }) => ({
    name: r.name,
    parent: r.parent,
  }));
}

// ---------------------------------------------------------------------------
// GET /api/flows/resolve?doctype=&name=
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  // 2P-FINAL A.3 — user-scoped client. ERPNext runs its DocPerm check on
  // every get_doc + get_list; fail closed (401) when no session.
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

  const { searchParams } = new URL(request.url);
  const doctype = searchParams.get("doctype");
  const name = searchParams.get("name");
  // 2U §3 FIX — optional explicit flow projection. For a doctype that lives
  // in more than one flow (Payment Entry → sales + purchase), the caller
  // disambiguates by passing &flowId= (e.g. "purchase" for a Pay-type PE).
  // Without it we fall back to getFlowForDocType's first match (sales).
  const flowId = searchParams.get("flowId") || undefined;

  if (!doctype || !name) {
    return NextResponse.json(
      {
        success: false,
        error: "Missing required query params",
        details: "Provide ?doctype=<X>&name=<Y>.",
        statusCode: 400,
      },
      { status: 400 },
    );
  }

  // Confirm the anchor is part of a registered flow. If not, we still
  // walk the graph but the response carries an empty `stages` array. When
  // an explicit flowId is supplied, project onto THAT flow (2U §3).
  const flow = flowId ? getFlowDefinition(flowId) : getFlowForDocType(doctype);

  try {
    // Wrap the raw server fetches in a dedupe-aware batched getDoc. The
    // BFS asks for many overlapping docs (the same neighbour is
    // reachable via two edges), so a raw implementation would refetch
    // the same doc N times.
    const rawGet = (d: string, n: string) => serverGetDoc(client, d, n);
    const getDoc = createBatchedGetDoc(rawGet);
    const listDoc: ListDoc = (d, f, fields, limit) =>
      serverListDoc(client, d, f, fields, limit);

    const result: ResolvedFlowChainResult = await resolveFlowGraph(
      doctype,
      name,
      getDoc,
      listDoc,
      flowId,
    );

    return NextResponse.json({
      success: true,
      data: {
        doctype,
        name,
        flowId: flow?.id ?? null,
        stages: result.stages,
        map: result.map,
      },
    });
  } catch (error) {
    const err = frappeClient.handleError(error);
    return NextResponse.json(err, { status: err.statusCode ?? 500 });
  }
}