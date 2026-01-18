"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  MoreVertical,
  Pencil,
  Trash2,
  Layers,
  CheckCircle2,
  XCircle,
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
import type { Department } from "@/types/doctype-types";

function DepartmentRow({
  department,
  index,
  onEdit,
  onDelete,
}: {
  department: Department;
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
          <Layers className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground truncate">
              {department.department_name}
            </h3>
            {department.disabled ? (
              <XCircle className="h-3 w-3 text-muted-foreground shrink-0" />
            ) : (
              <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
            )}
          </div>
          {department.parent_department && (
            <p className="text-xs text-muted-foreground truncate">
              Parent: {department.parent_department}
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

export default function DepartmentListPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);

  const {
    data: departments,
    isLoading,
    error,
  } = useFrappeList<Department>("Department", {
    orderBy: { field: "creation", order: "desc" },
    search,
    limit: 100,
  });

  const deleteMutation = useFrappeDelete("Department", {
    onSuccess: () => setDeleteTarget(null),
  });

  const filteredData = useMemo(() => {
    if (!departments) return [];
    if (!search) return departments;
    const lower = search.toLowerCase();
    return departments.filter((d) =>
      d.department_name?.toLowerCase().includes(lower),
    );
  }, [departments, search]);

  if (isLoading) return <LoadingState type="table" count={8} />;
  if (error)
    return (
      <div className="p-4 text-destructive">Error loading Departments</div>
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Departments"
        subtitle={`${filteredData.length} total`}
        showSearch
        searchValue={search}
        onSearchChange={setSearch}
        backHref="/hr/settings"
        actions={
          <Button
            className="rounded-full"
            onClick={() => router.push("/hr/settings/department/new")}
          >
            Add Department
          </Button>
        }
      />
      {filteredData.length === 0 ? (
        <EmptyState
          title="No Departments"
          description="Create your first department."
          action={
            <Button onClick={() => router.push("/hr/settings/department/new")}>
              Add
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {filteredData.map((d, i) => (
            <DepartmentRow
              key={d.name}
              department={d}
              index={i}
              onEdit={() =>
                router.push(
                  `/hr/settings/department/${encodeURIComponent(d.name)}/edit`,
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
        title="Delete Department"
        description={`Are you sure you want to delete "${deleteTarget?.department_name}"?`}
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
