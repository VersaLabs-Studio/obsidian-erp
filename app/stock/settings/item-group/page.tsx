// app/stock/settings/item-group/page.tsx
// Obsidian ERP v4.0 — Item Group settings list (2R Part 7 + 2S Part 8 tree).
// Tree view with indentation, expand/collapse, and premium motion.
// Mirrors the Inventory → Settings golden template (KPI bar + premium motion).

"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import {
  Plus,
  FolderTree,
  ChevronRight,
  Layers,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
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

interface ItemGroupRow {
  name: string;
  item_group_name?: string;
  parent_item_group?: string;
  is_group?: number;
}

interface TreeNode extends ItemGroupRow {
  children: TreeNode[];
  depth: number;
}

const ROOT_KEY = "__root__";

export default function ItemGroupListPage() {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ItemGroupRow | null>(null);
  // 2S Part 8 — expand/collapse state. Set of parent group names that are
  // expanded. Defaults to all expanded when no search is active.
  const [expanded, setExpanded] = useState<Set<string>>(new Set([ROOT_KEY]));

  const {
    data: groups = [],
    isLoading,
    error,
    refetch,
  } = useFrappeList<ItemGroupRow>("Item Group", {
    fields: ["name", "item_group_name", "parent_item_group", "is_group"],
    orderBy: { field: "lft", order: "asc" },
    limit: 500,
  });

  const deleteMutation = useFrappeDelete("Item Group", {
    onSuccess: () => {
      refetch();
      setDeleteTarget(null);
    },
  });

  // 2S Part 8 — build a tree from the flat lft-ordered list.
  // Because the data is already sorted by `lft`, a single pass groups
  // children under their parent. "All Item Groups" is the ERPNext root.
  const tree = useMemo<TreeNode[]>(() => {
    const map = new Map<string, TreeNode>();
    const roots: TreeNode[] = [];

    // First pass: create nodes
    for (const g of groups) {
      map.set(g.name, { ...g, children: [], depth: 0 });
    }

    // Second pass: attach children
    for (const g of groups) {
      const node = map.get(g.name)!;
      const parentName = g.parent_item_group;
      if (parentName && parentName !== "All Item Groups" && map.has(parentName)) {
        const parent = map.get(parentName)!;
        node.depth = parent.depth + 1;
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }, [groups]);

  // Flatten tree for display, respecting expand/collapse
  const flatDisplay = useMemo(() => {
    const result: TreeNode[] = [];
    const walk = (nodes: TreeNode[]) => {
      for (const node of nodes) {
        result.push(node);
        if (node.children.length > 0 && expanded.has(node.name)) {
          walk(node.children);
        }
      }
    };
    walk(tree);
    return result;
  }, [tree, expanded]);

  const filtered = useMemo(() => {
    if (!search) return flatDisplay;
    const q = search.toLowerCase();
    // When searching, show all nodes whose name matches OR whose descendant matches
    const matchSet = new Set<string>();
    const walk = (nodes: TreeNode[]) => {
      for (const node of nodes) {
        const nameMatch =
          (node.item_group_name ?? node.name).toLowerCase().includes(q) ||
          node.name.toLowerCase().includes(q);
        if (nameMatch) {
          // Mark this node and all ancestors as visible
          let current: TreeNode | undefined = node;
          while (current) {
            matchSet.add(current.name);
            // find parent by scanning groups
            current = groups.find(
              (g) => g.name === current!.parent_item_group,
            )
              ? map.get(current!.parent_item_group!)
              : undefined;
          }
        }
        walk(node.children);
      }
    };
    const map = new Map<string, TreeNode>();
    for (const g of groups) map.set(g.name, { ...g, children: [], depth: 0 });
    for (const g of groups) {
      const n = map.get(g.name)!;
      const p = g.parent_item_group;
      if (p && p !== "All Item Groups" && map.has(p)) {
        map.get(p)!.children.push(n);
      }
    }
    walk(tree);
    return flatDisplay.filter((n) => matchSet.has(n.name));
  }, [flatDisplay, search, tree, groups]);

  const totalCount = groups.length;
  const topLevelCount = useMemo(
    () =>
      groups.filter(
        (g) =>
          !g.parent_item_group || g.parent_item_group === "All Item Groups",
      ).length,
    [groups],
  );
  const subgroupCount = totalCount - topLevelCount;

  const toggleExpand = useCallback((name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpanded(new Set(groups.map((g) => g.name)));
  }, [groups]);

  const collapseAll = useCallback(() => {
    setExpanded(new Set([ROOT_KEY]));
  }, []);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.name);
  };

  if (isLoading) return <LoadingState type="table" count={8} />;
  if (error) return <ListErrorState error={error} label="item groups" />;

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Item Group"
        description={`Are you sure you want to delete "${deleteTarget?.item_group_name || deleteTarget?.name}"? Items using this group will break.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        loading={deleteMutation.isPending}
      />

      <PageHeader
        title="Item Groups"
        subtitle={`${totalCount} group${totalCount !== 1 ? "s" : ""}`}
        showSearch
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search item groups..."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={expandAll}
            >
              Expand All
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={collapseAll}
            >
              Collapse
            </Button>
            <Button
              className="rounded-full px-6 shadow-lg shadow-primary/20"
              onClick={() =>
                router.push("/stock/settings/item-group/new")
              }
            >
              <Plus className="h-4 w-4 mr-2" /> New Item Group
            </Button>
          </div>
        }
      />

      {/* KPI Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <InfoCard variant="gradient">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FolderTree className="h-5 w-5 text-primary" />
            </div>
            <DataPoint label="Total Groups" value={totalCount} />
          </div>
        </InfoCard>
        <InfoCard variant="gradient">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <DataPoint label="Top Level" value={topLevelCount} />
          </div>
        </InfoCard>
        <InfoCard variant="gradient">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FolderTree className="h-5 w-5 text-primary" />
            </div>
            <DataPoint label="Subgroups" value={subgroupCount} />
          </div>
        </InfoCard>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No item groups found"
          description={
            search
              ? "Try adjusting your search."
              : "Create your first item group to organize your inventory."
          }
          action={
            !search && (
              <Button
                onClick={() =>
                  router.push("/stock/settings/item-group/new")
                }
                className="rounded-full"
              >
                <Plus className="h-4 w-4 mr-2" /> Create First Group
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-1.5 pb-10">
          <AnimatePresence initial={false}>
            {filtered.map((g, index) => (
              <motion.div
                key={g.name}
                layout
                initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? undefined : { opacity: 0, y: -4 }}
                transition={{
                  duration: 0.18,
                  delay: prefersReducedMotion ? 0 : Math.min(index * 0.015, 0.3),
                  ease: [0.16, 1, 0.3, 1],
                }}
                className={cn(
                  "group flex items-center justify-between gap-3 px-4 py-3 bg-card rounded-2xl border border-border/50",
                  "hover:border-primary/20 hover:shadow-md transition-all",
                )}
                style={{ marginLeft: `${g.depth * 24}px` }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Expand/collapse toggle for parent groups */}
                  {g.children.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => toggleExpand(g.name)}
                      className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-secondary/50 transition-colors"
                    >
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform duration-200",
                          expanded.has(g.name) && "rotate-90",
                        )}
                      />
                    </button>
                  ) : (
                    <div className="h-6 w-6" /> /* spacer for alignment */
                  )}
                  <div
                    className={cn(
                      "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                      g.is_group
                        ? "bg-primary/10"
                        : "bg-muted/50",
                    )}
                  >
                    <FolderTree
                      className={cn(
                        "h-4 w-4",
                        g.is_group
                          ? "text-primary"
                          : "text-muted-foreground",
                      )}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">
                      {g.item_group_name || g.name}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      {g.depth > 0 ? (
                        <>depth {g.depth}</>
                      ) : (
                        <>top-level</>
                      )}
                      {g.is_group ? <> · group</> : null}
                      {g.children.length > 0 ? (
                        <> · {g.children.length} child{g.children.length !== 1 ? "ren" : ""}</>
                      ) : null}
                    </p>
                  </div>
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
                            `/stock/settings/item-group/${encodeURIComponent(g.name)}`,
                          )
                        }
                      >
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="rounded-lg cursor-pointer"
                        onClick={() =>
                          router.push(
                            `/stock/settings/item-group/${encodeURIComponent(g.name)}/edit`,
                          )
                        }
                      >
                        <Pencil className="h-4 w-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="rounded-lg cursor-pointer text-destructive focus:text-destructive"
                        onClick={() => setDeleteTarget(g)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
