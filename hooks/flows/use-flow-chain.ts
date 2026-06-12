// hooks/flows/use-flow-chain.ts
// Obsidian ERP v4.0 — Unified Flow Resolution (master §13, 2N Part 1.1).
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
// How it works:
//   1. Look up the flow definition for the current doctype (`getFlowForDocType`).
//   2. Walk outward from the current stage. Each adjacent stage is resolved
//      via a `useFrappeList` call gated on the *previous* step's resolved
//      name (`enabled: !!anchorName`).
//   3. The per-step filters come from the canonical `flow-link-map.ts`,
//      so the resolution FlowRail shows is the same resolution the
//      CrossFlowActionsMenu's "View vs Create" decision is built on.
//   4. When all steps resolve, assemble `stageStatuses` and call
//      `resolveFlowChain` to produce the final `FlowChainResult`.
//
// Rules of Hooks: the flow length is static per doctype, so we call a
// *fixed* number of `useFrappeList` hooks (MAX_STEPS = 7 — enough for the
// longest current flow minus the current stage). Each is gated on
// `(active, anchorKnown)` so unused hooks do nothing.

"use client";

import { useMemo } from "react";
import { useFrappeList } from "@/hooks/generic";
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
// Max flow steps across all registered flows (Lead-to-Cash has 8 stages,
// minus 1 for the current stage = 7 resolution steps max).
// ---------------------------------------------------------------------------
const MAX_STEPS = 7;

// ---------------------------------------------------------------------------
// Step plan
// ---------------------------------------------------------------------------
interface PlannedStep {
  /** Link definition to use for resolution (undefined if not in the link map) */
  link: FlowLinkDef | undefined;
  /** Stage index in the flow being resolved */
  targetStageIndex: number;
  /** Direction relative to current */
  direction: "backward" | "forward";
  /**
   * Which step's result is the anchor for this step:
   *   -1 → current doc (use `name` directly)
   *    N → the stage index that this step's result will populate
   *        (i.e. the previous step in the walk)
   *
   * The walk is:
   *   - Backward: step 0 resolves `currentIndex - 1`, then step 1 resolves
   *     `currentIndex - 2`, etc. Step N's anchor is step N-1's result.
   *   - Forward: step 0 resolves `currentIndex + 1`, then step 1 resolves
   *     `currentIndex + 2`. Step N's anchor is step N-1's result.
   */
  anchorStageIndex: number;
}

function planSteps(
  stages: ReadonlyArray<{ doctype: string }>,
  currentIndex: number,
): PlannedStep[] {
  const steps: PlannedStep[] = [];
  // Backward: from currentIndex-1 down to 0
  for (let i = currentIndex - 1; i >= 0; i--) {
    const fromDoctype = stages[i + 1]?.doctype ?? "";
    const toDoctype = stages[i]?.doctype ?? "";
    const link = findFlowLink(fromDoctype, toDoctype);
    steps.push({
      link,
      targetStageIndex: i,
      direction: "backward",
      // Step 0's anchor is the current doc (stageIndex currentIndex).
      // Step N>0's anchor is the stage resolved by step N-1
      // (which is the adjacent stage toward the current).
      anchorStageIndex: i + 1,
    });
  }
  // Forward: from currentIndex+1 up to last
  for (let i = currentIndex + 1; i < stages.length; i++) {
    const fromDoctype = stages[i - 1]?.doctype ?? "";
    const toDoctype = stages[i]?.doctype ?? "";
    const link = findFlowLink(fromDoctype, toDoctype);
    steps.push({
      link,
      targetStageIndex: i,
      direction: "forward",
      anchorStageIndex: i - 1,
    });
  }
  return steps.slice(0, MAX_STEPS);
}

// ---------------------------------------------------------------------------
// Resolved name slot
// ---------------------------------------------------------------------------
type ResolvedSlot = { status: FlowStageStatus; documentName?: string; documentUrl?: string };

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
   * Optional callback the caller can pass to inject additional
   * resolutions that the link map can't see (e.g. PE detail page that
   * reads `entry.references[]` to find its source invoice). Keys are
   * target doctypes; values resolve those stages to "completed".
   */
  extraResolutions?: Record<string, ResolvedSlot>,
): UseFlowChainResult {
  const flow = getFlowForDocType(doctype);
  const stages = useMemo<ReadonlyArray<{ doctype: string }>>(
    () => flow?.stages ?? [],
    [flow],
  );
  const currentIndex = useMemo(
    () => stages.findIndex((s: { doctype: string }) => s.doctype === doctype),
    [stages, doctype],
  );
  const currentStageResolved = currentIndex >= 0;

  const steps = useMemo<PlannedStep[]>(
    () => planSteps(stages, currentIndex),
    [stages, currentIndex],
  );

  // The resolved names, indexed by stage index. We need MAX_STAGES slots
  // (one per stage) so each step's anchor is a stable lookup. Stages array
  // length is bounded by the largest registered flow (currently 8).
  const resolvedByStage: (string | null)[] = useMemo(
    () => new Array(Math.max(stages.length, 8)).fill(null),
    [stages.length],
  );

  // Step 0's anchor is `name` (current doc). Other steps' anchors come from
  // the previous step's resolved stage.
  // We seed `resolvedByStage[currentIndex]` to `name` so all steps can read
  // it via the same accessor.
  if (currentStageResolved && resolvedByStage[currentIndex] !== name) {
    resolvedByStage[currentIndex] = name;
  }

  // The actual cascade: each step's hook is gated on its anchor being
  // non-null AND the link being known.
  // We call useFrappeList exactly MAX_STEPS times (Rules of Hooks).
  // Steps beyond the active set are gated off (`enabled: false`).

  // -- Build a list of (link, anchor) for each step slot --------------------
  const slot0 = steps[0];
  const slot1 = steps[1];
  const slot2 = steps[2];
  const slot3 = steps[3];
  const slot4 = steps[4];
  const slot5 = steps[5];
  const slot6 = steps[6];

  // Compute anchors for each step
  const anchor0 = slot0 && currentStageResolved ? name : "";
  const anchor1 =
    slot1 && slot0 && resolvedByStage[slot0.targetStageIndex] !== null
      ? resolvedByStage[slot0.targetStageIndex]!
      : "";
  const anchor2 =
    slot2 && slot1 && resolvedByStage[slot1.targetStageIndex] !== null
      ? resolvedByStage[slot1.targetStageIndex]!
      : "";
  const anchor3 =
    slot3 && slot2 && resolvedByStage[slot2.targetStageIndex] !== null
      ? resolvedByStage[slot2.targetStageIndex]!
      : "";
  const anchor4 =
    slot4 && slot3 && resolvedByStage[slot3.targetStageIndex] !== null
      ? resolvedByStage[slot3.targetStageIndex]!
      : "";
  const anchor5 =
    slot5 && slot4 && resolvedByStage[slot4.targetStageIndex] !== null
      ? resolvedByStage[slot4.targetStageIndex]!
      : "";
  const anchor6 =
    slot6 && slot5 && resolvedByStage[slot5.targetStageIndex] !== null
      ? resolvedByStage[slot5.targetStageIndex]!
      : "";

  // -- Fire MAX_STEPS useFrappeList calls -----------------------------------
  // Step 0
  const q0 = useFrappeList<{ name: string; parent?: string }>(
    slot0?.link?.queryDoctype ?? "",
    {
      filters: slot0?.link ? buildLinkFilter(slot0.link, anchor0) : [],
      fields: slot0?.link ? defaultSelectFields(slot0.link) : ["name"],
      limit: 1,
    },
    { enabled: !!slot0?.link && !!anchor0 },
  );
  // Step 1
  const q1 = useFrappeList<{ name: string; parent?: string }>(
    slot1?.link?.queryDoctype ?? "",
    {
      filters: slot1?.link ? buildLinkFilter(slot1.link, anchor1) : [],
      fields: slot1?.link ? defaultSelectFields(slot1.link) : ["name"],
      limit: 1,
    },
    { enabled: !!slot1?.link && !!anchor1 },
  );
  const q2 = useFrappeList<{ name: string; parent?: string }>(
    slot2?.link?.queryDoctype ?? "",
    {
      filters: slot2?.link ? buildLinkFilter(slot2.link, anchor2) : [],
      fields: slot2?.link ? defaultSelectFields(slot2.link) : ["name"],
      limit: 1,
    },
    { enabled: !!slot2?.link && !!anchor2 },
  );
  const q3 = useFrappeList<{ name: string; parent?: string }>(
    slot3?.link?.queryDoctype ?? "",
    {
      filters: slot3?.link ? buildLinkFilter(slot3.link, anchor3) : [],
      fields: slot3?.link ? defaultSelectFields(slot3.link) : ["name"],
      limit: 1,
    },
    { enabled: !!slot3?.link && !!anchor3 },
  );
  const q4 = useFrappeList<{ name: string; parent?: string }>(
    slot4?.link?.queryDoctype ?? "",
    {
      filters: slot4?.link ? buildLinkFilter(slot4.link, anchor4) : [],
      fields: slot4?.link ? defaultSelectFields(slot4.link) : ["name"],
      limit: 1,
    },
    { enabled: !!slot4?.link && !!anchor4 },
  );
  const q5 = useFrappeList<{ name: string; parent?: string }>(
    slot5?.link?.queryDoctype ?? "",
    {
      filters: slot5?.link ? buildLinkFilter(slot5.link, anchor5) : [],
      fields: slot5?.link ? defaultSelectFields(slot5.link) : ["name"],
      limit: 1,
    },
    { enabled: !!slot5?.link && !!anchor5 },
  );
  const q6 = useFrappeList<{ name: string; parent?: string }>(
    slot6?.link?.queryDoctype ?? "",
    {
      filters: slot6?.link ? buildLinkFilter(slot6.link, anchor6) : [],
      fields: slot6?.link ? defaultSelectFields(slot6.link) : ["name"],
      limit: 1,
    },
    { enabled: !!slot6?.link && !!anchor6 },
  );

  const queries = [q0, q1, q2, q3, q4, q5, q6];

  // -- Extract resolved names per step --------------------------------------
  // For each step's query, if the data is available, populate
  // resolvedByStage[step.targetStageIndex] with the name (or parent for
  // child-table links).
  for (let i = 0; i < steps.length && i < MAX_STEPS; i++) {
    const step = steps[i];
    const q = queries[i];
    if (!step || !q.data || q.data.length === 0) continue;
    const row = q.data[0];
    const resolvedName = step.link?.returnParent && row.parent
      ? row.parent
      : row.name;
    if (resolvedName) {
      resolvedByStage[step.targetStageIndex] = resolvedName;
    }
  }

  // -- Build the stageStatuses map for resolveFlowChain --------------------
  const stageStatuses = useMemo<Record<string, ResolvedSlot>>(() => {
    const out: Record<string, ResolvedSlot> = {};
    if (!flow || currentIndex < 0) return out;

    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      const resolvedName = resolvedByStage[i];
      if (i === currentIndex) {
        out[stage.doctype] = {
          status: "current",
          documentName: name,
          documentUrl: `/${getDocTypeRoute(doctype)}/${encodeURIComponent(name)}`,
        };
      } else if (resolvedName) {
        out[stage.doctype] = {
          status: "completed",
          documentName: resolvedName,
          documentUrl: `/${getDocTypeRoute(stage.doctype)}/${encodeURIComponent(resolvedName)}`,
        };
      }
    }
    // Layer the caller's extra resolutions on top (e.g. PE detail's
    // references-row lookup for its source invoice).
    if (extraResolutions) {
      for (const [k, v] of Object.entries(extraResolutions)) {
        out[k] = v;
      }
    }
    return out;
  }, [flow, currentIndex, stages, resolvedByStage, name, doctype, extraResolutions]);

  const isLoading = useMemo(
    () => queries.some((q, i) => i < steps.length && q.isLoading),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queries.map((q) => q.isLoading).join(","), steps.length],
  );

  const result = useMemo(
    () => resolveFlowChain(doctype, name, stageStatuses),
    [doctype, name, stageStatuses],
  );

  return { result, isLoading };
}

export default useFlowChain;
