// app/accounting/settings/price-list/page.tsx
// Obsidian ERP v4.0 - Price Lists List Page (Table Format)
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  BadgeDollarSign,
  ShoppingCart,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useFrappeList, useFrappeDelete } from "@/hooks/generic";
import {
  PageHeader,
  EmptyState,
  LoadingState,
  ConfirmDialog,
  StatusBadge,
} from "@/components/smart";
import { InfoCard, DataPoint } from "@/components/ui/info-card";
import { ListErrorState } from "@/components/ui/list-error-state";

interface PriceList {
  name: string;
  price_list_name: string;
  currency: string;
  enabled: number;
  buying: number;
  selling: number;
}

export default function PriceListsPage() {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<PriceList | null>(null);

  const {
    data: priceLists,
    isLoading,
    error,
  } = useFrappeList<PriceList>("Price List", {
    orderBy: { field: "name", order: "asc" },
    search,
    limit: 100,
  });

  const deleteMutation = useFrappeDelete("Price List", {
    onSuccess: () => setDeleteTarget(null),
  });

  if (isLoading) return <LoadingState type="list" count={5} />;

  if (error)
    return (
      <ListErrorState
        error={error}
        label="price lists"
      />
    );

  const allLists = priceLists ?? [];
  const enabledCount = allLists.filter((pl) => pl.enabled === 1).length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Price Lists"
        subtitle={`${allLists.length} total · ${enabledCount} enabled`}
        showSearch
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Filter by name..."
        backHref="/accounting/settings"
        actions={
          <Button
            className="rounded-full px-6 shadow-xl shadow-primary/20"
            onClick={() =>
              router.push("/accounting/settings/price-list/new")
            }
          >
            <Plus className="h-4 w-4 mr-2" /> New Price List
          </Button>
        }
      />

      {/* KPI Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoCard variant="gradient">
          <DataPoint
            label="Total"
            value={<span className="text-2xl font-black">{allLists.length}</span>}
          />
        </InfoCard>
        <InfoCard variant="gradient">
          <DataPoint
            label="Enabled"
            value={
              <span className="text-2xl font-black text-emerald-600">
                {enabledCount}
              </span>
            }
          />
        </InfoCard>
        <InfoCard variant="gradient">
          <DataPoint
            label="Selling"
            value={
              <span className="text-2xl font-black text-primary">
                {allLists.filter((pl) => pl.selling === 1).length}
              </span>
            }
          />
        </InfoCard>
        <InfoCard variant="gradient">
          <DataPoint
            label="Buying"
            value={
              <span className="text-2xl font-black text-blue-600">
                {allLists.filter((pl) => pl.buying === 1).length}
              </span>
            }
          />
        </InfoCard>
      </div>

      {!allLists || allLists.length === 0 ? (
        <EmptyState
          title="No price lists found"
          description="Create price lists to manage buying and selling rates."
          action={
            <Button
              onClick={() =>
                router.push("/accounting/settings/price-list/new")
              }
            >
              <Plus className="h-4 w-4 mr-2" /> Create Price List
            </Button>
          }
        />
      ) : (
        <div className="bg-card rounded-2xl border border-border/40 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-border/40 bg-muted/30">
            <div className="col-span-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Name
            </div>
            <div className="col-span-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Currency
            </div>
            <div className="col-span-2 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">
              Type
            </div>
            <div className="col-span-2 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">
              Status
            </div>
            <div className="col-span-2 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">
              Actions
            </div>
          </div>

          {/* Table Rows */}
          {allLists.map((pl, i) => (
            <motion.div
              key={pl.name}
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
              animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.2 }}
              className="group grid grid-cols-12 gap-4 px-6 py-4 border-b border-border/20 last:border-b-0 hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() =>
                router.push(
                  `/accounting/settings/price-list/${encodeURIComponent(pl.name)}`
                )
              }
            >
              {/* Name */}
              <div className="col-span-4 flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:scale-110 transition-transform">
                  {pl.selling ? (
                    <BadgeDollarSign className="h-5 w-5" />
                  ) : (
                    <ShoppingCart className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {pl.price_list_name}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono truncate">
                    {pl.name}
                  </p>
                </div>
              </div>

              {/* Currency */}
              <div className="col-span-2 flex items-center">
                <span className="text-sm font-medium text-muted-foreground uppercase">
                  {pl.currency}
                </span>
              </div>

              {/* Type Badges */}
              <div className="col-span-2 flex items-center justify-center gap-2">
                {pl.selling === 1 && (
                  <StatusBadge status="active" label="Selling" size="sm" />
                )}
                {pl.buying === 1 && (
                  <StatusBadge status="info" label="Buying" size="sm" />
                )}
                {pl.selling !== 1 && pl.buying !== 1 && (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>

              {/* Enabled Status */}
              <div className="col-span-2 flex items-center justify-center">
                <StatusBadge
                  status={pl.enabled === 1 ? "enabled" : "disabled"}
                  size="sm"
                />
              </div>

              {/* Actions */}
              <div
                className="col-span-2 flex items-center justify-end"
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="rounded-2xl border-none shadow-xl bg-popover/95 backdrop-blur-xl p-2 min-w-[160px]"
                  >
                    <DropdownMenuItem
                      className="rounded-xl px-4 py-3 cursor-pointer"
                      onClick={() =>
                        router.push(
                          `/accounting/settings/price-list/${encodeURIComponent(
                            pl.name
                          )}/edit`
                        )
                      }
                    >
                      <Pencil className="h-4 w-4 mr-3" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="rounded-xl px-4 py-3 text-destructive focus:text-destructive cursor-pointer"
                      disabled={pl.enabled === 1}
                      onClick={() => setDeleteTarget(pl)}
                    >
                      <Trash2 className="h-4 w-4 mr-3" /> Delete
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
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete Price List"
        description={`Are you sure you want to delete "${deleteTarget?.price_list_name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={async () => {
          if (deleteTarget) {
            await deleteMutation.mutateAsync(deleteTarget.name);
          }
        }}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
