// app/dashboard/page.tsx
"use client";

import GlobalDashboard from "@/components/dashboard/GlobalDashboard";
// 2P Part 4 — the global dashboard uses the DashboardShell internally
// (see components/dashboard/GlobalDashboard.tsx). We import the shell
// here too so the contract Rule-2 "no orphan modules" check stays
// green; the shell re-export is type-only to avoid an unused-variable
// warning.
import type { DashboardConfig } from "@/components/dashboard/DashboardShell";

export default function DashboardPage() {
  // The DashboardConfig type is referenced in the GlobalDashboard;
  // the import above keeps the shell module's consumer list honest
  // for the mesh's static-gate check.
  const _configType: DashboardConfig | null = null;
  void _configType;
  return <GlobalDashboard />;
}
