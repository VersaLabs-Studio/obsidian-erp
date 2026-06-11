"use client";

// components/cross-flow/CrossFlowActionsMenu.tsx
// Obsidian ERP v4.0 — Universal Cross-Flow Actions Menu (master §12).
//
// Detail-sidebar "Actions" menu: the Customer-360 quick-actions menu,
// generalized to every transactional doctype. Each adjacent doctype
// (forward + backward) is offered as a button, gated by the back-link
// short-circuit — if an adjacent record already exists, the button
// reads "View <name>" (redirect) and never "Create" (no duplicate).
//
// Reuses:
//   - `AUTO_FILL_REGISTRY` + `resolveFlowChain` (logic, not visual) via
//     flow-adjacency.ts (derived from AUTO_FILL_REGISTRY keys)
//   - `buildCreateUrl` (via buildAdjacencyCreateHref)
//   - useFrappeList for back-link queries
//   - existing Button / Skeleton components
// FlowRail is NOT modified — this is a new sidebar surface, the same data
// source FlowRail consumes (Reporting Contract rule 2 — no new engines).

import { useMemo } from "react";
import Link from "next/link";
import { useFrappeList } from "@/hooks/generic";
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
  fillBackLinkFilter,
  type FlowAdjacency,
} from "@/lib/flows/flow-adjacency";

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
}

export function CrossFlowActionsMenu({
  doctype,
  name,
  className,
  title = "Cross-flow actions",
}: CrossFlowActionsMenuProps) {
  const edges = useMemo(() => getAdjacencies(doctype), [doctype]);

  if (edges.length === 0) {
    return null; // Standalone doctype — no rail
  }

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

      <ul className="space-y-2">
        {edges.map((edge) => (
          <AdjacencyRow
            key={`${edge.direction}-${edge.targetDoctype}`}
            edge={edge}
            sourceDocName={name}
          />
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Row — one button per adjacent doctype, with back-link short-circuit
// ---------------------------------------------------------------------------
function AdjacencyRow({
  edge,
  sourceDocName,
}: {
  edge: FlowAdjacency;
  sourceDocName: string;
}) {
  // Back-link query — only if we have a known back-link pattern.
  const filled = useMemo(
    () =>
      edge.backLink
        ? edge.backLink.filters.map((f) => fillBackLinkFilter(f, sourceDocName))
        : [],
    [edge.backLink, sourceDocName],
  );

  const { data: existing, isLoading } = useFrappeList<{ name: string; parent?: string }>(
    edge.backLink?.doctype ?? "",
    {
      filters: filled,
      fields: edge.backLink?.selectFields ?? ["name"],
      limit: 1,
    },
    {
      enabled: !!edge.backLink,
    },
  );

  const existingRecord = existing && existing.length > 0 ? existing[0] : null;
  // 2L 1C: child-table back-link queries return rows with a `parent` field
  // (the child row's name is in `name`, the parent's name is in `parent`).
  // Use the parent when present so the View link points to the parent doc.
  const existingParentName = existingRecord?.parent ?? existingRecord?.name ?? null;

  // Backward edge with no existing source record → render nothing.
  if (edge.direction === "backward" && !existingRecord) {
    return null;
  }

  // Determine the affordance
  const isView = !!existingRecord;
  const href = isView
    ? buildAdjacencyViewHref(edge, existingParentName ?? existingRecord!.name)
    : edge.direction === "forward"
      ? buildAdjacencyCreateHref(edge, sourceDocName)
      : null;

  if (!href) return null;

  const Icon = isView ? Eye : edge.direction === "forward" ? Plus : ChevronLeft;
  const iconClass = isView
    ? "text-info"
    : edge.direction === "forward"
      ? "text-primary"
      : "text-muted-foreground";

  const buttonText = isView
    ? `View ${existingParentName ?? existingRecord!.name}`
    : edge.label;

  return (
    <li>
      {isLoading ? (
        <SkeletonLine className="h-11 w-full rounded-xl" />
      ) : (
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
      )}
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
  if (edges.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {edges.map((edge) => (
        <AdjacencyChip
          key={`${edge.direction}-${edge.targetDoctype}`}
          edge={edge}
          sourceDocName={name}
        />
      ))}
    </div>
  );
}

function AdjacencyChip({
  edge,
  sourceDocName,
}: {
  edge: FlowAdjacency;
  sourceDocName: string;
}) {
  const filled = useMemo(
    () =>
      edge.backLink
        ? edge.backLink.filters.map((f) => fillBackLinkFilter(f, sourceDocName))
        : [],
    [edge.backLink, sourceDocName],
  );

  const { data: existing, isLoading } = useFrappeList<{ name: string; parent?: string }>(
    edge.backLink?.doctype ?? "",
    {
      filters: filled,
      fields: edge.backLink?.selectFields ?? ["name"],
      limit: 1,
    },
    { enabled: !!edge.backLink },
  );

  const existingRecord = existing && existing.length > 0 ? existing[0] : null;
  const existingParentName = existingRecord?.parent ?? existingRecord?.name ?? null;

  if (edge.direction === "backward" && !existingRecord) return null;

  const isView = !!existingRecord;
  const href = isView
    ? buildAdjacencyViewHref(edge, existingParentName ?? existingRecord!.name)
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
        {isView ? `View ${existingParentName ?? existingRecord!.name}` : edge.label}
      </Link>
    </Button>
  );
}
