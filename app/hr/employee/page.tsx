"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  MoreVertical,
  Pencil,
  Trash2,
  User,
  CheckCircle2,
  XCircle,
  Briefcase,
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
import type { Employee } from "@/types/doctype-types";
import { Badge } from "@/components/ui/badge";

function EmployeeRow({
  employee,
  index,
  onView,
  onEdit,
  onDelete,
}: {
  employee: Employee;
  index: number;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="group flex items-center justify-between p-4 mb-2 bg-card hover:bg-card/80 hover:shadow-lg transition-all duration-300 rounded-2xl cursor-pointer animate-slide-up border border-border"
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={onView}
    >
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
          <User className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground truncate">
              {employee.employee_name}
            </h3>
            <Badge
              variant={employee.status === "Active" ? "default" : "secondary"}
              className="text-[10px] h-4 rounded-full"
            >
              {employee.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
            <span className="truncate">
              {employee.designation || "No Designation"}
            </span>
            <span>•</span>
            <span className="truncate">
              {employee.department || "No Department"}
            </span>
          </div>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
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

export default function EmployeeListPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);

  const {
    data: employees,
    isLoading,
    error,
  } = useFrappeList<Employee>("Employee", {
    orderBy: { field: "creation", order: "desc" },
    search,
    limit: 100,
  });

  const deleteMutation = useFrappeDelete("Employee", {
    onSuccess: () => setDeleteTarget(null),
  });

  const filteredData = useMemo(() => {
    if (!employees) return [];
    if (!search) return employees;
    const lower = search.toLowerCase();
    return employees.filter(
      (emp) =>
        emp.employee_name?.toLowerCase().includes(lower) ||
        emp.employee?.toLowerCase().includes(lower),
    );
  }, [employees, search]);

  if (isLoading) return <LoadingState type="table" count={8} />;
  if (error)
    return (
      <div className="p-4 text-destructive text-center">
        <p className="font-bold">Error loading Employees</p>
        <p className="text-sm opacity-70">
          Please check your API configuration or network connection.
        </p>
      </div>
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employees"
        subtitle={`${filteredData.length} total staff members`}
        showSearch
        searchValue={search}
        onSearchChange={setSearch}
        actions={
          <Button
            className="rounded-full"
            onClick={() => router.push("/hr/employee/new")}
          >
            Add Employee
          </Button>
        }
      />

      {filteredData.length === 0 ? (
        <EmptyState
          title="No Employees Found"
          description={
            search
              ? "Try adjusting your search filters."
              : "Start by adding your first employee to the system."
          }
          action={
            <Button onClick={() => router.push("/hr/employee/new")}>
              Add Employee
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {filteredData.map((emp, i) => (
            <EmployeeRow
              key={emp.name}
              employee={emp}
              index={i}
              onView={() =>
                router.push(`/hr/employee/${encodeURIComponent(emp.name)}`)
              }
              onEdit={() =>
                router.push(`/hr/employee/${encodeURIComponent(emp.name)}/edit`)
              }
              onDelete={() => setDeleteTarget(emp)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete Employee"
        description={`Are you sure you want to delete "${deleteTarget?.employee_name}"? This action cannot be undone.`}
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
