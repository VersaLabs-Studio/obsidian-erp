"use client";

// app/hr/employee/page.tsx
// Employee List — KPICard + StatusBadge + card grid. OKLCH semantic tokens only.

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Eye,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Briefcase,
  Building2,
  Phone,
  Mail,
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
import type { Employee } from "@/types/doctype-types";
import { cn } from "@/lib/utils";

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getInitials(emp: Employee): string {
  const first = emp.first_name?.charAt(0) || "";
  const last = emp.last_name?.charAt(0) || "";
  return `${first}${last}`.toUpperCase() || "NA";
}

const EMPLOYEE_TABS: Array<{ key: string; label: string }> = [
  { key: "all", label: "All" },
  { key: "Active", label: "Active" },
  { key: "Inactive", label: "Inactive" },
  { key: "Suspended", label: "Suspended" },
  { key: "Left", label: "Left" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

function EmployeeCard({
  emp,
  onView,
  onEdit,
  onDelete,
}: {
  emp: Employee;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <motion.div
      variants={cardVariants}
      className={cn(
        "group relative bg-card rounded-2xl border border-border/50",
        "hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5",
        "transition-all duration-300 cursor-pointer overflow-hidden",
      )}
      onClick={onView}
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
              {getInitials(emp)}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-foreground tracking-tight">
                  {emp.employee_name || emp.name}
                </h3>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Briefcase className="h-3 w-3" />
                {emp.designation || "No Designation"}
              </p>
            </div>
          </div>
          <StatusBadge status={emp.status} size="sm" />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
              Department
            </p>
            <p className="text-sm font-medium text-foreground flex items-center gap-1 truncate">
              <Building2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{emp.department || "—"}</span>
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
              Company
            </p>
            <p className="text-sm font-medium text-foreground flex items-center gap-1 truncate">
              <Building2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{emp.company}</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
              Join Date
            </p>
            <p className="text-sm font-medium text-foreground">
              {formatDate(emp.date_of_joining)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
              Reports To
            </p>
            <p className="text-sm font-medium text-foreground truncate">
              {emp.reports_to || "—"}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {emp.cell_number && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {emp.cell_number}
              </span>
            )}
            {emp.personal_email && (
              <span className="flex items-center gap-1 truncate max-w-[120px]">
                <Mail className="h-3 w-3" />
                <span className="truncate">{emp.personal_email}</span>
              </span>
            )}
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
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.div>
  );
}

export default function EmployeeListPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);

  const {
    data: employees,
    isLoading,
    refetch,
  } = useFrappeList<Employee>("Employee", {
    fields: [
      "name",
      "employee_name",
      "employee",
      "first_name",
      "last_name",
      "gender",
      "status",
      "company",
      "department",
      "designation",
      "reports_to",
      "branch",
      "cell_number",
      "personal_email",
      "company_email",
      "date_of_birth",
      "date_of_joining",
      "creation",
    ],
    orderBy: { field: "creation", order: "desc" },
    search,
    limit: 100,
  });

  const deleteMutation = useFrappeDelete("Employee", {
    onSuccess: () => {
      setDeleteTarget(null);
      refetch();
    },
  });

  const filteredEmployees = useMemo(() => {
    if (!employees) return [];
    if (statusFilter === "all") return employees;
    return employees.filter((emp) => emp.status === statusFilter);
  }, [employees, statusFilter]);

  const statusCounts = useMemo(() => {
    if (!employees) return {} as Record<string, number>;
    return employees.reduce(
      (acc, emp) => {
        const s = emp.status || "Active";
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [employees]);

  const kpis = useMemo(() => {
    if (!employees)
      return { total: 0, active: 0, inactive: 0, suspended: 0 };
    return {
      total: employees.length,
      active: employees.filter((e) => e.status === "Active").length,
      inactive: employees.filter((e) => e.status === "Inactive").length,
      suspended: employees.filter((e) => e.status === "Suspended").length,
    };
  }, [employees]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.name);
  };

  if (isLoading) return <LoadingState type="cards" count={6} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employees"
        subtitle={`${filteredEmployees.length} staff member${filteredEmployees.length !== 1 ? "s" : ""}`}
        showSearch
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name, ID, email..."
        actions={
          <Button
            className="rounded-full shadow-lg shadow-primary/20"
            onClick={() => router.push("/hr/employee/new")}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Employee
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KPICard title="Total" value={kpis.total} icon={Users} isLoading={isLoading} />
        <KPICard title="Active" value={kpis.active} icon={CheckCircle2} variant="success" isLoading={isLoading} />
        <KPICard title="Inactive" value={kpis.inactive} icon={XCircle} variant="warning" isLoading={isLoading} />
        <KPICard title="Suspended" value={kpis.suspended} icon={Clock} variant="default" isLoading={isLoading} />
      </div>

      <div className="flex gap-2 flex-wrap">
        {EMPLOYEE_TABS.map((tab) => {
          const count =
            tab.key === "all"
              ? employees?.length || 0
              : statusCounts[tab.key] || 0;
          return (
            <Button
              key={tab.key}
              variant={statusFilter === tab.key ? "default" : "outline"}
              size="sm"
              className={cn(
                "rounded-full gap-2 transition-all",
                statusFilter === tab.key
                  ? "shadow-lg shadow-primary/20"
                  : "hover:bg-secondary/80",
              )}
              onClick={() => setStatusFilter(tab.key)}
            >
              {tab.label}
              <Badge
                variant="secondary"
                className={cn(
                  "h-5 min-w-[20px] px-1.5 text-[10px] font-bold",
                  statusFilter === tab.key
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-secondary",
                )}
              >
                {count}
              </Badge>
            </Button>
          );
        })}
      </div>

      {!employees || employees.length === 0 ? (
        <EmptyState
          title="No employees found"
          description="Add your first employee to start managing your team"
          action={
            <Button
              onClick={() => router.push("/hr/employee/new")}
              className="rounded-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          }
        />
      ) : filteredEmployees.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">No employees match this filter</p>
          <p className="text-sm mt-1">Try selecting a different status</p>
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
          variants={containerVariants}
          initial="hidden"
          animate="show"
          key={statusFilter}
        >
          {filteredEmployees.map((emp) => (
            <EmployeeCard
              key={emp.name}
              emp={emp}
              onView={() =>
                router.push(`/hr/employee/${encodeURIComponent(emp.name)}`)
              }
              onEdit={() =>
                router.push(
                  `/hr/employee/${encodeURIComponent(emp.name)}/edit`,
                )
              }
              onDelete={() => setDeleteTarget(emp)}
            />
          ))}
        </motion.div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Employee"
        description={`Are you sure you want to delete "${deleteTarget?.employee_name || deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
