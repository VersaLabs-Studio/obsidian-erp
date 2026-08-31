"use client";

// components/cross-flow/CrossFlowActionsMenu.tsx
// Obsidian ERP v4.0 — Universal Cross-Flow Actions Menu (master §12).
//
// Detail-sidebar "Actions" menu: the Customer-360 quick-actions menu,
// generalized to every transactional doctype. Each adjacent doctype
// (forward + backward) is offered as a button.
//
// 2O Part 1.4 — REWIRED to consume the same `useFlowChain` result the
// FlowRail uses. The previous version did its own per-edge `useFrappeList`
// back-link queries and could disagree with the rail (e.g. rail shows a
// downstream as "completed" but menu still offers "Create …" for the same
// stage). The new version reads the rail's stageStatuses: a resolved
// downstream doc renders "View <name>" (never "Create" a second one), an
// unresolved downstream renders the create affordance, and a backward
// edge with no resolved source is hidden (consistent with the rail).
//
// 2M Part 1C: the menu groups backward edges (source links — "Created
// from") ABOVE the forward edges ("Up next") so linked docs are clearly
// stated in both directions on every doctype that has a known source edge.
// 2M Part 3D: while `isLoading` (the chain's `isLoading`) is true, the menu
// renders a skeleton so it never blanks on a hard-refresh.
// Reuses:
//   - useFlowChain (the rail's hook — single source of truth)
//   - buildCreateUrl (via getAdjacencies / buildAdjacencyCreateHref)
//   - existing Button / Skeleton components
// FlowRail's visual chrome is brain-owned (commit cb7de20) and unchanged.

import { useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SkeletonLine } from "@/components/ui/skeleton";
import {
  ArrowRight,
  Eye,
  Plus,
  ChevronLeft,
  Sparkles,
  Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getAdjacencies,
  buildAdjacencyCreateHref,
  buildAdjacencyViewHref,
  type FlowAdjacency,
} from "@/lib/flows/flow-adjacency";
import { useFlowChain } from "@/hooks/flows/use-flow-chain";

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------
interface CrossFlowActionsMenuProps {
  /** Current doctype (e.g. "Sales Order") */
  doctype: string;
  /** Current document name (e.g. "SAL-ORD-2026-00001") */
  name: string;
  /** Optional className for layout */
  className?: string;
  /** Title for the menu (default: "Cross-flow actions") */
  title?: string;
  /** 2M Part 3D: while true, render the loading skeleton (overrides the
   *  chain's own isLoading). Use this when the page is not yet ready to
   *  render cross-flow affordances. */
  isLoading?: boolean;
  /** 2W A1 — When set, every forward-create row renders disabled with this
   *  reason as a tooltip. Used on draft documents where downstream creation
   *  is not yet permitted (e.g. draft SO → "Submit the Sales Order first").
   *  View affordances (resolved targets, backward edges) remain interactive. */
  disableCreate?: string;
}

export function CrossFlowActionsMenu({
  doctype,
  name,
  className,
  title = "Cross-flow actions",
  isLoading = false,
  disableCreate,
}: CrossFlowActionsMenuProps) {
  // 2O Part 1.4: consume the same useFlowChain result the FlowRail uses.
  // This is the *single source of truth* for "is the downstream SI
  // resolved? is the upstream Quotation resolved?". The menu's
  // "View <name>" vs "Create" decision is now a direct read of the
  // stageStatuses the rail consumed.
  const { result: chain, isLoading: chainLoading } = useFlowChain(doctype, name);

  const edges = useMemo(() => getAdjacencies(doctype), [doctype]);

  // Build a quick lookup: targetDoctype → stageStatus from the chain.
  // (2O Part 1.4) This is the single source of truth — same data the rail
  // renders. We never run our own per-edge back-link query.
  // RULES OF HOOKS: this useMemo MUST run before any early return below.
  // Previously it sat AFTER the `edges.length === 0` and `isLoading`
  // returns, so the executed hook count changed when `chainLoading`
  // flipped → "change in the order of Hooks" crash on every detail page.
  const stageStatusByDoctype = useMemo(() => {
    const out: Record<string, { resolvedName?: string; status: string }> = {};
    for (const s of chain.stages) {
      out[s.doctype] = {
        resolvedName: s.documentName,
        status: s.status,
      };
    }
    return out;
  }, [chain]);

  if (edges.length === 0) {
    return null; // Standalone doctype — no rail
  }

  // 2M Part 3D: skeleton for the whole menu. Same B1 chrome as
  // FlowRailSkeleton / WhatsNext.
  if (isLoading || chainLoading) {
    return (
      <div
        className={cn(
          "bg-card rounded-2xl shadow-sm shadow-black/5 border border-border/40 p-5 sm:p-6",
          className,
        )}
        aria-busy="true"
        data-testid="crossflow-skeleton"
      >
        <div className="mb-4 flex items-center gap-2">
          <SkeletonLine className="h-7 w-7 rounded-lg" />
          <SkeletonLine className="h-4 w-32" />
        </div>
        <div className="space-y-2">
          <SkeletonLine className="h-11 w-full rounded-xl" />
          <SkeletonLine className="h-11 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  // 2M Part 1C: split into "Created from" (backward) and "Up next" (forward)
  // groups so linked docs are clearly stated in both directions.
  const backward = edges.filter((e) => e.direction === "backward");
  const forward = edges.filter((e) => e.direction === "forward");

  return (
    <div
      className={cn(
        "bg-card rounded-2xl shadow-sm shadow-black/5 border border-border/40 p-5 sm:p-6",
        className,
      )}
    >
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>

      {backward.length > 0 && (
        <div className="mb-4" data-testid="crossflow-source-group">
          <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Created from
          </p>
          <ul className="space-y-2">
            {backward.map((edge) => (
              <AdjacencyRow
                key={`${edge.direction}-${edge.targetDoctype}`}
                edge={edge}
                sourceDocName={name}
                stageStatus={stageStatusByDoctype[edge.targetDoctype]}
                disableCreate={disableCreate}
              />
            ))}
          </ul>
        </div>
      )}

      {forward.length > 0 && (
        <div data-testid="crossflow-forward-group">
          <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Up next
          </p>
          <ul className="space-y-2">
            {forward.map((edge) => (
              <AdjacencyRow
                key={`${edge.direction}-${edge.targetDoctype}`}
                edge={edge}
                sourceDocName={name}
                stageStatus={stageStatusByDoctype[edge.targetDoctype]}
                disableCreate={disableCreate}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Row — one button per adjacent doctype. The "View vs Create" decision
// reads from the shared `useFlowChain` result, not from a per-edge query
// (2O Part 1.4).
// ---------------------------------------------------------------------------
function AdjacencyRow({
  edge,
  sourceDocName,
  stageStatus,
  disableCreate,
}: {
  edge: FlowAdjacency;
  sourceDocName: string;
  stageStatus?: { resolvedName?: string; status: string };
  disableCreate?: string;
}) {
  // 2O Part 1.4: View ↔ Create decision from the SHARED chain result.
  //   - backward edge with no resolved upstream → hidden (consistent with
  //     the rail's "not in this flow" behavior)
  //   - any edge with a resolved target doc → "View <name>"
  //   - any edge without a resolved target → "Create" (the existing
  //     forward-create flow)
  const resolvedName = stageStatus?.resolvedName;
  const isResolved = !!resolvedName;
  const isView = isResolved;

  // Backward edge with no existing source record → render nothing.
  if (edge.direction === "backward" && !isResolved) {
    return null;
  }

  const href = isView
    ? buildAdjacencyViewHref(edge, resolvedName!)
    : edge.direction === "forward"
      ? buildAdjacencyCreateHref(edge, sourceDocName)
      : null;

  if (!href) return null;

  // 2W A1 — When a forward-create is disabled (e.g. draft SO), render an
  // inert disabled row instead of a navigation link. "View" rows are
  // unaffected — viewing an existing doc is always safe.
  const isCreateDisabled = !isView && edge.direction === "forward" && !!disableCreate;

  const Icon = isView ? Eye : edge.direction === "forward" ? Plus : ChevronLeft;
  const iconClass = isView
    ? "text-info"
    : edge.direction === "forward"
      ? "text-primary"
      : "text-muted-foreground";

  const buttonText = isView ? `View ${resolvedName}` : edge.label;

  if (isCreateDisabled) {
    return (
      <li>
        <div
          className="flex w-full items-center justify-between rounded-xl border border-border/40 bg-muted/40 px-4 py-3 cursor-not-allowed"
          title={disableCreate}
          aria-disabled="true"
        >
          <span className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-muted/60">
              <Icon className="h-3.5 w-3.5 text-muted-foreground/60" />
            </span>
            <span className="text-sm font-medium text-muted-foreground">{buttonText}</span>
          </span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
            {disableCreate}
          </span>
        </div>
      </li>
    );
  }

  return (
    <li>
      <Button
        variant={isView ? "outline" : "default"}
        className={cn(
          "w-full justify-between rounded-xl h-auto py-3 px-4 group",
          !isView && "bg-primary text-primary-foreground hover:bg-primary/90",
        )}
        asChild={false}
      >
        <Link
          href={href}
          className="flex w-full items-center justify-between"
        >
          <span className="flex items-center gap-2.5">
            <span className={cn("flex h-6 w-6 items-center justify-center rounded-md", isView ? "bg-info/10" : "bg-primary-foreground/15")}>
              <Icon className={cn("h-3.5 w-3.5", iconClass, isView && "text-info")} />
            </span>
            <span className="text-sm font-medium">{buttonText}</span>
          </span>
          <ArrowRight className="h-3.5 w-3.5 opacity-60 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </Button>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Compact variant — for embedding inline in detail pages
// ---------------------------------------------------------------------------
export function CrossFlowActionsInline({
  doctype,
  name,
  className,
}: CrossFlowActionsMenuProps) {
  const edges = useMemo(() => getAdjacencies(doctype), [doctype]);

  // 2O Part 1.4: same single source of truth for the inline variant.
  // RULES OF HOOKS: useFlowChain + this useMemo must run before the
  // `edges.length === 0` early return — otherwise a standalone doctype
  // (no edges) executes fewer hooks than a flow doctype and React throws.
  const { result: chain, isLoading: chainLoading } = useFlowChain(doctype, name);
  const stageStatusByDoctype = useMemo(() => {
    const out: Record<string, { resolvedName?: string; status: string }> = {};
    for (const s of chain.stages) {
      out[s.doctype] = { resolvedName: s.documentName, status: s.status };
    }
    return out;
  }, [chain]);

  if (edges.length === 0) return null;

  if (chainLoading) {
    return (
      <div className={cn("flex flex-wrap gap-2", className)} aria-busy="true">
        <SkeletonLine className="h-9 w-32 rounded-full" />
        <SkeletonLine className="h-9 w-32 rounded-full" />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {edges.map((edge) => (
        <AdjacencyChip
          key={`${edge.direction}-${edge.targetDoctype}`}
          edge={edge}
          sourceDocName={name}
          stageStatus={stageStatusByDoctype[edge.targetDoctype]}
        />
      ))}
    </div>
  );
}

function AdjacencyChip({
  edge,
  sourceDocName,
  stageStatus,
}: {
  edge: FlowAdjacency;
  sourceDocName: string;
  stageStatus?: { resolvedName?: string; status: string };
}) {
  const resolvedName = stageStatus?.resolvedName;
  const isView = !!resolvedName;

  if (edge.direction === "backward" && !isView) return null;

  const href = isView
    ? buildAdjacencyViewHref(edge, resolvedName!)
    : edge.direction === "forward"
      ? buildAdjacencyCreateHref(edge, sourceDocName)
      : null;

  if (!href) return null;

  return (
    <Button
      variant={isView ? "outline" : "default"}
      size="sm"
      className="rounded-full"
      asChild={false}
    >
      <Link href={href} className="flex items-center gap-1.5">
        {isView ? <Eye className="h-3 w-3" /> : edge.direction === "forward" ? <Plus className="h-3 w-3" /> : <Link2 className="h-3 w-3" />}
        {isView ? `View ${resolvedName}` : edge.label}
      </Link>
    </Button>
  );
}
