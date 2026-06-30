// hooks/flows/use-flow-chain.ts
// Obsidian ERP v4.0 — Unified Flow Resolution hook (master §13, 2N Part
// 1.1, 2O Part 1, 2P Part 1.2, 2R Part 1).
//
// 2R REWRITE — the previous implementation ran 16 `useFrappeList`
// queries per detail page (8 primary + 8 secondary slots) to resolve
// each stage via at most one intermediate. >2-hop stages were
// structurally unreachable; the 2-hop secondary slot resolved by
// anchor-name filter only, so header-link intermediates silently failed;
// and missing buying backward edges made the entire PR/PI/PE rail dead.
//
// This rewrite collapses the engine into ONE server-side BFS call
// against `GET /api/flows/resolve?doctype=&name=`. The server walks the
// graph in both directions over the registered link map (`lib/flows/
// flow-link-map.ts`), reads each fetched doc's own header/child fields,
// and returns the full `{ stage: name | null }` map for the anchor's
// flow. The rail shows a localized rail-only skeleton during the one
// call — never a whole-page stall.
//
// Public API unchanged: callers still do
//
//   const { result, isLoading } = useFlowChain("Sales Order", name);
//   <FlowRail result={result} ... />
//
// so FlowRail / FlowTracker / CrossFlowActionsMenu keep their props.

"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFrappeDoc } from "@/hooks/generic";
import { resolveFlowChain, getDocTypeRoute } from "@/lib/flows/flow-chain-resolver";
import type { FlowChainResult, FlowStageStatus } from "@/types/flow-types";

// ---------------------------------------------------------------------------
// Stale time — 5 minutes. Flow resolution is a back-link cache, not a
// live query.
// ---------------------------------------------------------------------------
const FLOW_STALE_MS = 5 * 60 * 1000;

// ---------------------------------------------------------------------------
// Wire types — match `/api/flows/resolve` response shape.
// ---------------------------------------------------------------------------
interface ResolveResponseStage {
  doctype: string;
  stage: { status: FlowStageStatus; documentName?: string };
}
interface ResolveResponse {
  doctype: string;
  name: string;
  flowId: string | null;
  stages: ResolveResponseStage[];
  map: Record<string, string | null>;
}

// ---------------------------------------------------------------------------
// Resolved slot (matches the rail's `stageStatuses` shape).
// ---------------------------------------------------------------------------
export interface ResolvedSlot {
  status: FlowStageStatus;
  documentName?: string;
  documentUrl?: string;
}

interface UseFlowChainResult {
  result: FlowChainResult;
  isLoading: boolean;
}

// ---------------------------------------------------------------------------
// Public hook
// ---------------------------------------------------------------------------
export function useFlowChain(
  doctype: string,
  name: string,
  /**
   * Optional caller-supplied overrides (e.g. PE detail page that reads
   * `entry.references[]` to find its source invoice). Keys are target
   * doctypes; values resolve those stages to "completed".
   */
  extraResolutions?: Record<string, ResolvedSlot>,
  /**
   * 2U §3 — Optional explicit flow ID override. When provided (e.g.
   * "purchase" for a Pay-type Payment Entry), use this flow definition
   * instead of the first matching one from getFlowForDocType. Solves
   * the disambiguation problem when a doctype (Payment Entry) appears
   * in multiple flows.
   */
  flowId?: string,
): UseFlowChainResult {
  // ----- 2R Part 1: ONE query against the server-side resolver -----------
  // Replaces the 16-slot storm. The response is the full resolved map;
  // we never need to read the anchor doc client-side for the rail.
  //
  // 2U §3 FIX — `flowId` must reach the SERVER (it owns the projection of
  // the resolved graph onto a flow's stage list) AND `resolveFlowChain`
  // below (it builds the client rail from the same flow). Threading it
  // only into a local `flow` var here was a no-op — the rail stayed on the
  // first-match (sales) flow for Pay-type PEs. The queryKey includes
  // flowId so a sales-projected and purchase-projected resolve of the same
  // doc never collide in the TanStack cache.
  const resolveQuery = useQuery<ResolveResponse, Error>({
    queryKey: ["flows", "resolve", doctype, name, flowId ?? null],
    queryFn: async () => {
      const params = new URLSearchParams({ doctype, name });
      if (flowId) params.set("flowId", flowId);
      const res = await fetch(`/api/flows/resolve?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body.details || body.error || `Flow resolve failed: ${res.status}`,
        );
      }
      const json = await res.json();
      return json.data as ResolveResponse;
    },
    enabled: !!doctype && !!name,
    staleTime: FLOW_STALE_MS,
  });

  // ----- Anchor doc fetch — for detail pages that need the anchor's
  //       fields (page body, not the rail). Many detail pages ALREADY
  //       call useFrappeDoc separately; this is just a defensive second
  //       fetch so the rail + page body can co-exist without a
  //       "undefined when not loaded" mismatch. TanStack dedupes by
  //       queryKey, so the same [doctype, "doc", name] key collapses to
  //       one network request.
  const { data: anchorDoc } = useFrappeDoc<Record<string, unknown>>(
    doctype,
    name,
    { enabled: !!name },
  );

  // ----- Build the stageStatuses map for resolveFlowChain ----------------
  const stageStatuses = useMemo<Record<string, ResolvedSlot>>(() => {
    const out: Record<string, ResolvedSlot> = {};
    const data = resolveQuery.data;
    if (data?.stages) {
      for (const s of data.stages) {
        // 9R.12 — compute documentUrl for completed stages so FlowRail
        // can render clickable <Link> navigations to those documents.
        const docName = s.stage.documentName;
        const url = docName
          ? `/${getDocTypeRoute(s.doctype)}/${encodeURIComponent(docName)}`
          : undefined;
        out[s.doctype] = {
          status: s.stage.status,
          documentName: docName,
          documentUrl: url,
        };
      }
    }
    // The anchor itself is always current + its own name. The server
    // returns it as `current` in the resolve response, but we double-
    // check here so the rail is correct even on a partial response.
    if (out[doctype]) {
      out[doctype] = {
        status: "current",
        documentName: name,
      };
    } else if (name) {
      out[doctype] = {
        status: "current",
        documentName: name,
      };
    }
    if (extraResolutions) {
      for (const [k, v] of Object.entries(extraResolutions)) {
        out[k] = v;
      }
    }
    return out;
  }, [resolveQuery.data, doctype, name, extraResolutions]);

  const result = useMemo(
    () => resolveFlowChain(doctype, name, stageStatuses, flowId),
    [doctype, name, stageStatuses, flowId],
  );

  // isLoading is true while the resolver call is in flight. The rail
  // shows its localized skeleton for the duration; the rest of the page
  // (the anchor's own fields, the body, the FlowTracker cross-flow
  // menu) renders against `anchorDoc` independently.
  const isLoading = resolveQuery.isLoading || (!anchorDoc && !resolveQuery.data);

  return { result, isLoading };
}

// ---------------------------------------------------------------------------
// Re-exports kept for downstream tests + callers
// ---------------------------------------------------------------------------
export default useFlowChain;