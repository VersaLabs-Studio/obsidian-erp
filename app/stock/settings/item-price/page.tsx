"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Tag,
  ShoppingCart,
  BadgeDollarSign,
  MoreVertical,
  Trash2,
  ExternalLink,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useFrappeList, useFrappeDelete } from "@/hooks/generic";
import {
  PageHeader,
  EmptyState,
  LoadingState,
  ConfirmDialog,
} from "@/components/smart";
import { FrappeSelect } from "@/components/smart/frappe-select";
import { InfoCard, DataPoint } from "@/components/ui/info-card";
import type { ItemPrice } from "@/types/doctype-types";
import { ListErrorState } from "@/components/ui/list-error-state";

interface ItemPriceFilters {
  price_list?: string;
  item_code?: string;
}

export default function ItemPriceListPage() {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const [filters, setFilters] = useState<ItemPriceFilters>({});
  const [deleteTarget, setDeleteTarget] = useState<ItemPrice | null>(null);

  const {
    data: itemPrices,
    isLoading,
    error,
    refetch,
  } = useFrappeList<ItemPrice>("Item Price", {
    orderBy: { field: "modified", order: "desc" },
    limit: 500,
    filters: [
      ...(filters.price_list
        ? [["price_list", "=", filters.price_list] as [string, string, unknown]]
        : []),
      ...(filters.item_code
        ? [["item_code", "=", filters.item_code] as [string, string, unknown]]
        : []),
    ],
  });

  const deleteMutation = useFrappeDelete("Item Price", {
    onSuccess: () => {
      refetch();
      setDeleteTarget(null);
    },
  });

  const totalCount = itemPrices?.length ?? 0;
  const buyingCount = useMemo(
    () => itemPrices?.filter((ip) => ip.buying === 1).length ?? 0,
    [itemPrices],
  );
  const sellingCount = useMemo(
    () => itemPrices?.filter((ip) => ip.selling === 1).length ?? 0,
    [itemPrices],
  );

  if (isLoading) return <LoadingState type="table" count={8} />;

  if (error) {
    return (
      <ListErrorState
        error={error}
        label="item prices"
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Item Prices"
        subtitle={`${totalCount} price entries`}
        actions={
          <Button
            className="rounded-full px-6 shadow-xl shadow-primary/20"
            onClick={() => router.push("/stock/settings/item-price/new")}
          >
            <Plus className="h-4 w-4 mr-2" /> New Item Price
          </Button>
        }
      />

      {/* KPI Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <InfoCard variant="gradient">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Tag className="h-5 w-5 text-primary" />
            </div>
            <DataPoint label="Total Prices" value={totalCount} />
          </div>
        </InfoCard>
        <InfoCard variant="gradient">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-primary" />
            </div>
            <DataPoint label="Buying" value={buyingCount} />
          </div>
        </InfoCard>
        <InfoCard variant="gradient">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <BadgeDollarSign className="h-5 w-5 text-primary" />
            </div>
            <DataPoint label="Selling" value={sellingCount} />
          </div>
        </InfoCard>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="w-64">
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
            Price List
          </label>
          <FrappeSelect
            doctype="Price List"
            labelField="price_list_name"
            value={filters.price_list ?? ""}
            onChange={(val) =>
              setFilters((prev) => ({
                ...prev,
                price_list: val || undefined,
              }))
            }
            placeholder="All price lists"
          />
        </div>
        <div className="w-64">
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
            Item Code
          </label>
          <FrappeSelect
            doctype="Item"
            labelField="item_code"
            value={filters.item_code ?? ""}
            onChange={(val) =>
              setFilters((prev) => ({
                ...prev,
                item_code: val || undefined,
              }))
            }
            placeholder="All items"
          />
        </div>
        {(filters.price_list || filters.item_code) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilters({})}
            className="text-muted-foreground"
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* List */}
      {!itemPrices || itemPrices.length === 0 ? (
        <EmptyState
          title="No item prices found"
          description={
            filters.price_list || filters.item_code
              ? "Try adjusting your filters."
              : "Create your first item price to get started."
          }
          action={
            !filters.price_list && !filters.item_code
              ? {
                  label: "New Item Price",
                  onClick: () =>
                    router.push("/stock/settings/item-price/new"),
                  icon: Plus,
                }
              : undefined
          }
        />
      ) : (
        <div className="space-y-2">
          {/* Table header */}
          <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-muted/30 rounded-xl text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <div className="col-span-3">Item Code</div>
            <div className="col-span-2">Price List</div>
            <div className="col-span-2">Rate</div>
            <div className="col-span-1">Currency</div>
            <div className="col-span-1">Valid From</div>
            <div className="col-span-1">Valid Upto</div>
            <div className="col-span-1">Type</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>

          {itemPrices.map((ip, i) => (
            <motion.div
              key={ip.name}
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
              animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="grid grid-cols-12 gap-4 px-4 py-3 bg-card rounded-2xl border border-border/50 hover:shadow-md hover:border-primary/20 transition-all duration-200 cursor-pointer items-center group"
              onClick={() =>
                router.push(
                  `/stock/settings/item-price/${encodeURIComponent(ip.name)}`,
                )
              }
            >
              <div className="col-span-3 font-medium text-foreground truncate">
                {ip.item_code}
              </div>
              <div className="col-span-2 text-sm text-muted-foreground truncate">
                {ip.price_list}
              </div>
              <div className="col-span-2 font-mono text-sm font-semibold">
                {ip.price_list_rate?.toLocaleString() ?? "—"}
              </div>
              <div className="col-span-1 text-sm text-muted-foreground">
                {ip.currency || "—"}
              </div>
              <div className="col-span-1 text-sm text-muted-foreground">
                {ip.valid_from || "—"}
              </div>
              <div className="col-span-1 text-sm text-muted-foreground">
                {ip.valid_upto || "—"}
              </div>
              <div className="col-span-1">
                <div className="flex gap-1">
                  {ip.buying === 1 && (
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase">
                      Buy
                    </span>
                  )}
                  {ip.selling === 1 && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold uppercase">
                      Sell
                    </span>
                  )}
                </div>
              </div>
              <div className="col-span-1 flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(
                          `/stock/settings/item-price/${encodeURIComponent(ip.name)}`,
                        );
                      }}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" /> View
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(ip);
                      }}
                      className="text-destructive"
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

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete Item Price"
        description={`Delete price for "${deleteTarget?.item_code}" in "${deleteTarget?.price_list}"?`}
        variant="destructive"
        onConfirm={async () => {
          if (deleteTarget) await deleteMutation.mutateAsync(deleteTarget.name);
        }}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
