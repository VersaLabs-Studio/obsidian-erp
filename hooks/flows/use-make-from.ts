// hooks/flows/use-make-from.ts
// Obsidian ERP v4.0 — Canonical make-from client (2R Part 2).
//
// Wraps `POST /api/erpnext/make-from` so every transactional `/new`
// page hydrates from ERPNext's own server-side mapper (the same
// canonicalization pattern as the WO make_stock_entry fix from 2P-FINAL
// Part C). The hand-mapping registry in `lib/flows/flow-auto-fill.ts`
// remains as a silent fallback when the route errors or the mapper is
// not registered for a (source, target) pair.
//
// Usage:
//
//   const sourceName = searchParams.get("quotation");
//   const { draft, isLoading, error } = useMakeFrom({
//     sourceDoctype: "Quotation",
//     sourceName,
//     targetDoctype: "Sales Order",
//     enabled: !!sourceName,
//   });
//   useEffect(() => {
//     if (draft) hydrateFromDraft(draft);
//   }, [draft]);
//
// The hook is per-component — TanStack caches by queryKey so two pages
// asking for the same draft share one network call. Stale time is 5
// minutes: a mapper draft is a back-link cache, not a live query.

"use client";

import { useQuery } from "@tanstack/react-query";

export interface UseMakeFromOptions {
  sourceDoctype: string;
  sourceName: string | null | undefined;
  targetDoctype: string;
  itemRows?: string[];
  overrides?: Record<string, unknown>;
  enabled?: boolean;
}

export interface MakeFromDraft {
  doctype: string;
  doc: Record<string, unknown>;
}

export function useMakeFrom(opts: UseMakeFromOptions) {
  const enabled =
    (opts.enabled ?? true) &&
    !!opts.sourceDoctype &&
    !!opts.sourceName &&
    !!opts.targetDoctype;

  const query = useQuery<MakeFromDraft, Error>({
    queryKey: [
      "make-from",
      opts.sourceDoctype,
      opts.targetDoctype,
      opts.sourceName ?? "",
      opts.itemRows ?? [],
      opts.overrides ?? {},
    ],
    queryFn: async () => {
      const res = await fetch("/api/erpnext/make-from", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceDoctype: opts.sourceDoctype,
          sourceName: opts.sourceName,
          targetDoctype: opts.targetDoctype,
          itemRows: opts.itemRows,
          overrides: opts.overrides,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body.details ||
            body.error ||
            `Make-from failed: ${opts.sourceDoctype} → ${opts.targetDoctype}`,
        );
      }
      const json = await res.json();
      const data = json.data as { doctype: string; doc: Record<string, unknown> };
      return { doctype: data.doctype, doc: data.doc };
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  return {
    draft: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export default useMakeFrom;