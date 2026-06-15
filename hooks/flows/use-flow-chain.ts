// hooks/flows/use-flow-chain.ts
// Obsidian ERP v4.0 — Unified Flow Resolution (master §13, 2N Part 1.1,
// 2O Part 1, 2P Part 1).
//
// Replaces the per-page `stageStatuses` blocks + `resolveFlowChain` call on
// every transactional detail page with a single hook:
//
//   const { result, isLoading } = useFlowChain("Sales Order", name);
//
//   <FlowRail
//     result={result}
//     currentDocName={name}
//     sourceDoctype="Sales Order"
//     isLoading={isLoading}
//   />
//
// 2O Part 1 — REWRITE to fix the three defects that broke the entire chain
// in both directions (Defect A — anchor mis-wiring; Defect B — non-reactive
// mutated-array cascade; Defect C — optional-stage stall). The previous
// hop-by-hop cascade mutated `resolvedByStage` in place, never re-rendered,
// and at most advanced one hop. This rewrite resolves each stage INDEPENDENTLY
// from the current doc, reactively, per the Part 1 spec.
//
// 2P Part 1.2 — KILL THE QUERY STORM. The previous version created a fresh
// `options` object on every render of every slot, so TanStack Query saw a
// new queryKey on every render (16 fresh entries per page per render) even
// when the inputs hadn't changed. The fix: compute each slot's options
// inside a `useMemo` whose dep array is the *identity* inputs (plan, name,
// currentDoc, intermediate's resolved name), not the whole plans array.
// When those inputs are stable, the options reference is stable, the
// queryKey is stable, TanStack does NOT re-register the query. Disabled
// slots stay registered as "idle" (no fetch). Enabled slots fetch on
// first render, then dedupe on the same key on subsequent renders.
// We also bump the per-query `staleTime` to 5 minutes (flow-resolution
// is a back-link cache, not a live query).
//
// Rules of Hooks: we call a *fixed* number of `useFrappeList` hooks — 8
// primary slots (one per stage in the longest flow) + 8 secondary slots
// (for two-hop resolutions whose target needs a different filter once the
// intermediate resolves). Each slot's `enabled` gate is set at render time
// from the plan + the current doc + the relevant intermediate's data.

"use client";

import { useMemo } from "react";
import { useFrappeDoc, useFrappeList } from "@/hooks/generic";
import {
  findFlowLink,
  buildLinkFilter,
  defaultSelectFields,
  type FlowLinkDef,
} from "@/lib/flows/flow-link-map";
import {
  getFlowForDocType,
  resolveFlowChain,
  getDocTypeRoute,
} from "@/lib/flows/flow-chain-resolver";
import type {
  FlowChainResult,
  FlowStageStatus,
} from "@/types/flow-types";

// ---------------------------------------------------------------------------
// Longest registered flow has 8 stages (Lead-to-Cash).
// We always call exactly MAX_STAGES primary queries and MAX_STAGES secondary
// queries so React's Rules of Hooks are honored on every render.
// ---------------------------------------------------------------------------
const MAX_STAGES = 8;

// Flow-resolution queries are back-link caches — they don't change within
// a session. 5-minute staleTime avoids any refetch inside the same flow
// navigation. (The factory default in `useFrappeList` is 1 minute; we
// override here for these specific calls.)
const FLOW_STALE_MS = 5 * 60 * 1000;

// ---------------------------------------------------------------------------
// Resolution plan per non-current stage
// ---------------------------------------------------------------------------
export type StagePlan =
  | { kind: "current"; stageIndex: number; stage: string }
  | { kind: "direct"; link: FlowLinkDef; stageIndex: number; stage: string }
  | {
      kind: "two-hop";
      firstLink: FlowLinkDef;
      secondLink: FlowLinkDef;
      intermediate: number;
      stageIndex: number;
      stage: string;
    }
  | {
      kind: "header-link";
      link: FlowLinkDef;
      field: string;
      stageIndex: number;
      stage: string;
    }
  | { kind: "none"; stageIndex: number; stage: string };

/**
 * Build a per-stage resolution plan for the current doctype.
 * The order of plans is the same as `stages` in the flow definition.
 *
 * Algorithm per non-current stage:
 *   1. Look for a DIRECT edge in `flow-link-map` from current → stage.
 *   2. Otherwise, walk every other stage X in the flow looking for a chain
 *      of TWO registered edges: current → X and X → stage. The first match
 *      wins (deterministic, slot order).
 *   3. Otherwise, if a HEADER_LINK is registered from current → stage
 *      (CRM upstream, e.g. `Quotation.party_name → Customer`), use that
 *      and the plan records the headerField to read from the current doc.
 *   4. Otherwise, NONE — the rail shows pending.
 */
function buildStagePlans(
  doctype: string,
  stages: ReadonlyArray<{ doctype: string }>,
  currentIndex: number,
): StagePlan[] {
  return stages.map((stage, i) => {
    if (i === currentIndex) {
      return { kind: "current" as const, stageIndex: i, stage: stage.doctype };
    }
    // 1. Direct edge from current → stage.
    const direct = findFlowLink(doctype, stage.doctype);
    if (direct) {
      return {
        kind: "direct" as const,
        link: direct,
        stageIndex: i,
        stage: stage.doctype,
      };
    }
    // 2. Two-hop: find some X with current→X AND X→stage.
    for (let x = 0; x < stages.length; x++) {
      if (x === currentIndex || x === i) continue;
      const xLink = findFlowLink(doctype, stages[x].doctype);
      const yLink = findFlowLink(stages[x].doctype, stage.doctype);
      if (xLink && yLink) {
        return {
          kind: "two-hop" as const,
          firstLink: xLink,
          secondLink: yLink,
          intermediate: x,
          stageIndex: i,
          stage: stage.doctype,
        };
      }
    }
    // 3. Header link (CRM upstream).
    const headerLink = findFlowLink(doctype, stage.doctype);
    if (
      headerLink &&
      headerLink.pattern === "header_link" &&
      headerLink.headerField
    ) {
      return {
        kind: "header-link" as const,
        link: headerLink,
        field: headerLink.headerField,
        stageIndex: i,
        stage: stage.doctype,
      };
    }
    // 4. No resolvable edge.
    return { kind: "none" as const, stageIndex: i, stage: stage.doctype };
  });
}

// ---------------------------------------------------------------------------
// Resolved slot
// ---------------------------------------------------------------------------
type ResolvedSlot = {
  status: FlowStageStatus;
  documentName?: string;
  documentUrl?: string;
};

interface UseFlowChainResult {
  result: FlowChainResult;
  isLoading: boolean;
}

// ---------------------------------------------------------------------------
// Stable EMPTY options sentinel — frozen so a comparison is a no-op.
// All `none`/`current` slots pass this exact reference.
// ---------------------------------------------------------------------------
const EMPTY_OPTIONS: { filters: []; fields: string[]; limit: 1 } = Object.freeze({
  filters: [],
  fields: ["name"],
  limit: 1,
}) as { filters: []; fields: string[]; limit: 1 };

const DISABLED: { enabled: false } = Object.freeze({ enabled: false }) as {
  enabled: false;
};

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
): UseFlowChainResult {
  const flow = getFlowForDocType(doctype);
  const stages = useMemo<ReadonlyArray<{ doctype: string }>>(
    () => flow?.stages ?? [],
    [flow],
  );
  const currentIndex = useMemo(
    () => stages.findIndex((s) => s.doctype === doctype),
    [stages, doctype],
  );
  const currentStageResolved = currentIndex >= 0;

  // Per-stage resolution plans (stable per doctype + stages + current index).
  const plans = useMemo<StagePlan[]>(
    () => buildStagePlans(doctype, stages, currentIndex),
    [doctype, stages, currentIndex],
  );

  // Gather the headerField names we need from the current doc (for the
  // header-link plans). One fetch of the current doc covers them all.
  const headerLinkFields = useMemo(() => {
    const out: string[] = [];
    for (const p of plans) {
      if (p.kind === "header-link" && !out.includes(p.field)) {
        out.push(p.field);
      }
    }
    return out;
  }, [plans]);

  // Fetch the current doc ONLY if we have header-link plans. The page's
  // own `useFrappeDoc` call (e.g. SO detail) hits the same TanStack key
  // so this is a no-op network-wise. (useFrappeDoc doesn't expose a
  // `fields` option — it returns the full document — so the
  // headerLinkFields list is purely for the `enabled` gate.)
  const { data: currentDoc } = useFrappeDoc<Record<string, unknown>>(
    doctype,
    name,
    { enabled: headerLinkFields.length > 0 },
  );

  // -------------------------------------------------------------------------
  // PRIMARY QUERIES — 8 fixed slots, one per stage. The slot's plan decides
  // whether the slot is enabled and what its filter is. For direct and
  // header-link plans, the filter is computed purely from `name` and
  // `currentDoc`. For two-hop plans, the primary slot is disabled and the
  // corresponding SECONDARY slot (below) does the actual query.
  // -------------------------------------------------------------------------
  // 2P Part 1.2: stable per-slot options, computed via useMemo. The
  // identity inputs are (plan[i], name, currentDoc). When those don't
  // change, the options reference is stable, the queryKey is stable,
  // TanStack does NOT re-register the query. Disabled slots pass
  // EMPTY_OPTIONS + DISABLED (frozen singletons) so their queryKey
  // is the literal `["", "list", EMPTY_OPTIONS]` and is never re-keyed.
  const slot0 = useFrappeList<{ name: string; parent?: string }>(
    pickPrimaryDoctype(plans[0]),
    useMemo(
      () => pickPrimaryOptions(plans[0], name, currentDoc ?? null),
      [plans[0], name, currentDoc],
    ),
    useMemo(
      () => ({ enabled: pickPrimaryEnabled(plans[0]), staleTime: FLOW_STALE_MS }),
      [plans[0]],
    ),
  );
  const slot1 = useFrappeList<{ name: string; parent?: string }>(
    pickPrimaryDoctype(plans[1]),
    useMemo(
      () => pickPrimaryOptions(plans[1], name, currentDoc ?? null),
      [plans[1], name, currentDoc],
    ),
    useMemo(
      () => ({ enabled: pickPrimaryEnabled(plans[1]), staleTime: FLOW_STALE_MS }),
      [plans[1]],
    ),
  );
  const slot2 = useFrappeList<{ name: string; parent?: string }>(
    pickPrimaryDoctype(plans[2]),
    useMemo(
      () => pickPrimaryOptions(plans[2], name, currentDoc ?? null),
      [plans[2], name, currentDoc],
    ),
    useMemo(
      () => ({ enabled: pickPrimaryEnabled(plans[2]), staleTime: FLOW_STALE_MS }),
      [plans[2]],
    ),
  );
  const slot3 = useFrappeList<{ name: string; parent?: string }>(
    pickPrimaryDoctype(plans[3]),
    useMemo(
      () => pickPrimaryOptions(plans[3], name, currentDoc ?? null),
      [plans[3], name, currentDoc],
    ),
    useMemo(
      () => ({ enabled: pickPrimaryEnabled(plans[3]), staleTime: FLOW_STALE_MS }),
      [plans[3]],
    ),
  );
  const slot4 = useFrappeList<{ name: string; parent?: string }>(
    pickPrimaryDoctype(plans[4]),
    useMemo(
      () => pickPrimaryOptions(plans[4], name, currentDoc ?? null),
      [plans[4], name, currentDoc],
    ),
    useMemo(
      () => ({ enabled: pickPrimaryEnabled(plans[4]), staleTime: FLOW_STALE_MS }),
      [plans[4]],
    ),
  );
  const slot5 = useFrappeList<{ name: string; parent?: string }>(
    pickPrimaryDoctype(plans[5]),
    useMemo(
      () => pickPrimaryOptions(plans[5], name, currentDoc ?? null),
      [plans[5], name, currentDoc],
    ),
    useMemo(
      () => ({ enabled: pickPrimaryEnabled(plans[5]), staleTime: FLOW_STALE_MS }),
      [plans[5]],
    ),
  );
  const slot6 = useFrappeList<{ name: string; parent?: string }>(
    pickPrimaryDoctype(plans[6]),
    useMemo(
      () => pickPrimaryOptions(plans[6], name, currentDoc ?? null),
      [plans[6], name, currentDoc],
    ),
    useMemo(
      () => ({ enabled: pickPrimaryEnabled(plans[6]), staleTime: FLOW_STALE_MS }),
      [plans[6]],
    ),
  );
  const slot7 = useFrappeList<{ name: string; parent?: string }>(
    pickPrimaryDoctype(plans[7]),
    useMemo(
      () => pickPrimaryOptions(plans[7], name, currentDoc ?? null),
      [plans[7], name, currentDoc],
    ),
    useMemo(
      () => ({ enabled: pickPrimaryEnabled(plans[7]), staleTime: FLOW_STALE_MS }),
      [plans[7]],
    ),
  );
  const primary = [slot0, slot1, slot2, slot3, slot4, slot5, slot6, slot7];

  // -------------------------------------------------------------------------
  // SECONDARY (TWO-HOP) QUERIES — 8 fixed slots. For each stage whose plan
  // is `two-hop`, the secondary slot runs the second edge with the
  // intermediate's resolved name as anchor. The intermediate's name is
  // derived from the INTERMEDIATE's primary query (so we close over
  // `primary[]` and the plan's `intermediate` index).
  // -------------------------------------------------------------------------
  // 2P Part 1.2: same stable-options pattern. The options depend on
  // (plan[i], intermediate's resolved name). When the intermediate hasn't
  // resolved yet, options is EMPTY_OPTIONS and `enabled` is false (the
  // frozen DISABLED singleton) — TanStack sees an unchanged disabled
  // query. When the intermediate resolves, options changes (new filter
  // object), enabled flips to true, TanStack fetches with the new key.
  const hop0 = useFrappeList<{ name: string; parent?: string }>(
    pickSecondaryDoctype(plans[0]),
    useMemo(
      () => pickSecondaryOptions(plans[0], primary),
      // pickSecondaryOptions closes over `primary`; we list each slot's
      // data + isLoading as the dep so it recomputes when the intermediate
      // resolves (data is a fresh array each fetch).
      [plans[0], primary[0]?.data, primary[1]?.data, primary[2]?.data, primary[3]?.data, primary[4]?.data, primary[5]?.data, primary[6]?.data, primary[7]?.data],
    ),
    useMemo(
      () => ({ enabled: pickSecondaryEnabled(plans[0], primary), staleTime: FLOW_STALE_MS }),
      [plans[0], primary[0]?.data, primary[1]?.data, primary[2]?.data, primary[3]?.data, primary[4]?.data, primary[5]?.data, primary[6]?.data, primary[7]?.data],
    ),
  );
  const hop1 = useFrappeList<{ name: string; parent?: string }>(
    pickSecondaryDoctype(plans[1]),
    useMemo(
      () => pickSecondaryOptions(plans[1], primary),
      [plans[1], primary[0]?.data, primary[1]?.data, primary[2]?.data, primary[3]?.data, primary[4]?.data, primary[5]?.data, primary[6]?.data, primary[7]?.data],
    ),
    useMemo(
      () => ({ enabled: pickSecondaryEnabled(plans[1], primary), staleTime: FLOW_STALE_MS }),
      [plans[1], primary[0]?.data, primary[1]?.data, primary[2]?.data, primary[3]?.data, primary[4]?.data, primary[5]?.data, primary[6]?.data, primary[7]?.data],
    ),
  );
  const hop2 = useFrappeList<{ name: string; parent?: string }>(
    pickSecondaryDoctype(plans[2]),
    useMemo(
      () => pickSecondaryOptions(plans[2], primary),
      [plans[2], primary[0]?.data, primary[1]?.data, primary[2]?.data, primary[3]?.data, primary[4]?.data, primary[5]?.data, primary[6]?.data, primary[7]?.data],
    ),
    useMemo(
      () => ({ enabled: pickSecondaryEnabled(plans[2], primary), staleTime: FLOW_STALE_MS }),
      [plans[2], primary[0]?.data, primary[1]?.data, primary[2]?.data, primary[3]?.data, primary[4]?.data, primary[5]?.data, primary[6]?.data, primary[7]?.data],
    ),
  );
  const hop3 = useFrappeList<{ name: string; parent?: string }>(
    pickSecondaryDoctype(plans[3]),
    useMemo(
      () => pickSecondaryOptions(plans[3], primary),
      [plans[3], primary[0]?.data, primary[1]?.data, primary[2]?.data, primary[3]?.data, primary[4]?.data, primary[5]?.data, primary[6]?.data, primary[7]?.data],
    ),
    useMemo(
      () => ({ enabled: pickSecondaryEnabled(plans[3], primary), staleTime: FLOW_STALE_MS }),
      [plans[3], primary[0]?.data, primary[1]?.data, primary[2]?.data, primary[3]?.data, primary[4]?.data, primary[5]?.data, primary[6]?.data, primary[7]?.data],
    ),
  );
  const hop4 = useFrappeList<{ name: string; parent?: string }>(
    pickSecondaryDoctype(plans[4]),
    useMemo(
      () => pickSecondaryOptions(plans[4], primary),
      [plans[4], primary[0]?.data, primary[1]?.data, primary[2]?.data, primary[3]?.data, primary[4]?.data, primary[5]?.data, primary[6]?.data, primary[7]?.data],
    ),
    useMemo(
      () => ({ enabled: pickSecondaryEnabled(plans[4], primary), staleTime: FLOW_STALE_MS }),
      [plans[4], primary[0]?.data, primary[1]?.data, primary[2]?.data, primary[3]?.data, primary[4]?.data, primary[5]?.data, primary[6]?.data, primary[7]?.data],
    ),
  );
  const hop5 = useFrappeList<{ name: string; parent?: string }>(
    pickSecondaryDoctype(plans[5]),
    useMemo(
      () => pickSecondaryOptions(plans[5], primary),
      [plans[5], primary[0]?.data, primary[1]?.data, primary[2]?.data, primary[3]?.data, primary[4]?.data, primary[5]?.data, primary[6]?.data, primary[7]?.data],
    ),
    useMemo(
      () => ({ enabled: pickSecondaryEnabled(plans[5], primary), staleTime: FLOW_STALE_MS }),
      [plans[5], primary[0]?.data, primary[1]?.data, primary[2]?.data, primary[3]?.data, primary[4]?.data, primary[5]?.data, primary[6]?.data, primary[7]?.data],
    ),
  );
  const hop6 = useFrappeList<{ name: string; parent?: string }>(
    pickSecondaryDoctype(plans[6]),
    useMemo(
      () => pickSecondaryOptions(plans[6], primary),
      [plans[6], primary[0]?.data, primary[1]?.data, primary[2]?.data, primary[3]?.data, primary[4]?.data, primary[5]?.data, primary[6]?.data, primary[7]?.data],
    ),
    useMemo(
      () => ({ enabled: pickSecondaryEnabled(plans[6], primary), staleTime: FLOW_STALE_MS }),
      [plans[6], primary[0]?.data, primary[1]?.data, primary[2]?.data, primary[3]?.data, primary[4]?.data, primary[5]?.data, primary[6]?.data, primary[7]?.data],
    ),
  );
  const hop7 = useFrappeList<{ name: string; parent?: string }>(
    pickSecondaryDoctype(plans[7]),
    useMemo(
      () => pickSecondaryOptions(plans[7], primary),
      [plans[7], primary[0]?.data, primary[1]?.data, primary[2]?.data, primary[3]?.data, primary[4]?.data, primary[5]?.data, primary[6]?.data, primary[7]?.data],
    ),
    useMemo(
      () => ({ enabled: pickSecondaryEnabled(plans[7], primary), staleTime: FLOW_STALE_MS }),
      [plans[7], primary[0]?.data, primary[1]?.data, primary[2]?.data, primary[3]?.data, primary[4]?.data, primary[5]?.data, primary[6]?.data, primary[7]?.data],
    ),
  );
  const secondary = [hop0, hop1, hop2, hop3, hop4, hop5, hop6, hop7];

  // -------------------------------------------------------------------------
  // Resolve per stage: read each plan + its primary/secondary query data.
  // `stageStatuses` is a *fresh* object every render (no mutation), so the
  // downstream `useMemo` correctly observes the resolution.
  // -------------------------------------------------------------------------
  const stageStatuses = useMemo<Record<string, ResolvedSlot>>(() => {
    const out: Record<string, ResolvedSlot> = {};
    if (!flow || !currentStageResolved) return out;

    for (let i = 0; i < stages.length; i++) {
      const plan = plans[i];
      const stage = stages[i];
      if (!plan || !stage) continue;
      if (plan.kind === "current") {
        out[stage.doctype] = {
          status: "current",
          documentName: name,
          documentUrl: `/${getDocTypeRoute(doctype)}/${encodeURIComponent(name)}`,
        };
        continue;
      }
      const resolved = readStageResolution(plan, primary[i], secondary[i]);
      if (resolved) {
        out[stage.doctype] = {
          status: "completed",
          documentName: resolved,
          documentUrl: `/${getDocTypeRoute(stage.doctype)}/${encodeURIComponent(resolved)}`,
        };
      }
    }
    // Layer the caller's extra resolutions on top (e.g. PE detail's
    // `references[]` lookup for its source invoice).
    if (extraResolutions) {
      for (const [k, v] of Object.entries(extraResolutions)) {
        out[k] = v;
      }
    }
    return out;
    // The plan array changes when doctype/stages/current change, which is
    // exactly when resolutions should recompute. We also depend on the
    // primary/secondary arrays' data and isLoading signals.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    flow,
    currentStageResolved,
    plans,
    primary.map((q) => q.data).join("|"),
    secondary.map((q) => q.data).join("|"),
    name,
    doctype,
    extraResolutions,
  ]);

  // isLoading is true when any *enabled* query is still fetching. Disabled
  // queries (no plan / no intermediate) must NOT contribute — they would
  // hold the skeleton open forever on a flow with no downstream link.
  const isLoading = useMemo(() => {
    for (let i = 0; i < plans.length; i++) {
      const plan = plans[i];
      if (!plan) continue;
      if (plan.kind === "two-hop") {
        // Two-hop is loading when the *secondary* slot is enabled & loading.
        if (secondary[i]?.isLoading) return true;
      } else if (plan.kind !== "current" && plan.kind !== "none") {
        if (primary[i]?.isLoading) return true;
      }
    }
    return false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    plans,
    primary.map((q) => q.isLoading).join(","),
    secondary.map((q) => q.isLoading).join(","),
  ]);

  const result = useMemo(
    () => resolveFlowChain(doctype, name, stageStatuses),
    [doctype, name, stageStatuses],
  );

  return { result, isLoading };
}

// ===========================================================================
// Helpers
// ===========================================================================

/**
 * Read the resolved doc name from a stage's plan + primary/secondary
 * query results. Returns null when the stage is not yet resolvable.
 */
function readStageResolution(
  plan: StagePlan,
  primaryQ: { data?: ReadonlyArray<{ name: string; parent?: string }> | null } | undefined,
  secondaryQ: { data?: ReadonlyArray<{ name: string; parent?: string }> | null } | undefined,
): string | null {
  if (plan.kind === "current" || plan.kind === "none") return null;
  const q = plan.kind === "two-hop" ? secondaryQ : primaryQ;
  const data = q?.data;
  if (!data || data.length === 0) return null;
  const row = data[0];
  if (!row) return null;
  // We always query the PARENT doctype now: child-table back-links are
  // resolved via a child-table filter on the parent (see
  // resolveQueryDoctype), so the matched row's `name` is the resolved
  // document in every case. `row.parent` is no longer consulted — the
  // previous code queried the child doctype directly, whose API route does
  // not exist (e.g. /api/accounting/sales-invoice-item → 404), so the
  // SO→SI / SO→DN / SI→PE links never resolved.
  return row.name ?? null;
}

function pickPrimaryDoctype(plan: StagePlan | undefined): string {
  if (!plan) return "";
  if (plan.kind === "direct" || plan.kind === "header-link") {
    return resolveQueryDoctype(plan.link);
  }
  // current / two-hop / none: not used by the primary slot
  return "";
}

/**
 * The doctype to actually QUERY (and therefore the API route) for a link.
 *
 * For child-table back-links (`returnParent: true`) the registry's
 * `queryDoctype` is the CHILD table (e.g. "Sales Invoice Item"), which has
 * NO API route. Frappe resolves child-table filters against the PARENT, so
 * we query the parent (`link.to`, e.g. "Sales Invoice") and keep the
 * child-table filter `[childDoctype, field, "=", value]` that
 * `buildLinkFilter` already emits. The matched parent row's `name` is the
 * resolved document (see `readStageResolution`).
 *
 * For header-field links (`returnParent` falsy) the query doctype is the
 * parent itself, so `queryDoctype` (or `to`) is correct as-is.
 */
function resolveQueryDoctype(link: FlowLinkDef): string {
  if (link.returnParent) return link.to;
  return link.queryDoctype ?? link.to;
}

function pickPrimaryOptions(
  plan: StagePlan | undefined,
  currentName: string,
  currentDoc: Record<string, unknown> | null,
): { filters: ReturnType<typeof buildLinkFilter>; fields: string[]; limit: number } {
  if (!plan) return EMPTY_OPTIONS;
  if (plan.kind === "direct") {
    return {
      filters: buildLinkFilter(plan.link, currentName),
      fields: defaultSelectFields(plan.link),
      limit: 1,
    };
  }
  if (plan.kind === "header-link") {
    const candidate = currentDoc?.[plan.field];
    if (!candidate) return EMPTY_OPTIONS;
    return {
      filters: buildLinkFilter(plan.link, String(candidate)),
      fields: defaultSelectFields(plan.link),
      limit: 1,
    };
  }
  return EMPTY_OPTIONS;
}

function pickPrimaryEnabled(plan: StagePlan | undefined): boolean {
  if (!plan) return false;
  if (plan.kind === "direct") return true;
  if (plan.kind === "header-link") return true;
  return false;
}

function pickSecondaryDoctype(plan: StagePlan | undefined): string {
  if (!plan) return "";
  if (plan.kind === "two-hop") {
    return resolveQueryDoctype(plan.secondLink);
  }
  return "";
}

function pickSecondaryOptions(
  plan: StagePlan | undefined,
  primary: ReadonlyArray<{ data?: ReadonlyArray<{ name: string; parent?: string }> | null } | undefined>,
): { filters: ReturnType<typeof buildLinkFilter>; fields: string[]; limit: number } {
  if (!plan || plan.kind !== "two-hop") return EMPTY_OPTIONS;
  const anchor = readIntermediateName(plan, primary);
  if (!anchor) return EMPTY_OPTIONS;
  return {
    filters: buildLinkFilter(plan.secondLink, anchor),
    fields: defaultSelectFields(plan.secondLink),
    limit: 1,
  };
}

function pickSecondaryEnabled(
  plan: StagePlan | undefined,
  primary: ReadonlyArray<{ data?: ReadonlyArray<{ name: string; parent?: string }> | null } | undefined>,
): boolean {
  if (!plan || plan.kind !== "two-hop") return false;
  return readIntermediateName(plan, primary) !== null;
}

/**
 * For a two-hop plan, the intermediate's resolved name is the first
 * non-null `data[0].name` (or `data[0].parent` for child-table back-links)
 * from the *intermediate's* primary query. Reading directly from `q.data`
 * (not from a mutated array) is what makes the cascade data-driven and
 * reactive — when the intermediate resolves, this function returns a
 * different string, the secondary slot's filter changes, and TanStack
 * refetches automatically.
 */
function readIntermediateName(
  plan: Extract<StagePlan, { kind: "two-hop" }>,
  primary: ReadonlyArray<{ data?: ReadonlyArray<{ name: string; parent?: string }> | null } | undefined>,
): string | null {
  const intermediateQ = primary[plan.intermediate];
  const data = intermediateQ?.data;
  if (!data || data.length === 0) return null;
  const row = data[0];
  if (!row) return null;
  // The intermediate is also resolved via a PARENT query (see
  // resolveQueryDoctype), so its `name` is the intermediate document.
  return row.name ?? null;
}

export default useFlowChain;
