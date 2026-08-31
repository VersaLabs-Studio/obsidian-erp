// app/crm/settings/-group/page.tsx
// Obsidian ERP v4.0 -  Groups Settings Page
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
  FolderTree,
  Users,
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
import type { Group } from "@/types/doctype-types";
import { ListErrorState } from "@/components/ui/list-error-state";

//  Group Row Component
function GroupRow({
  group,
  index,
  onEdit,
  onDelete,
}: {
  group: Group;
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
          {group.is_group ? (
            <FolderTree className="h-4 w-4 text-primary" />
          ) : (
            <Users className="h-4 w-4 text-primary" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground">
              {group._group_name}
            </h3>
            {group.is_group === 1 && (
              <Badge variant="secondary" className="text-xs">
                Group
              </Badge>
            )}
          </div>
          {group.parent__group && (
            <p className="text-xs text-muted-foreground">
              Parent: {group.parent__group}
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

export default function GroupsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Group | null>(null);

  const {
    data: groups,
    isLoading,
    error,
  } = useFrappeList<Group>(" Group", {
    orderBy: { field: "_group_name", order: "asc" },
    search,
    limit: 100,
  });

  const deleteMutation = useFrappeDelete(" Group", {
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
        <ListErrorState error={error} label="groups" />
      </div>
    );
  }

  const filteredGroups = groups?.filter((g) =>
    g._group_name?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title=" Groups"
        subtitle={`${filteredGroups?.length || 0} groups`}
        showSearch
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search groups..."
        backHref="/crm/"
        actions={
          <Button
            className="rounded-full"
            onClick={() => router.push("/crm/settings/-group/new")}
          >
            <Plus className="h-4 w-4 mr-2" /> New Group
          </Button>
        }
      />

      {filteredGroups?.length === 0 ? (
        <EmptyState
          title="No  groups found"
          description={
            search ? "Try adjusting your search" : "Create your first  group"
          }
          action={
            <Button onClick={() => router.push("/crm/settings/-group/new")}>
              <Plus className="h-4 w-4 mr-2" /> New Group
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {filteredGroups?.map((group, index) => (
            <GroupRow
              key={group.name}
              group={group}
              index={index}
              onEdit={() =>
                router.push(
                  `/crm/settings/-group/${encodeURIComponent(group.name)}/edit`,
                )
              }
              onDelete={() => setDeleteTarget(group)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete  Group"
        description={`Are you sure you want to delete "${deleteTarget?._group_name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
