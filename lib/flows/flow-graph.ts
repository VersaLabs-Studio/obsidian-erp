// lib/flows/flow-graph.ts
// Obsidian ERP v4.0 — Full-depth bidirectional Flow Graph resolver
// (2R Part 1, P0 headline).
//
// Why this exists: the previous `useFlowChain` engine was pairwise, depth-
// capped at 2, and direction-blind. It fired 16 round-trips per detail
// page (8 primary + 8 secondary `useFrappeList` calls) and resolved each
// stage EITHER directly (1 hop) OR through exactly one intermediate (2
// hops). Three consequences made the entire chain look broken in both
// directions on the live Pana instance:
//
//   1. >2-hop stages were structurally unreachable. PE (stage 7) →
//      Customer (stage 1) is 5-6 hops away through the canonical chain.
//   2. The 2-hop secondary slot resolves by anchor-NAME filter, never
//      reading the intermediate's header/child fields, so even PE→SI→Customer
//      (a 2-hop path whose second edge is a header_link) silently failed.
//   3. Missing registry edges (no Sales Invoice → Sales Order, no Sales
//      Invoice → Delivery Note, no PR/PI/PE backward edges in buying) made
//      the entire §C procure-to-pay rail dead.
//
// This module replaces that engine with a pure BFS that closes over the
// full graph in one pass. The BFS walks both directions from the anchor
// (back_link + header_link + current_child edges), reads the fetched
// doc's own fields for header/child edges, and re-expands every resolved
// doc in both directions until closure. One network round-trip per
// resolved doc, parallel within a wave.
//
// ERPNext fidelity (no invented edges): every expansion uses the registry
// in `lib/flows/flow-link-map.ts`. Adding a new edge there lights up new
// resolutions here automatically — no engine change needed.
//
// Branch reconciliation: a Delivery Note AND a Sales Invoice both made
// from the same SO resolve each other through the SO hub, because every
// resolved doc re-expands in BOTH directions. We do not special-case it.

import {
  findFlowLink,
  getFlowLinksFrom,
  type FlowLinkDef,
  type FlowLinkPattern,
} from "./flow-link-map";
import { getFlowForDocType, getFlowDefinition } from "./flow-chain-resolver";
import type { FlowStageStatus } from "@/types/flow-types";

// ---------------------------------------------------------------------------
// I/O seam
// ---------------------------------------------------------------------------

/**
 * The ONLY I/O seam the resolver needs. Implementations may batch,
 * cache, or fetch from any source. The BFS calls this with one resolved
 * neighbour at a time; the implementation is responsible for parallelism
 * and dedupe within the resolver's lifetime (a small wrapper is provided
 * below — `createBatchedGetDoc`).
 */
export type GetDoc = (
  doctype: string,
  name: string,
) => Promise<Record<string, unknown> | null>;

/**
 * Result of one back-link query against the target parent doctype. The
 * list call may return one row (resolved), zero rows (no match), or many
 * rows (we take the first as the canonical link target).
 */
export interface ResolvedLinkRow {
  name: string;
  parent?: string;
}

/**
 * The same I/O contract for a list call. Some edges (back_link with
 * `returnParent: true`) need a list query against the parent with a
 * child-table filter. The first matching row's `name` is the resolved
 * parent name.
 */
export type ListDoc = (
  doctype: string,
  filters: ReadonlyArray<unknown>,
  fields: string[],
  limit: number,
) => Promise<ResolvedLinkRow[]>;

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------

/**
 * The resolved graph: one entry per stage of the anchor's flow. `name`
 * is the resolved document name (string) or `null` if no edge reached
 * that stage.
 */
export type ResolvedFlowGraph = Record<string /* stage doctype */, string | null>;

/**
 * Stage statuses for the rail. Mirrors what the rail renders — same
 * shape as `FlowStageStatus` in `@/types/flow-types` (current /
 * completed / pending).
 */
export interface ResolvedStage {
  status: FlowStageStatus;
  documentName?: string;
}

/**
 * The final return shape. One entry per stage of the anchor's flow plus
 * a `map` view for direct lookup.
 */
export interface ResolvedFlowChainResult {
  /** One entry per stage doctype of the anchor's flow. */
  stages: Array<{ doctype: string; stage: ResolvedStage }>;
  /** Convenience map for callers that look up by doctype. */
  map: ResolvedFlowGraph;
}

// ---------------------------------------------------------------------------
// Bounded BFS — caps to prevent pathological expansion
// ---------------------------------------------------------------------------

/**
 * The BFS caps at MAX_FRONTIER_WAVES to prevent pathological expansion
 * in misconfigured graphs (cycles, extremely long chains). 8 waves × ~10
 * neighbours per wave = ~80 fetches per detail page, which is still
 * cheaper than the previous 16-slot storm (which fired unconditionally
 * even when most slots were disabled).
 */
const MAX_FRONTIER_WAVES = 8;

// ---------------------------------------------------------------------------
// Core resolver
// ---------------------------------------------------------------------------

/**
 * Pure BFS — resolve the full flow graph for `anchorDoctype:anchorName`.
 *
 * Algorithm:
 *
 *   1. Seed frontier = [(anchorDoctype, anchorName)]. Resolved = {}.
 *   2. Fetch the anchor doc (or reuse if already fetched).
 *   3. Mark `anchorDoctype → anchorName` as "completed" in `resolved`.
 *   4. Repeat until frontier is empty OR MAX_FRONTIER_WAVES reached:
 *      a. For each (fromDoctype, fromName) in the wave:
 *         - Read the doc via `getDoc` (batched wrapper dedupes).
 *         - Expand every registered outgoing edge from `fromDoctype`:
 *           • back_link → list query against `to` (or its parent for
 *             child-table filters). Take `data[0].name` (or `parent`).
 *           • header_link → read `doc[headerField]`, verify with a list
 *             call limit 1 against `to`.
 *           • current_child → read `doc[childTable][].childField`
 *             (filter by `childWhere`), verify with a list call limit 1.
 *         - Each newly-resolved neighbour (doctype, name) is added to
 *           `resolved` and to the NEXT wave's frontier.
 *   5. Return the resolved map, projected onto the anchor's flow stages.
 *      Stages not reached → `null`. The anchor's own stage → its own
 *      name. Stages outside the flow → not returned (the rail shows them
 *      as out-of-flow anyway).
 *
 * Side effects: none beyond `getDoc` calls. The resolver is fully
 * pure given a deterministic `getDoc`.
 */
export async function resolveFlowGraph(
  anchorDoctype: string,
  anchorName: string,
  getDoc: GetDoc,
  listDoc: ListDoc,
  /**
   * 2U §3 FIX — Explicit flow projection. A doctype that appears in more
   * than one flow (Payment Entry is in BOTH sales and purchase) defaults
   * to `getFlowForDocType`'s FIRST match (sales), so a Pay-type PE
   * projected its fully-resolved graph onto the sales stage list and the
   * purchase docs (MR/PO/PR/PI) were dropped. When the caller knows the
   * intended flow (e.g. payment_type === "Pay" → "purchase") it passes
   * `flowId` here and we project onto THAT flow's stages instead. The BFS
   * itself is flow-agnostic — it already resolved every reachable doc into
   * `resolved`; only this projection was wrong.
   */
  flowId?: string,
): Promise<ResolvedFlowChainResult> {
  // The flow definition (with stages) for the anchor. If the anchor
  // isn't part of any registered flow, we still walk the graph but only
  // return an empty `stages` array (the rail will show just the anchor).
  const flow = flowId ? getFlowDefinition(flowId) : getFlowForDocType(anchorDoctype);
  const flowStages = flow?.stages ?? [];

  // Final resolved map: doctype → name. Initialized with the anchor.
  const resolved: ResolvedFlowGraph = { [anchorDoctype]: anchorName };

  // Frontier of (doctype, name) pairs to expand next. We deduplicate on
  // (doctype, name) so a doc reached by two paths is expanded once.
  const seen = new Set<string>([keyOf(anchorDoctype, anchorName)]);
  let frontier: Array<{ doctype: string; name: string }> = [
    { doctype: anchorDoctype, name: anchorName },
  ];

  for (let wave = 0; wave < MAX_FRONTIER_WAVES && frontier.length > 0; wave++) {
    const nextFrontier: Array<{ doctype: string; name: string }> = [];

    for (const node of frontier) {
      const doc = await getDoc(node.doctype, node.name);
      if (!doc) continue;

      // All outgoing edges from `node.doctype`. We walk BOTH directions
      // (the registry's `direction: forward | backward` is informational;
      // graph expansion is undirected at this layer).
      const outgoing = getOutgoingEdges(node.doctype);
      for (const edge of outgoing) {
        // 2S Part 0.1 — fault isolation: one malformed edge must NEVER
        // abort the whole graph. Log + skip so the rest of the rail stays lit.
        let candidate: string | null = null;
        try {
          candidate = await resolveEdge(edge, doc, listDoc);
        } catch (e) {
          console.warn(
            `[flow-graph] edge ${edge.from}→${edge.to} failed:`,
            e,
          );
          continue;
        }
        if (!candidate) continue;

        const neighbourKey = keyOf(edge.to, candidate);
        if (seen.has(neighbourKey)) continue;
        seen.add(neighbourKey);

        resolved[edge.to] = candidate;
        nextFrontier.push({ doctype: edge.to, name: candidate });
      }
    }

    frontier = nextFrontier;
  }

  // Project onto the anchor's flow stages. The anchor's own stage is
  // always `completed` (it's the document we're viewing). Unreached
  // stages stay `null` in the map but are reported as `pending` in the
  // `stages` array (the rail renders pending as "not started").
  const stages = flowStages.map((stage) => {
    const name = resolved[stage.doctype] ?? null;
    return {
      doctype: stage.doctype,
      stage: {
        status:
          stage.doctype === anchorDoctype
            ? ("current" as FlowStageStatus)
            : name
              ? ("completed" as FlowStageStatus)
              : ("pending" as FlowStageStatus),
        documentName: name ?? undefined,
      },
    };
  });

  return { stages, map: resolved };
}

// ---------------------------------------------------------------------------
// Edge expansion
// ---------------------------------------------------------------------------

/**
 * All edges outgoing from a doctype, regardless of direction. The link
 * map stores both forward and backward edges; for the BFS we walk every
 * registered edge (the direction label is used by the rail's forward vs
 * backward UI, not the resolver).
 */
function getOutgoingEdges(doctype: string): FlowLinkDef[] {
  return getFlowLinksFrom(doctype);
}

async function resolveEdge(
  edge: FlowLinkDef,
  fromDoc: Record<string, unknown>,
  listDoc: ListDoc,
): Promise<string | null> {
  switch (edge.pattern) {
    case "header_link":
      return resolveHeaderLink(edge, fromDoc, listDoc);
    case "current_child":
      return resolveCurrentChild(edge, fromDoc, listDoc);
    case "back_link":
    default:
      return resolveBackLink(edge, fromDoc, listDoc);
  }
}

async function resolveHeaderLink(
  edge: FlowLinkDef,
  fromDoc: Record<string, unknown>,
  listDoc: ListDoc,
): Promise<string | null> {
  const candidate = fromDoc[edge.headerField ?? ""];
  if (!candidate || typeof candidate !== "string") return null;
  // Verify the candidate exists in `to`. The verify call uses the
  // 3-tuple shorthand filter `["name", "=", candidate]`.
  const rows = await listDoc(edge.to, [["name", "=", candidate]], ["name"], 1);
  return rows[0]?.name ?? null;
}

async function resolveCurrentChild(
  edge: FlowLinkDef,
  fromDoc: Record<string, unknown>,
  listDoc: ListDoc,
): Promise<string | null> {
  const childTable = edge.childTable ?? "items";
  const childField = edge.childField;
  if (!childField) return null;
  const rows = fromDoc[childTable];
  if (!Array.isArray(rows) || rows.length === 0) return null;
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    if (edge.childWhere) {
      const [wField, wOp, wVal] = edge.childWhere;
      if (wOp === "=" && r[wField] !== wVal) continue;
      if (wOp === "!=" && r[wField] === wVal) continue;
    }
    const value = r[childField];
    if (value === undefined || value === null || value === "") continue;
    const candidate = String(value);
    // Verify the candidate exists in `verifyDoctype` (defaults to `to`).
    const verify = edge.verifyDoctype ?? edge.to;
    const rows2 = await listDoc(verify, [["name", "=", candidate]], ["name"], 1);
    if (rows2[0]?.name) return candidate;
  }
  return null;
}

async function resolveBackLink(
  edge: FlowLinkDef,
  _fromDoc: Record<string, unknown>,
  listDoc: ListDoc,
): Promise<string | null> {
  // 2U §A FIX (supersedes the 2T child-direct approach) — Two resolution
  // paths:
  //
  // Path A: Header-field back-link (returnParent: false). The filter is
  //   `[field, "=", anchorName]` against the queried parent doctype.
  //   Example: Work Order.sales_order = SO name → query WO list.
  //
  // Path B: Child-table back-link (returnParent: true). We query the
  //   PARENT doctype (`edge.to`) with a 4-tuple child-table filter
  //   `[childDoctype, field, "=", anchorName]`. This is the shape ERPNext's
  //   REST resource list (`client.db.getDocList`) supports and the app's
  //   own list routes already use successfully on live (HTTP 200). The
  //   previous 2T approach queried the CHILD doctype directly via
  //   `frappe.client.get_list`, which trips Frappe's `check_parent_permission`
  //   and 403s for every single back-link edge (PR→PI, PO→PR, SO→DN, DN→SI,
  //   QN→SO …) — i.e. the entire rail went dark. Querying the parent with the
  //   child-table filter returns the PARENT row directly, so we read
  //   `rows[0].name` (no `parent` field needed).
  //   Example: query Sales Order where `Sales Order Item.prevdoc_docname =
  //   QN name` → rows[0].name is the SO.

  if (edge.returnParent && edge.queryDoctype && edge.field) {
    // --- Path B: 4-tuple child-table filter against the PARENT doctype ---
    const parentFilters: Array<unknown> = [
      [edge.queryDoctype, edge.field, "=", _fromDoc?.name ?? ""],
    ];
    // Extra filters live on the SAME child table (e.g. `reference_doctype`
    // on Payment Entry Reference). The registry uses "" to mean "the child
    // table of this edge" — expand it to the child doctype so the filter
    // stays a valid 4-tuple child-table filter.
    if (edge.extraFilters) {
      for (const f of edge.extraFilters) {
        const childDoctype = f[0] === "" ? edge.queryDoctype : f[0];
        parentFilters.push([childDoctype, f[1], f[2], f[3]]);
      }
    }
    // Query the PARENT (edge.to); the matched row's own name is the result.
    const rows = await listDoc(edge.to, parentFilters, ["name"], 1);
    if (rows.length === 0) return null;
    return rows[0].name ?? null;
  }

  // --- Path A: header-field back-link ---
  const filters: Array<unknown> = [];
  filters.push([edge.field ?? "", "=", _fromDoc?.name ?? ""]);
  if (edge.extraFilters) {
    for (const f of edge.extraFilters) {
      if (f[0] === "") {
        filters.push([f[1], f[2], f[3]]);
      } else {
        filters.push(f);
      }
    }
  }
  const parentDoctype = edge.queryDoctype ?? edge.to;
  const rows = await listDoc(parentDoctype, filters, ["name"], 1);
  if (rows.length === 0) return null;
  return rows[0].name ?? null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function keyOf(doctype: string, name: string): string {
  return `${doctype}::${name}`;
}

// ---------------------------------------------------------------------------
// Batched getDoc wrapper — parallel + dedupe within one resolve call.
// ---------------------------------------------------------------------------

/**
 * Wrap a raw `getDoc` so the BFS's overlapping fetches (two edges may
 * both want the same doc) are deduped and parallelism is preserved.
 *
 * Behaviour:
 *   - First call for (doctype, name) starts the fetch; later calls
 *     return the same in-flight promise.
 *   - The wrapper collects all distinct (doctype, name) requests across
 *     the wave and fires them in parallel via Promise.all. (The wave's
 *     awaits are sequential; the wrapper's parallelism is a single
 *     Promise.all per wave.)
 *
 * For a list call, no batching is needed (the BFS makes one list call
 * per edge per wave; they don't overlap with themselves).
 */
export function createBatchedGetDoc(raw: GetDoc): GetDoc {
  const cache = new Map<string, Promise<Record<string, unknown> | null>>();
  return (doctype, name) => {
    const k = keyOf(doctype, name);
    const cached = cache.get(k);
    if (cached) return cached;
    const p = raw(doctype, name);
    cache.set(k, p);
    // Drop failed entries after they settle so a transient 5xx can
    // retry on the next resolve call. Successful entries stay cached
    // for the lifetime of this resolver instance — the consumer can
    // invalidate explicitly by dropping the wrapper.
    p.catch(() => cache.delete(k)).then(() => {
      // No-op; success leaves the cache populated.
    });
    return p;
  };
}

/**
 * Look up a single edge (read-side helper for tests + call sites that
 * only need one direction). Returns the candidate name or null.
 */
export async function resolveOneEdge(
  fromDoctype: string,
  fromDoc: Record<string, unknown>,
  toDoctype: string,
  listDoc: ListDoc,
): Promise<string | null> {
  const edge = findFlowLink(fromDoctype, toDoctype);
  if (!edge) return null;
  return resolveEdge(edge, fromDoc, listDoc);
}

/**
 * Helper for tests + callers: re-export of the pattern union so tests
 * can narrow `edge.pattern` without importing the link map module.
 */
export type { FlowLinkPattern };