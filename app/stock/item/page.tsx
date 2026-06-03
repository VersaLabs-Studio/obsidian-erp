// app/stock/item/page.tsx
// Obsidian ERP v4.0 - Items List Page (Schema-Driven Architecture)

"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Edit2, Trash2, Eye } from "lucide-react";
import { useRouter } from "next/navigation";

// v3.0: Import from generated types
import { Item } from "@/types/doctype-types";

// v3.0: Use generic hooks instead of custom hooks
import {
  useFrappeList,
  useFrappeDelete,
  useFrappeOptions,
} from "@/hooks/generic";

// v3.0: Use smart components
import {
  StatusBadge,
  EmptyState,
  LoadingState,
  ConfirmDialog,
} from "@/components/smart";

import { cn } from "@/lib/utils";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { useExport } from "@/hooks/useExport";

// ============================================================================
// Item Row Component
// ============================================================================

interface ItemRowProps {
  item: Item;
  index: number;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function ItemRow({ item, index, onView, onEdit, onDelete }: ItemRowProps) {
  // Safe access to item_name with fallback
  const displayName = item.item_name || item.item_code || "Unnamed Item";
  const initials = displayName.substring(0, 2).toUpperCase();

  return (
    <div
      className="group relative flex items-start justify-between p-4 mb-2 bg-card hover:bg-card/80 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300 rounded-2xl cursor-pointer animate-slide-up"
      style={{ animationDelay: `${index * 50}ms`, transitionDelay: "0ms" }}
      onClick={onView}
    >
      <div className="flex items-start gap-4 min-w-0 flex-1">
        <div className="h-10 w-10 rounded-full bg-secondary/50 flex items-center justify-center text-xs font-bold text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors shrink-0">
          {initials}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-bold text-foreground text-sm truncate">
            {displayName}
          </span>
          <span className="text-xs text-muted-foreground font-mono">
            {item.item_code}
          </span>
        </div>
      </div>

      <div className="hidden sm:flex items-start gap-8 text-sm text-muted-foreground shrink-0">
        <div className="flex flex-col items-end w-24">
          <span className="text-[10px] uppercase font-semibold text-muted-foreground/50">
            Group
          </span>
          <span className="font-medium text-foreground truncate">
            {item.item_group}
          </span>
        </div>
        <div className="flex flex-col items-end w-20">
          <span className="text-[10px] uppercase font-semibold text-muted-foreground/50">
            UOM
          </span>
          <span className="font-medium text-foreground">{item.stock_uom}</span>
        </div>
      </div>

      <div className="flex items-center gap-3 pl-4 border-l border-transparent sm:border-border/40 shrink-0">
        {/* v3.0: Use StatusBadge smart component */}
        <StatusBadge status={item.disabled ? "disabled" : "active"} size="sm" />

        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full hover:bg-secondary"
              >
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="rounded-xl border-none shadow-xl bg-popover/90 backdrop-blur-xl"
            >
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem className="rounded-lg" onClick={onView}>
                <Eye className="mr-2 h-4 w-4" /> View
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-lg" onClick={onEdit}>
                <Edit2 className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border/50" />
              <DropdownMenuItem
                className="rounded-lg text-destructive focus:bg-destructive/10"
                onClick={onDelete}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function ItemsListPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // v3.0: Use generic useFrappeList hook with generated Item type
  const { data: items = [], isLoading } = useFrappeList<Item>("Item", {
    fields: [
      "name",
      "item_code",
      "item_name",
      "item_group",
      "stock_uom",
      "brand",
      "is_stock_item",
      "disabled",
      "modified",
    ],
    orderBy: { field: "modified", order: "desc" },
    limit: 100,
  });

  // v3.0: Use generic useFrappeOptions hook for dropdowns
  const { data: itemGroupOptions = [] } = useFrappeOptions("Item Group", {
    limit: 100,
  });

  // v3.0: Use generic delete mutation
  const deleteMutation = useFrappeDelete("Item", {
    successMessage: "Item deleted successfully",
  });

  const { exportData, isExporting } = useExport();

  // Filter items based on search and filters (client-side for responsiveness)
  const filteredItems = useMemo(() => {
    let result = items;

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.item_name?.toLowerCase().includes(q) ||
          i.item_code.toLowerCase().includes(q)
      );
    }

    // Group filter
    if (groupFilter !== "all") {
      result = result.filter((i) => i.item_group === groupFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      if (statusFilter === "active") {
        result = result.filter((i) => !i.disabled);
      } else if (statusFilter === "inactive") {
        result = result.filter((i) => i.disabled);
      }
    }

    return result;
  }, [items, searchQuery, groupFilter, statusFilter]);

  // Handle export
  const handleExport = async (format: "csv" | "pdf") => {
    const exportItems = filteredItems.map((item) => ({
      item_code: item.item_code,
      item_name: item.item_name || "",
      item_group: item.item_group,
      stock_uom: item.stock_uom,
      status: item.disabled ? "Inactive" : "Active",
    }));

    await exportData(exportItems, "items", "Inventory Items", format, {
      item_code: "Item Code",
      item_name: "Item Name",
      item_group: "Group",
      stock_uom: "UOM",
      status: "Status",
    });
  };

  // v3.0: State for delete confirmation dialog
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);

  // Handle delete with dialog
  const handleDeleteConfirm = async () => {
    if (deleteTarget) {
      try {
        await deleteMutation.mutateAsync(deleteTarget.name);
      } catch (error) {
        console.error("Failed to delete item:", error);
      }
    }
    setDeleteTarget(null);
  };

  const hasFilters =
    Boolean(searchQuery) || groupFilter !== "all" || statusFilter !== "all";

  // Build item groups from options
  const itemGroups = itemGroupOptions.map((opt) => opt.value);

  return (
    <div className="space-y-6">
      {/* v3.0: Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Item"
        description={`Are you sure you want to delete "${
          deleteTarget?.item_name || deleteTarget?.item_code
        }"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        loading={deleteMutation.isPending}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-slide-up">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground mt-1">
            Manage your catalogue and stock.
          </p>
        </div>
        <Button
          onClick={() => router.push("/stock/item/new")}
          className="rounded-full px-6 shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all"
        >
          <Plus className="h-4 w-4 mr-2" /> New Item
        </Button>
      </div>

      {/* Toolbar */}
      <ListToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search items..."
        onExport={handleExport}
        isExporting={isExporting}
        filters={[
          {
            key: "group",
            label: "Item Group",
            value: groupFilter,
            onChange: setGroupFilter,
            options: [
              { label: "All Groups", value: "all" },
              ...itemGroups.map((g) => ({ label: g, value: g })),
            ],
          },
          {
            key: "status",
            label: "Status",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { label: "All", value: "all" },
              { label: "Active", value: "active" },
              { label: "Inactive", value: "inactive" },
            ],
          },
        ]}
      />

      {/* Items List */}
      <div className="min-h-[400px]">
        {isLoading ? (
          // v3.0: Use LoadingState smart component
          <LoadingState rows={5} variant="list" />
        ) : filteredItems.length === 0 ? (
          // v3.0: Use EmptyState smart component
          <EmptyState
            title="No Items Found"
            description={
              hasFilters
                ? "Try adjusting your search or filters."
                : "Get started by creating your first item."
            }
            variant={hasFilters ? "no-results" : "no-data"}
            action={
              !hasFilters && (
                <Button
                  onClick={() => router.push("/stock/item/new")}
                  className="rounded-full"
                >
                  <Plus className="h-4 w-4 mr-2" /> Create First Item
                </Button>
              )
            }
          />
        ) : (
          <div className="pb-10">
            {filteredItems.map((item, idx) => (
              <ItemRow
                key={item.name}
                item={item}
                index={idx}
                onView={() =>
                  router.push(`/stock/item/${encodeURIComponent(item.name)}`)
                }
                onEdit={() =>
                  router.push(
                    `/stock/item/${encodeURIComponent(item.name)}/edit`
                  )
                }
                onDelete={() => setDeleteTarget(item)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
