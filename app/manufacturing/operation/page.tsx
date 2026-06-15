// app/manufacturing/operation/page.tsx
// Obsidian ERP v4.0 - Operation List Page
// 2N Part 4.1: removed @ts-nocheck. The list page is read-only and uses
// only typed hooks (useFrappeList, useFrappeDelete) + the standard
// premium-UI chrome.

"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Search,
  Cog as OperationIcon,
  Clock,
  Cpu,
  PlayCircle,
  Layers,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFrappeList, useFrappeDelete } from "@/hooks/generic";
import {
  PageHeader,
  LoadingState,
  EmptyState,
  ConfirmDialog,
} from "@/components/smart";
import type { Operation } from "@/types/doctype-types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Format time helper
function formatTime(minutes: number | undefined): string {
  if (!minutes || minutes === 0) return "—";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

// Operation Card Component
function OperationCard({
  operation,
  index,
  onView,
  onEdit,
  onDelete,
}: {
  operation: Operation & { sub_operations?: unknown[] };
  index: number;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const subOpsCount = operation.sub_operations?.length || 0;

  return (
    <div
      className={cn(
        "group relative bg-card rounded-2xl border border-border/50 p-5",
        "hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20",
        "transition-all duration-300 cursor-pointer",
        "animate-in fade-in slide-in-from-bottom-4",
      )}
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={onView}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <OperationIcon className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
              {operation.name}
            </h3>
            {operation.workstation && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Cpu className="h-3 w-3" />
                {operation.workstation}
              </p>
            )}
          </div>
        </div>

        {/* Actions Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40 rounded-xl">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="rounded-lg"
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="rounded-lg text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content */}
      <div className="space-y-3">
        {/* Time & Sub-operations Badges */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
            <Clock className="h-4 w-4" />
            <span>{formatTime(operation.total_operation_time)}</span>
          </div>
          <div className="flex items-center gap-2">
            {subOpsCount > 0 && (
              <Badge
                variant="secondary"
                className="text-[10px] rounded-full px-2 bg-violet-500/10 text-violet-600 dark:text-violet-400"
              >
                <Layers className="h-3 w-3 mr-1" />
                {subOpsCount} step{subOpsCount !== 1 ? "s" : ""}
              </Badge>
            )}
            <Badge
              variant="secondary"
              className="text-[10px] rounded-full px-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
            >
              Operation
            </Badge>
          </div>
        </div>

        {/* Description Preview */}
        {operation.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 pt-2 border-t border-border/50">
            {operation.description}
          </p>
        )}

        {/* No Workstation Warning */}
        {!operation.workstation && (
          <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 pt-2 border-t border-border/50">
            <PlayCircle className="h-3.5 w-3.5" />
            <span>No default workstation assigned</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Main List Page Component
export default function OperationListPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Fetch operations
  const {
    data: operations,
    isLoading,
    error,
    refetch,
  } = useFrappeList<Operation>("Operation", {
    fields: ["name", "workstation", "total_operation_time", "description"],
    orderBy: { field: "creation", order: "desc" },
    limit: 200,
  });

  // Delete mutation
  const deleteMutation = useFrappeDelete("Operation", {
    onSuccess: () => {
      toast.success("Operation deleted successfully");
      refetch();
      setDeleteTarget(null);
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to delete operation");
    },
    showToast: false,
  });

  // Filter operations
  const filteredOperations = useMemo(() => {
    if (!operations) return [];

    return operations.filter((op) => {
      const matchesSearch =
        !searchTerm ||
        op.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        op.workstation?.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesSearch;
    });
  }, [operations, searchTerm]);

  const handleDeleteConfirm = async () => {
    if (deleteTarget) {
      await deleteMutation.mutateAsync(deleteTarget);
    }
  };

  if (isLoading) {
    return <LoadingState variant="cards" />;
  }

  if (error) {
    return (
      <EmptyState
        icon={OperationIcon}
        title="Error loading operations"
        description="There was a problem fetching the operation list."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Operations"
        subtitle="Define manufacturing actions and their standard times"
        actions={
          <Button
            onClick={() => router.push("/manufacturing/operation/new")}
            className="rounded-full shadow-lg shadow-primary/20"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Operation
          </Button>
        }
      />

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search operations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 rounded-full bg-card border-border/50 focus:border-primary/50 transition-colors shadow-sm"
        />
      </div>

      {/* Operations Grid */}
      {filteredOperations.length === 0 ? (
        <EmptyState
          icon={OperationIcon}
          title="No operations found"
          description={
            searchTerm
              ? "Try adjusting your search criteria"
              : "Define your manufacturing operations to use in BOMs"
          }
          action={
            !searchTerm && (
              <Button
                onClick={() => router.push("/manufacturing/operation/new")}
                className="rounded-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Operation
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredOperations.map((operation, index) => (
            <OperationCard
              key={operation.name}
              operation={operation}
              index={index}
              onView={() =>
                router.push(
                  `/manufacturing/operation/${encodeURIComponent(operation.name)}`,
                )
              }
              onEdit={() =>
                router.push(
                  `/manufacturing/operation/${encodeURIComponent(operation.name)}/edit`,
                )
              }
              onDelete={() => setDeleteTarget(operation.name)}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Operation"
        description={`Are you sure you want to delete "${deleteTarget}"? This may affect BOMs that use this operation.`}
        confirmText="Delete"
        onConfirm={handleDeleteConfirm}
        loading={deleteMutation.isPending}
        variant="destructive"
      />
    </div>
  );
}
