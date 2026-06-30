"use client";

// app/hr/dashboard/page.tsx
// Obsidian ERP v4.0 — HR Dashboard. KPI cards for Employee stats,
// department distribution, and recent hires. Follows the same
// DashboardShell pattern as other module dashboards.

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  UserCheck,
  UserX,
  Briefcase,
  Building2,
  Plus,
} from "lucide-react";
import { useFrappeList } from "@/hooks/generic";
import {
  ModuleHub,
  type HubKpi,
  type HubAction,
  type HubRecentItem,
} from "@/components/dashboard/ModuleHub";
import type { Employee, Department } from "@/types/doctype-types";

export default function HRDashboardPage() {
  const router = useRouter();

  const { data: employees, isLoading: loadingEmployees } = useFrappeList<Employee>(
    "Employee",
    { limit: 500 },
  );

  const { data: departments, isLoading: loadingDepts } = useFrappeList<Department>(
    "Department",
    { limit: 100 },
  );

  const isLoading = loadingEmployees || loadingDepts;

  const kpis = useMemo<HubKpi[]>(() => {
    const list = employees ?? [];
    const active = list.filter((e) => e.status === "Active").length;
    const inactive = list.filter((e) => e.status === "Inactive").length;
    return [
      { title: "Total Employees", value: list.length, icon: Users, variant: "default" },
      { title: "Active", value: active, icon: UserCheck, variant: "success" },
      { title: "Inactive", value: inactive, icon: UserX, variant: "warning" },
      { title: "Departments", value: (departments ?? []).length, icon: Building2, variant: "default" },
    ];
  }, [employees, departments]);

  const actions = useMemo<HubAction[]>(
    () => [
      {
        label: "New Employee",
        icon: Plus,
        href: "/hr/employee/new",
        description: "Add a new employee to the system",
        primary: true,
      },
      {
        label: "Employees",
        icon: Users,
        href: "/hr/employee",
        description: "View and manage all employees",
      },
      {
        label: "Departments",
        icon: Building2,
        href: "/hr/settings/department",
        description: "Manage department structure",
      },
      {
        label: "Designations",
        icon: Briefcase,
        href: "/hr/settings/designation",
        description: "Manage job designations",
      },
    ],
    [],
  );

  const recentHires = useMemo<HubRecentItem[]>(() => {
    const list = employees ?? [];
    return list
      .filter((e) => e.status === "Active")
      .sort((a, b) => {
        const da = a.date_of_joining ?? "";
        const db = b.date_of_joining ?? "";
        return db.localeCompare(da);
      })
      .slice(0, 5)
      .map((e) => ({
        name: e.employee_name || e.first_name || e.name,
        subtitle: `${e.designation ?? "—"} · ${e.department ?? "—"}`,
        href: `/hr/employee/${encodeURIComponent(e.name)}`,
        badge: e.status,
        badgeVariant: e.status === "Active" ? "default" : "secondary",
      }));
  }, [employees]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <ModuleHub
      title="HR"
      subtitle="Manage your workforce"
      icon={Briefcase}
      kpis={kpis}
      actions={actions}
      recent={recentHires}
      recentTitle="Recent Hires"
    />
  );
}
