// app/crm/settings/industry-type/page.tsx
// Obsidian ERP v4.0 - Industry Types Settings Page
// @ts-nocheck

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Plus, MoreVertical, Pencil, Trash2, Briefcase } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// v3.0 Imports
import { useFrappeList, useFrappeDelete } from "@/hooks/generic";
import {
  PageHeader,
  EmptyState,
  LoadingState,
  ConfirmDialog,
} from "@/components/smart";
import type { IndustryType } from "@/types/doctype-types";

// Industry Type Row Component
function IndustryTypeRow({
  type,
  index,
  onEdit,
  onDelete,
}: {
  type: IndustryType;
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
          <Briefcase className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">{type.industry}</h3>
          <p className="text-xs text-muted-foreground">ID: {type.name}</p>
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

export default function IndustryTypesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<IndustryType | null>(null);

  const {
    data: industryTypes,
    isLoading,
    error,
  } = useFrappeList<IndustryType>("Industry Type", {
    orderBy: { field: "industry", order: "asc" },
    search,
    limit: 100,
  });

  const deleteMutation = useFrappeDelete("Industry Type", {
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
        <p className="text-destructive">Failed to load industry types</p>
      </div>
    );
  }

  const filteredTypes = industryTypes?.filter((t) =>
    t.industry?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Industry Types"
        subtitle={`${filteredTypes?.length || 0} classifications`}
        showSearch
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search industries..."
        backHref="/crm/settings"
        actions={
          <Button
            className="rounded-full"
            onClick={() => router.push("/crm/settings/industry-type/new")}
          >
            <Plus className="h-4 w-4 mr-2" /> New Industry Type
          </Button>
        }
      />

      {filteredTypes?.length === 0 ? (
        <EmptyState
          title="No industry types found"
          description={
            search
              ? "Try adjusting your search"
              : "Create your first industry type"
          }
          action={
            <Button
              onClick={() => router.push("/crm/settings/industry-type/new")}
            >
              <Plus className="h-4 w-4 mr-2" /> New Industry Type
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {filteredTypes?.map((type, index) => (
            <IndustryTypeRow
              key={type.name}
              type={type}
              index={index}
              onEdit={() =>
                router.push(
                  `/crm/settings/industry-type/${encodeURIComponent(
                    type.name
                  )}/edit`
                )
              }
              onDelete={() => setDeleteTarget(type)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Industry Type"
        description={`Are you sure you want to delete "${deleteTarget?.industry}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
