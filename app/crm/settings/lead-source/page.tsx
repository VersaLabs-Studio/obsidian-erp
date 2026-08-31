// app/crm/settings/lead-source/page.tsx
// Obsidian ERP v4.0 - Lead Sources Settings Page
// @ts-nocheck

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Plus, MoreVertical, Pencil, Trash2, Tag } from "lucide-react";
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
import type { LeadSource } from "@/types/doctype-types";
import { ListErrorState } from "@/components/ui/list-error-state";

// Lead Source Row Component
function LeadSourceRow({
  source,
  index,
  onEdit,
  onDelete,
}: {
  source: LeadSource;
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
          <Tag className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">
            {source.source_name}
          </h3>
          <p className="text-xs text-muted-foreground truncate max-w-md">
            {source.details || `ID: ${source.name}`}
          </p>
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

export default function LeadSourcesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<LeadSource | null>(null);

  const {
    data: leadSources,
    isLoading,
    error,
  } = useFrappeList<LeadSource>("Lead Source", {
    orderBy: { field: "source_name", order: "asc" },
    search,
    limit: 100,
  });

  const deleteMutation = useFrappeDelete("Lead Source", {
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
        <ListErrorState error={error} label="lead sources" />
      </div>
    );
  }

  const filteredSources = leadSources?.filter((s) =>
    s.source_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lead Sources"
        subtitle={`${filteredSources?.length || 0} acquisition channels`}
        showSearch
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search lead sources..."
        backHref="/crm/settings"
        actions={
          <Button
            className="rounded-full"
            onClick={() => router.push("/crm/settings/lead-source/new")}
          >
            <Plus className="h-4 w-4 mr-2" /> New Lead Source
          </Button>
        }
      />

      {filteredSources?.length === 0 ? (
        <EmptyState
          title="No lead sources found"
          description={
            search
              ? "Try adjusting your search"
              : "Create your first lead source"
          }
          action={
            <Button
              onClick={() => router.push("/crm/settings/lead-source/new")}
            >
              <Plus className="h-4 w-4 mr-2" /> New Lead Source
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {filteredSources?.map((source, index) => (
            <LeadSourceRow
              key={source.name}
              source={source}
              index={index}
              onEdit={() =>
                router.push(
                  `/crm/settings/lead-source/${encodeURIComponent(
                    source.name
                  )}/edit`
                )
              }
              onDelete={() => setDeleteTarget(source)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Lead Source"
        description={`Are you sure you want to delete "${deleteTarget?.source_name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
