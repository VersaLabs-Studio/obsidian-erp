// app/stock/item/page.tsx
// Obsidian ERP v4.0 — Items List Page (V4 golden template, 2R Part 6).

"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Plus, Box, MoreVertical, Pencil, Trash2, Eye, Package, ListFilter, ArrowUpDown } from "lucide-react";
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
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useFrappeList, useFrappeDelete, useFrappeOptions } from "@/hooks/generic";
import { ListErrorState } from "@/components/ui/list-error-state";
import type { Item } from "@/types/doctype-types";
import { cn } from "@/lib/utils";

interface ItemCardProps {
  item: Item;
  index: number;
  prefersReducedMotion: boolean | null;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function ItemCard({
  item,
  index,
  prefersReducedMotion,
  onView,
  onEdit,
  onDelete,
}: ItemCardProps) {
  const displayName = item.item_name || item.item_code || "Unnamed Item";
  const initials = displayName.substring(0, 2).toUpperCase();

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.25,
        delay: prefersReducedMotion ? 0 : index * 0.04,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={cn(
        "group relative bg-card rounded-2xl border border-border/50",
        "hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5",
        "hover:-translate-y-0.5 transition-all duration-300 cursor-pointer overflow-hidden",
      )}
      onClick={onView}
      data-testid={`item-card-${item.item_code}`}
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-base text-foreground tracking-tight truncate group-hover:text-primary transition-colors">
                {displayName}
              </h3>
              <p className="text-xs font-mono text-muted-foreground truncate">
                {item.item_code}
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
                <DropdownMenuItem className="rounded-lg cursor-pointer" onClick={onView}>
                  <Eye className="h-4 w-4 mr-2" /> View Details
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-lg cursor-pointer" onClick={onEdit}>
                  <Pencil className="h-4 w-4 mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="rounded-lg cursor-pointer text-destructive focus:text-destructive"
                  onClick={onDelete}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-semibold text-muted-foreground/60">
              Group
            </span>
            <span className="font-medium text-foreground truncate">
              {item.item_group || "—"}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-semibold text-muted-foreground/60">
              UOM
            </span>
            <span className="font-medium text-foreground">{item.stock_uom || "—"}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-semibold text-muted-foreground/60">
              Type
            </span>
            <span className="font-medium text-foreground">
              {item.is_stock_item ? "Stock" : "Service"}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function ItemsListPage() {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);
  // 2Y-R3 — Filter / sort / order controls.
  const [itemGroup, setItemGroup] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "stock" | "service">("all");
  const [sortField, setSortField] = useState<"modified" | "item_code" | "item_name" | "creation">("modified");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Item Group options for the filter dropdown.
  const { data: itemGroups } = useFrappeOptions("Item Group", {
    labelField: "item_group_name",
    limit: 500,
  });

  const filters = useMemo(() => {
    const f: [string, string, unknown][] = [];
    if (itemGroup) f.push(["item_group", "=", itemGroup]);
    if (typeFilter === "stock") f.push(["is_stock_item", "=", 1]);
    if (typeFilter === "service") f.push(["is_stock_item", "=", 0]);
    return f;
  }, [itemGroup, typeFilter]);

  const {
    data: items = [],
    isLoading,
    error,
    refetch,
  } = useFrappeList<Item>("Item", {
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
      "creation",
    ],
    filters,
    orderBy: { field: sortField, order: sortOrder },
    limit: 200,
  });

  const deleteMutation = useFrappeDelete("Item", {
    onSuccess: () => {
      refetch();
      setDeleteTarget(null);
    },
  });

  const filteredItems = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(
      (i) =>
        i.item_name?.toLowerCase().includes(q) ||
        i.item_code.toLowerCase().includes(q) ||
        i.item_group?.toLowerCase().includes(q),
    );
  }, [items, search]);

  const totalCount = filteredItems.length;
  const stockCount = useMemo(
    () => filteredItems.filter((i) => i.is_stock_item && !i.disabled).length,
    [filteredItems],
  );
  const serviceCount = useMemo(
    () => filteredItems.filter((i) => !i.is_stock_item && !i.disabled).length,
    [filteredItems],
  );

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.name);
  };

  if (isLoading) return <LoadingState type="cards" count={6} />;

  if (error) {
    return <ListErrorState error={error} label="items" />;
  }

  const groupOptions = [
    { value: "", label: "All Groups" },
    ...(itemGroups ?? []).map((g) => ({ value: g.value, label: String(g.label) })),
  ];
  const typeOptions = [
    { value: "all", label: "All Types" },
    { value: "stock", label: "Stock Items" },
    { value: "service", label: "Service Items" },
  ];
  const sortOptions = [
    { value: "modified", label: "Last Modified" },
    { value: "creation", label: "Date Created" },
    { value: "item_code", label: "Item Code" },
    { value: "item_name", label: "Item Name" },
  ];

  return (
    <div className="space-y-6">
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

      <PageHeader
        title="Inventory"
        subtitle={`${totalCount} item${totalCount !== 1 ? "s" : ""}`}
        showSearch
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search items..."
        actions={
          <Button
            className="rounded-full px-6 shadow-lg shadow-primary/20"
            onClick={() => router.push("/stock/item/new")}
          >
            <Plus className="h-4 w-4 mr-2" /> New Item
          </Button>
        }
      />

      {/* 2Y-R3 — Filter / Sort / Order toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ListFilter className="h-4 w-4" />
          <span className="font-medium">Filter</span>
        </div>
        <div className="w-44">
          <SearchableSelect
            options={groupOptions}
            value={itemGroup}
            onValueChange={setItemGroup}
            placeholder="Item group"
          />
        </div>
        <div className="w-40">
          <SearchableSelect
            options={typeOptions}
            value={typeFilter}
            onValueChange={(v) => setTypeFilter(v as "all" | "stock" | "service")}
            placeholder="Type"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground ml-2">
          <ArrowUpDown className="h-4 w-4" />
          <span className="font-medium">Sort</span>
        </div>
        <div className="w-44">
          <SearchableSelect
            options={sortOptions}
            value={sortField}
            onValueChange={(v) => setSortField(v as typeof sortField)}
            placeholder="Sort by"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSortOrder((o) => (o === "asc" ? "desc" : "asc"))}
          className="rounded-full"
        >
          {sortOrder === "asc" ? "Ascending" : "Descending"}
        </Button>
        {(itemGroup || typeFilter !== "all" || sortField !== "modified" || sortOrder !== "desc") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setItemGroup("");
              setTypeFilter("all");
              setSortField("modified");
              setSortOrder("desc");
            }}
            className="rounded-full"
          >
            Reset
          </Button>
        )}
      </div>

      {/* KPI Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <InfoCard variant="gradient">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Box className="h-5 w-5 text-primary" />
            </div>
            <DataPoint label="Total Items" value={totalCount} />
          </div>
        </InfoCard>
        <InfoCard variant="gradient">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <DataPoint label="Stock Items" value={stockCount} />
          </div>
        </InfoCard>
        <InfoCard variant="gradient">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Box className="h-5 w-5 text-primary" />
            </div>
            <DataPoint label="Service Items" value={serviceCount} />
          </div>
        </InfoCard>
      </div>

      {filteredItems.length === 0 ? (
        <EmptyState
          title="No items found"
          description={
            search
              ? "Try adjusting your search criteria"
              : "Get started by creating your first item."
          }
          action={
            !search && (
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-10">
          {filteredItems.map((item, index) => (
            <ItemCard
              key={item.name}
              item={item}
              index={index}
              prefersReducedMotion={prefersReducedMotion}
              onView={() => router.push(`/stock/item/${encodeURIComponent(item.name)}`)}
              onEdit={() =>
                router.push(`/stock/item/${encodeURIComponent(item.name)}/edit`)
              }
              onDelete={() => setDeleteTarget(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
}