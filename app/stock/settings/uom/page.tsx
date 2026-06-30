// app/stock/settings/uom/page.tsx
// Obsidian ERP v4.0 — UOM settings list (2R Part 7).

"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Plus, Ruler, MoreVertical, Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PageHeader,
  EmptyState,
  LoadingState,
  ConfirmDialog,
} from "@/components/smart";
import { InfoCard, DataPoint } from "@/components/ui/info-card";
import { useFrappeList, useFrappeDelete } from "@/hooks/generic";
import { ListErrorState } from "@/components/ui/list-error-state";
import { cn } from "@/lib/utils";

interface UomRow {
  name: string;
  uom_name?: string;
  enabled?: number;
  must_be_whole_number?: number;
}

export default function UomListPage() {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<UomRow | null>(null);

  const {
    data: uoms = [],
    isLoading,
    error,
    refetch,
  } = useFrappeList<UomRow>("UOM", {
    fields: ["name", "uom_name", "enabled", "must_be_whole_number"],
    orderBy: { field: "name", order: "asc" },
    limit: 200,
  });

  const deleteMutation = useFrappeDelete("UOM", {
    onSuccess: () => {
      refetch();
      setDeleteTarget(null);
    },
  });

  // 2S Part 1 — inline toggle for must_be_whole_number. PUT to the UOM
  // endpoint and optimistically update the local list.
  const [toggling, setToggling] = useState<string | null>(null);
  const toggleWholeNumber = useCallback(
    async (uom: UomRow) => {
      const current = Number(uom.must_be_whole_number ?? 0);
      const next = current === 1 ? 0 : 1;
      setToggling(uom.name);
      try {
        // 9R.3: Use the dedicated UOM API route instead of importing the
        // server-only frappe-client singleton (which crashes on the client
        // because ERP_API_KEY/SECRET are not exposed to the browser).
        const res = await fetch(`/api/stock/settings/uom/${encodeURIComponent(uom.name)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ must_be_whole_number: next }),
        });
        if (!res.ok) throw new Error("Failed to update UOM");
        // Optimistic update
        refetch();
      } catch {
        // Silently fail — the user can retry
      } finally {
        setToggling(null);
      }
    },
    [refetch],
  );

  const filtered = useMemo(() => {
    if (!search) return uoms;
    const q = search.toLowerCase();
    return uoms.filter(
      (u) => (u.uom_name ?? u.name).toLowerCase().includes(q),
    );
  }, [uoms, search]);

  const totalCount = filtered.length;
  const enabledCount = useMemo(
    () => filtered.filter((u) => Number(u.enabled ?? 1) === 1).length,
    [filtered],
  );
  const wholeOnlyCount = useMemo(
    () => filtered.filter((u) => Number(u.must_be_whole_number ?? 0) === 1).length,
    [filtered],
  );

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.name);
  };

  if (isLoading) return <LoadingState type="table" count={8} />;
  if (error) return <ListErrorState error={error} label="units of measure" />;

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete UOM"
        description={`Are you sure you want to delete "${deleteTarget?.uom_name || deleteTarget?.name}"? Items using this UOM will break.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        loading={deleteMutation.isPending}
      />

      <PageHeader
        title="Units of Measure"
        subtitle={`${totalCount} UOM${totalCount !== 1 ? "s" : ""}`}
        showSearch
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search UOMs..."
        actions={
          <Button
            className="rounded-full px-6 shadow-lg shadow-primary/20"
            onClick={() => router.push("/stock/settings/uom/new")}
          >
            <Plus className="h-4 w-4 mr-2" /> New UOM
          </Button>
        }
      />

      {/* KPI Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <InfoCard variant="gradient">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Ruler className="h-5 w-5 text-primary" />
            </div>
            <DataPoint label="Total UOMs" value={totalCount} />
          </div>
        </InfoCard>
        <InfoCard variant="gradient">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Check className="h-5 w-5 text-primary" />
            </div>
            <DataPoint label="Enabled" value={enabledCount} />
          </div>
        </InfoCard>
        <InfoCard variant="gradient">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <X className="h-5 w-5 text-primary" />
            </div>
            <DataPoint label="Whole Numbers Only" value={wholeOnlyCount} />
          </div>
        </InfoCard>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No units of measure found"
          description={
            search
              ? "Try adjusting your search."
              : "Create your first unit of measure."
          }
          action={
            !search && (
              <Button
                onClick={() => router.push("/stock/settings/uom/new")}
                className="rounded-full"
              >
                <Plus className="h-4 w-4 mr-2" /> Create First UOM
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-2 pb-10">
          {filtered.map((u, index) => (
            <motion.div
              key={u.name}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.18,
                delay: prefersReducedMotion ? 0 : Math.min(index * 0.02, 0.4),
                ease: [0.16, 1, 0.3, 1],
              }}
              className={cn(
                "group flex items-center justify-between gap-3 px-4 py-3 bg-card rounded-2xl border border-border/50",
                "hover:border-primary/20 hover:shadow-md transition-all",
              )}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Ruler className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">
                    {u.uom_name || u.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {Number(u.enabled ?? 1) === 1 ? "enabled" : "disabled"}
                  </p>
                </div>
              </div>
              {/* 2S Part 1 — inline toggle for must_be_whole_number */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={toggling === u.name}
                  onClick={() => toggleWholeNumber(u)}
                  className={cn(
                    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out",
                    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                    Number(u.must_be_whole_number ?? 0) === 1
                      ? "bg-primary"
                      : "bg-input",
                    toggling === u.name && "opacity-50 cursor-wait",
                  )}
                  title={
                    Number(u.must_be_whole_number ?? 0) === 1
                      ? "Whole numbers only — click to allow fractions"
                      : "Allows fractions — click to require whole numbers"
                  }
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out",
                      Number(u.must_be_whole_number ?? 0) === 1
                        ? "translate-x-4"
                        : "translate-x-0",
                    )}
                  />
                </button>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {Number(u.must_be_whole_number ?? 0) === 1 ? "whole" : "fraction"}
                </span>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="rounded-xl border-border/50 shadow-xl bg-popover/95 backdrop-blur-xl p-1.5 min-w-[140px]"
                  >
                    <DropdownMenuItem
                      className="rounded-lg cursor-pointer"
                      onClick={() =>
                        router.push(
                          `/stock/settings/uom/${encodeURIComponent(u.name)}`,
                        )
                      }
                    >
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="rounded-lg cursor-pointer"
                      onClick={() =>
                        router.push(
                          `/stock/settings/uom/${encodeURIComponent(u.name)}/edit`,
                        )
                      }
                    >
                      <Pencil className="h-4 w-4 mr-2" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="rounded-lg cursor-pointer text-destructive focus:text-destructive"
                      onClick={() => setDeleteTarget(u)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}