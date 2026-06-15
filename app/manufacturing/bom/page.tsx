"use client";

// app/manufacturing/bom/page.tsx
// BOM List — KPICard + StatusBadge + card grid. OKLCH semantic tokens only.

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Eye,
  Layers,
  Star,
  Cog,
  Package,
  DollarSign,
  ArrowRight,
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
} from "@/components/smart";
import { KPICard } from "@/components/dashboard/KPICard";
import { StatusBadge } from "@/components/smart/status-badge";
import type { Bom } from "@/types/doctype-types";
import { cn } from "@/lib/utils";

const ETB = new Intl.NumberFormat("en-ET", {
  style: "currency",
  currency: "ETB",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function getDisplayStatus(bom: Bom): string {
  if (bom.docstatus === 0) return "Draft";
  if (bom.docstatus === 2) return "Cancelled";
  return "Active";
}

function BomCard({
  bom,
  index,
  onView,
  onEdit,
  onDelete,
}: {
  bom: Bom;
  index: number;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const displayStatus = getDisplayStatus(bom);
  const isDraft = bom.docstatus === 0;
  const isDefault = bom.is_default === 1;

  return (
    <div
      className={cn(
        "group relative bg-card rounded-2xl border border-border/50",
        "hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5",
        "transition-all duration-300 cursor-pointer overflow-hidden",
        "animate-slide-up",
      )}
      style={{ animationDelay: `${index * 40}ms` }}
      onClick={onView}
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-foreground tracking-tight">
                {bom.name}
              </h3>
              {isDefault && (
                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
              )}
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Package className="h-3 w-3" />
              {bom.item_name || bom.item}
            </p>
          </div>
          <StatusBadge status={displayStatus} size="sm" />
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
              Quantity
            </p>
            <p className="text-sm font-medium text-foreground">
              {bom.quantity} {bom.uom || "Nos"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
              Materials
            </p>
            <p className="text-sm font-medium text-foreground">
              {Array.isArray(bom.items) ? bom.items.length : 0} items
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
              Operations
            </p>
            <p className="text-sm font-medium text-foreground flex items-center gap-1">
              {bom.with_operations === 1 ? (
                <>
                  <Cog className="h-3 w-3 text-muted-foreground" />
                  {Array.isArray(bom.operations) ? bom.operations.length : 0}
                </>
              ) : (
                "—"
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
                Total Cost
              </p>
              <p className="text-lg font-bold text-foreground tracking-tight">
                {ETB.format(bom.total_cost ?? 0)}
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="rounded-xl border-border/50 shadow-xl bg-popover/95 backdrop-blur-xl p-1.5 min-w-[160px]"
            >
              <DropdownMenuItem
                className="rounded-lg cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onView();
                }}
              >
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              {isDraft && (
                <DropdownMenuItem
                  className="rounded-lg cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {isDraft && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="rounded-lg cursor-pointer text-destructive focus:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

export default function BOMListPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteTarget, setDeleteTarget] = useState<Bom | null>(null);

  const {
    data: boms,
    isLoading,
    refetch,
  } = useFrappeList<Bom>("BOM", {
    fields: [
      "name",
      "item",
      "item_name",
      "quantity",
      "uom",
      "currency",
      "total_cost",
      "raw_material_cost",
      "operating_cost",
      "is_active",
      "is_default",
      "with_operations",
      "docstatus",
      "company",
    ],
    orderBy: { field: "creation", order: "desc" },
    search,
    limit: 100,
  });

  const deleteMutation = useFrappeDelete("BOM", {
    onSuccess: () => {
      setDeleteTarget(null);
      refetch();
    },
  });

  const filteredBoms = useMemo(() => {
    if (!boms) return [];
    if (statusFilter === "all") return boms;
    return boms.filter((b) => getDisplayStatus(b) === statusFilter);
  }, [boms, statusFilter]);

  const statusCounts = useMemo(() => {
    if (!boms) return {} as Record<string, number>;
    return boms.reduce(
      (acc, b) => {
        const s = getDisplayStatus(b);
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [boms]);

  const kpis = useMemo(() => {
    if (!boms) return { total: 0, active: 0, defaultBom: 0 };
    return {
      total: boms.length,
      active: boms.filter((b) => b.is_active === 1 && b.docstatus === 1).length,
      defaultBom: boms.filter((b) => b.is_default === 1).length,
    };
  }, [boms]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.name);
  };

  if (isLoading) return <LoadingState type="cards" count={6} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bill of Materials"
        subtitle={`${filteredBoms.length} BOM${filteredBoms.length !== 1 ? "s" : ""}`}
        showSearch
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by item, BOM ID..."
        actions={
          <Button
            className="rounded-full shadow-lg shadow-primary/20"
            onClick={() => router.push("/manufacturing/bom/new")}
          >
            <Plus className="h-4 w-4 mr-2" />
            New BOM
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <KPICard title="Total BOMs" value={kpis.total} icon={Layers} isLoading={isLoading} />
        <KPICard title="Active" value={kpis.active} icon={Package} variant="success" isLoading={isLoading} />
        <KPICard title="Default" value={kpis.defaultBom} icon={Star} variant="default" isLoading={isLoading} />
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { key: "all", label: "All", count: boms?.length || 0 },
          { key: "Draft", label: "Draft", count: statusCounts.Draft || 0 },
          { key: "Active", label: "Active", count: statusCounts.Active || 0 },
          { key: "Cancelled", label: "Cancelled", count: statusCounts.Cancelled || 0 },
        ].map((s) => (
          <Button
            key={s.key}
            variant={statusFilter === s.key ? "default" : "outline"}
            size="sm"
            className={cn(
              "rounded-full gap-2 transition-all",
              statusFilter === s.key
                ? "shadow-lg shadow-primary/20"
                : "hover:bg-secondary/80",
            )}
            onClick={() => setStatusFilter(s.key)}
          >
            {s.label}
            <Badge
              variant="secondary"
              className={cn(
                "h-5 min-w-[20px] px-1.5 text-[10px] font-bold",
                statusFilter === s.key
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-secondary",
              )}
            >
              {s.count}
            </Badge>
          </Button>
        ))}
      </div>

      {!boms || boms.length === 0 ? (
        <EmptyState
          title="No BOMs found"
          description="Create your first Bill of Materials to define production recipes"
          action={
            <Button
              onClick={() => router.push("/manufacturing/bom/new")}
              className="rounded-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create BOM
            </Button>
          }
        />
      ) : filteredBoms.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Layers className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">No BOMs match this filter</p>
          <p className="text-sm mt-1">Try selecting a different status</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredBoms.map((bom, index) => (
            <BomCard
              key={bom.name}
              bom={bom}
              index={index}
              onView={() =>
                router.push(`/manufacturing/bom/${encodeURIComponent(bom.name)}`)
              }
              onEdit={() =>
                router.push(`/manufacturing/bom/${encodeURIComponent(bom.name)}/edit`)
              }
              onDelete={() => setDeleteTarget(bom)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete BOM"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
