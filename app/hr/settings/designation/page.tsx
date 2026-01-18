"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MoreVertical, Pencil, Trash2, Briefcase } from "lucide-react";
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
import type { Designation } from "@/types/doctype-types";

function DesignationRow({
  designation,
  index,
  onEdit,
  onDelete,
}: {
  designation: Designation;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="group flex items-center justify-between p-4 mb-2 bg-card hover:bg-card/80 hover:shadow-lg transition-all duration-300 rounded-2xl border border-border"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <div className="h-10 w-10 rounded-full bg-secondary/50 flex items-center justify-center text-xs font-bold text-muted-foreground">
          <Briefcase className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-foreground truncate">
            {designation.designation_name}
          </h3>
          {designation.description && (
            <p className="text-xs text-muted-foreground truncate max-w-md">
              {designation.description}
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
          className="rounded-xl border-none shadow-xl bg-popover/90 backdrop-blur-xl"
        >
          <DropdownMenuItem className="rounded-lg" onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-2" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            className="rounded-lg text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4 mr-2" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default function DesignationListPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Designation | null>(null);

  const {
    data: designations,
    isLoading,
    error,
  } = useFrappeList<Designation>("Designation", {
    orderBy: { field: "creation", order: "desc" },
    search,
    limit: 100,
  });

  const deleteMutation = useFrappeDelete("Designation", {
    onSuccess: () => setDeleteTarget(null),
  });

  const filteredData = useMemo(() => {
    if (!designations) return [];
    if (!search) return designations;
    const lower = search.toLowerCase();
    return designations.filter((d) =>
      d.designation_name?.toLowerCase().includes(lower),
    );
  }, [designations, search]);

  if (isLoading) return <LoadingState type="table" count={8} />;
  if (error)
    return (
      <div className="p-4 text-destructive">Error loading Designations</div>
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Designations"
        subtitle={`${filteredData.length} total roles`}
        showSearch
        searchValue={search}
        onSearchChange={setSearch}
        backHref="/hr/settings"
        actions={
          <Button
            className="rounded-full"
            onClick={() => router.push("/hr/settings/designation/new")}
          >
            Add Designation
          </Button>
        }
      />
      {filteredData.length === 0 ? (
        <EmptyState
          title="No Designations"
          description="Define your first job title."
          action={
            <Button onClick={() => router.push("/hr/settings/designation/new")}>
              Add
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {filteredData.map((d, i) => (
            <DesignationRow
              key={d.name}
              designation={d}
              index={i}
              onEdit={() =>
                router.push(
                  `/hr/settings/designation/${encodeURIComponent(d.name)}/edit`,
                )
              }
              onDelete={() => setDeleteTarget(d)}
            />
          ))}
        </div>
      )}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete Designation"
        description={`Are you sure you want to delete "${deleteTarget?.designation_name}"?`}
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
