"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Search,
  Building2,
  RefreshCw,
  FolderTree,
  Target,
  BarChart4,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useFrappeList } from "@/hooks/generic";
import { PageHeader, LoadingState, EmptyState } from "@/components/smart";
import { CostCenterTree } from "@/components/accounting/cost-center-tree";
import type { CostCenter } from "@/types/doctype-types";
import { cn } from "@/lib/utils";

export default function CostCenterPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");

  const {
    data: costCenters,
    isLoading,
    refetch,
  } = useFrappeList<CostCenter>("Cost Center", {
    fields: [
      "name",
      "cost_center_name",
      "cost_center_number",
      "parent_cost_center",
      "is_group",
      "disabled",
      "company",
    ],
    orderBy: { field: "name", order: "asc" },
    limit: 500,
  });

  const filtered = useMemo(() => {
    if (!costCenters) return [];
    if (!searchTerm) return costCenters;
    return costCenters.filter(
      (cc) =>
        cc.cost_center_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cc.name?.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [costCenters, searchTerm]);

  const stats = useMemo(() => {
    if (!costCenters) return { total: 0, groups: 0, units: 0 };
    return {
      total: costCenters.length,
      groups: costCenters.filter((c) => c.is_group === 1).length,
      units: costCenters.filter((c) => c.is_group === 0).length,
    };
  }, [costCenters]);

  if (isLoading) return <LoadingState type="detail" />;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      <PageHeader
        title="Cost Centers"
        subtitle="Manage business divisions, departments, and projects"
        backUrl="/accounting/setup"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full h-10 w-10 bg-card"
              onClick={() => refetch()}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              className="rounded-full shadow-lg shadow-primary/20 h-10 px-6 font-bold"
              onClick={() => router.push("/accounting/setup/cost-center/new")}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Cost Center
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card rounded-3xl border border-border/50 p-6 flex items-center gap-4 shadow-sm">
          <div className="h-12 w-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-600">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
              Total Centers
            </p>
            <p className="text-2xl font-black">{stats.total}</p>
          </div>
        </div>
        <div className="bg-card rounded-3xl border border-border/50 p-6 flex items-center gap-4 shadow-sm">
          <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600">
            <FolderTree className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
              Groups
            </p>
            <p className="text-2xl font-black">{stats.groups}</p>
          </div>
        </div>
        <div className="bg-card rounded-3xl border border-border/50 p-6 flex items-center gap-4 shadow-sm">
          <div className="h-12 w-12 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-600">
            <Target className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
              Operational Units
            </p>
            <p className="text-2xl font-black">{stats.units}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-4 items-center justify-between flex-wrap">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search cost center name..."
            className="pl-10 h-10 rounded-full bg-card border-border/50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border/50 shadow-xl overflow-hidden min-h-[600px]">
        <div className="p-8 border-b border-border bg-gradient-to-r from-rose-500/5 to-transparent flex items-center justify-between">
          <h3 className="font-black text-sm uppercase tracking-[0.2em] flex items-center gap-3">
            <BarChart4 className="h-4 w-4 text-rose-600" /> Operational
            Structure
          </h3>
        </div>

        <div className="p-6">
          {searchTerm ? (
            <div className="space-y-2">
              {filtered.map((cc) => (
                <div
                  key={cc.name}
                  className="flex items-center justify-between p-4 bg-secondary/20 rounded-2xl hover:bg-rose-500/5 cursor-pointer transition-all"
                  onClick={() =>
                    router.push(
                      `/accounting/setup/cost-center/${encodeURIComponent(cc.name)}`,
                    )
                  }
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center font-bold",
                        cc.is_group
                          ? "bg-amber-500/10 text-amber-600"
                          : "bg-sky-500/10 text-sky-600",
                      )}
                    >
                      {cc.is_group ? (
                        <FolderTree className="h-4 w-4" />
                      ) : (
                        <Target className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold">{cc.cost_center_name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                        {cc.parent_cost_center || "Root"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <CostCenterTree
              costCenters={costCenters || []}
              onAddSub={(parent) =>
                router.push(
                  `/accounting/setup/cost-center/new?parent_cost_center=${encodeURIComponent(parent.name)}`,
                )
              }
              onEdit={(cc) =>
                router.push(
                  `/accounting/setup/cost-center/${encodeURIComponent(cc.name)}/edit`,
                )
              }
            />
          )}

          {!isLoading && (!costCenters || costCenters.length === 0) && (
            <EmptyState
              title="No Cost Centers"
              description="Start by creating your first department or division."
            />
          )}
        </div>
      </div>
    </div>
  );
}
