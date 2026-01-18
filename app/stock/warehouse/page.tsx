"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  MoreVertical,
  Pencil,
  Trash2,
  Warehouse as WarehouseIcon,
  FolderTree,
  Package,
  MapPin,
  Search,
  Plus,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useFrappeList, useFrappeDelete } from "@/hooks/generic";
import {
  PageHeader,
  EmptyState,
  LoadingState,
  ConfirmDialog,
} from "@/components/smart";
import type { Warehouse } from "@/types/doctype-types";
import { cn } from "@/lib/utils";

function WarehouseCard({
  warehouse,
  index,
  onView,
  onEdit,
  onDelete,
}: {
  warehouse: Warehouse;
  index: number;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isGroup = warehouse.is_group === 1;

  return (
    <div
      className={cn(
        "group relative bg-card rounded-2xl border border-border/50 p-5",
        "hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20",
        "transition-all duration-300 cursor-pointer",
        warehouse.disabled === 1 && "opacity-60",
      )}
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={onView}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "h-12 w-12 rounded-xl flex items-center justify-center",
              isGroup
                ? "bg-amber-500/10 text-amber-600"
                : "bg-primary/10 text-primary",
            )}
          >
            {isGroup ? (
              <FolderTree className="h-6 w-6" />
            ) : (
              <WarehouseIcon className="h-6 w-6" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-foreground group-hover:text-primary">
              {warehouse.warehouse_name}
            </h3>
            <p className="text-xs text-muted-foreground">{warehouse.name}</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full opacity-0 group-hover:opacity-100"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              <Pencil className="h-4 w-4 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <Package className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">
            {warehouse.warehouse_type ||
              (isGroup ? "Parent Group" : "Storage Location")}
          </span>
        </div>
        {warehouse.city && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <span>{warehouse.city}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function WarehouseListPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Warehouse | null>(null);

  const {
    data: warehouses,
    isLoading,
    refetch,
  } = useFrappeList<Warehouse>("Warehouse", {
    orderBy: { field: "lft", order: "asc" },
    limit: 500,
  });

  const deleteMutation = useFrappeDelete("Warehouse", {
    onSuccess: () => {
      refetch();
      setDeleteTarget(null);
    },
  });

  const filteredWarehouses = useMemo(() => {
    if (!warehouses) return [];
    return warehouses.filter((w) =>
      w.warehouse_name?.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [warehouses, searchTerm]);

  if (isLoading) return <LoadingState type="table" count={8} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warehouses"
        subtitle="Manage physical storage locations"
        showSearch
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        actions={
          <Button
            className="rounded-full"
            onClick={() => router.push("/stock/warehouse/new")}
          >
            <Plus className="h-4 w-4 mr-2" /> Add Warehouse
          </Button>
        }
      />
      {filteredWarehouses.length === 0 ? (
        <EmptyState
          title="No Warehouses"
          description="Create a storage location to start tracking inventory."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWarehouses.map((wh, i) => (
            <WarehouseCard
              key={wh.name}
              warehouse={wh}
              index={i}
              onView={() =>
                router.push(`/stock/warehouse/${encodeURIComponent(wh.name)}`)
              }
              onEdit={() =>
                router.push(
                  `/stock/warehouse/${encodeURIComponent(wh.name)}/edit`,
                )
              }
              onDelete={() => setDeleteTarget(wh)}
            />
          ))}
        </div>
      )}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete Warehouse"
        description={`Delete "${deleteTarget?.warehouse_name}"?`}
        onConfirm={async () => {
          if (deleteTarget) await deleteMutation.mutateAsync(deleteTarget.name);
        }}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
