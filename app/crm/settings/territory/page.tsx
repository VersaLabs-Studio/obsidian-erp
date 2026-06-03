// app/crm/settings/territory/page.tsx
// Obsidian ERP v4.0 - Territories Settings Page
// @ts-nocheck

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  MapPin,
  FolderTree,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

// v3.0 Imports
import { useFrappeList, useFrappeDelete } from "@/hooks/generic";
import {
  PageHeader,
  EmptyState,
  LoadingState,
  ConfirmDialog,
} from "@/components/smart";
import type { Territory } from "@/types/doctype-types";

// Territory Row Component
function TerritoryRow({
  territory,
  index,
  onEdit,
  onDelete,
}: {
  territory: Territory;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="group relative flex items-center justify-between p-4 mb-2 bg-card hover:bg-card/80 hover:shadow-lg transition-all duration-300 rounded-2xl"
    >
      <div className="flex items-center gap-4">
        <div className="p-2.5 bg-primary/10 rounded-xl">
          {territory.is_group ? (
            <FolderTree className="h-4 w-4 text-primary" />
          ) : (
            <MapPin className="h-4 w-4 text-primary" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground">
              {territory.territory_name}
            </h3>
            {territory.is_group === 1 && (
              <Badge variant="secondary" className="text-xs">
                Region
              </Badge>
            )}
          </div>
          {territory.parent_territory && (
            <p className="text-xs text-muted-foreground">
              Parent: {territory.parent_territory}
            </p>
          )}
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="rounded-xl border-none shadow-xl bg-popover/95 backdrop-blur-xl p-1"
        >
          <DropdownMenuItem className="rounded-lg" onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-2" /> Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="rounded-lg text-destructive focus:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4 mr-2" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </motion.div>
  );
}

export default function TerritoriesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Territory | null>(null);

  const {
    data: territories,
    isLoading,
    error,
  } = useFrappeList<Territory>("Territory", {
    orderBy: { field: "territory_name", order: "asc" },
    search,
    limit: 100,
  });

  const deleteMutation = useFrappeDelete("Territory", {
    onSuccess: () => setDeleteTarget(null),
  });

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.name);
  };

  if (isLoading) {
    return <LoadingState type="list" count={6} />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Failed to load territories</p>
      </div>
    );
  }

  const filteredTerritories = territories?.filter((t) =>
    t.territory_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Territories"
        subtitle={`${filteredTerritories?.length || 0} territories`}
        showSearch
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search territories..."
        backHref="/crm/customer"
        actions={
          <Button
            className="rounded-full"
            onClick={() => router.push("/crm/settings/territory/new")}
          >
            <Plus className="h-4 w-4 mr-2" /> New Territory
          </Button>
        }
      />

      {filteredTerritories?.length === 0 ? (
        <EmptyState
          title="No territories found"
          description={
            search ? "Try adjusting your search" : "Create your first territory"
          }
          action={
            <Button onClick={() => router.push("/crm/settings/territory/new")}>
              <Plus className="h-4 w-4 mr-2" /> New Territory
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {filteredTerritories?.map((territory, index) => (
            <TerritoryRow
              key={territory.name}
              territory={territory}
              index={index}
              onEdit={() =>
                router.push(
                  `/crm/settings/territory/${encodeURIComponent(
                    territory.name
                  )}/edit`
                )
              }
              onDelete={() => setDeleteTarget(territory)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Territory"
        description={`Are you sure you want to delete "${deleteTarget?.territory_name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
