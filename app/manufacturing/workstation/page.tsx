"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  MoreVertical,
  Pencil,
  Trash2,
  Plus,
  Cpu,
  Activity,
  Warehouse as WarehouseIcon,
  MapPin,
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
import type { Workstation } from "@/types/doctype-types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STATUS_COLORS: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  Production: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-600",
    border: "border-emerald-500/20",
  },
  Off: {
    bg: "bg-zinc-500/10",
    text: "text-zinc-500",
    border: "border-zinc-500/20",
  },
  Idle: {
    bg: "bg-amber-500/10",
    text: "text-amber-600",
    border: "border-amber-500/20",
  },
  Problem: {
    bg: "bg-red-500/10",
    text: "text-red-600",
    border: "border-red-500/20",
  },
  Maintenance: {
    bg: "bg-orange-500/10",
    text: "text-orange-600",
    border: "border-orange-500/20",
  },
  Setup: {
    bg: "bg-blue-500/10",
    text: "text-blue-600",
    border: "border-blue-500/20",
  },
};

function WorkstationCard({
  workstation,
  index,
  onView,
  onEdit,
  onDelete,
}: {
  workstation: Workstation;
  index: number;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const statusStyle = workstation.status
    ? STATUS_COLORS[workstation.status]
    : null;
  const docStatusLabel =
    workstation.docstatus === 1
      ? "Enabled"
      : workstation.docstatus === 2
        ? "Disabled"
        : "Draft";

  return (
    <div
      className="group relative bg-card rounded-2xl border border-border/50 p-5 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 transition-all duration-300 cursor-pointer animate-in fade-in slide-in-from-bottom-4"
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={onView}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "h-12 w-12 rounded-xl flex items-center justify-center",
              statusStyle ? statusStyle.bg : "bg-primary/10",
            )}
          >
            <Cpu
              className={cn(
                "h-6 w-6",
                statusStyle ? statusStyle.text : "text-primary",
              )}
            />
          </div>
          <div>
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
              {workstation.workstation_name}
            </h3>
            <p className="text-xs text-muted-foreground">
              {workstation.workstation_type || workstation.name}
            </p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100"
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
            >
              <Pencil className="h-4 w-4 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-3">
        {/* Status & Doc Status Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {workstation.status && statusStyle && (
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                  statusStyle.bg,
                  statusStyle.text,
                  statusStyle.border,
                )}
              >
                {workstation.status}
              </span>
            )}
            <span
              className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-medium",
                workstation.docstatus === 1
                  ? "bg-emerald-500/10 text-emerald-600"
                  : workstation.docstatus === 2
                    ? "bg-red-500/10 text-red-600"
                    : "bg-secondary text-muted-foreground",
              )}
            >
              {docStatusLabel}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
            <span className="text-[10px]">ETB</span>
            <span>{(workstation.hour_rate || 0).toFixed(2)}/hr</span>
          </div>
        </div>

        {/* Location & Warehouse Row */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border/50">
          {workstation.plant_floor && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {workstation.plant_floor}
            </span>
          )}
          {workstation.warehouse && (
            <span className="flex items-center gap-1">
              <WarehouseIcon className="h-3 w-3" />
              {workstation.warehouse}
            </span>
          )}
          {!workstation.plant_floor && !workstation.warehouse && (
            <span className="flex items-center gap-1">
              <Activity className="h-3 w-3" />
              {workstation.production_capacity || 1} units/hr capacity
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function WorkstationListPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const {
    data: workstations,
    isLoading,
    error,
    refetch,
  } = useFrappeList<Workstation>("Workstation", {
    fields: [
      "name",
      "workstation_name",
      "workstation_type",
      "plant_floor",
      "warehouse",
      "status",
      "production_capacity",
      "hour_rate",
      "docstatus",
      "creation",
    ],
    orderBy: { field: "creation", order: "desc" },
  });

  const deleteMutation = useFrappeDelete("Workstation", {
    onSuccess: () => {
      toast.success("Workstation deleted");
      refetch();
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err.message),
    showToast: false,
  });

  const filtered = useMemo(
    () =>
      workstations?.filter(
        (w) =>
          w.workstation_name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          w.workstation_type
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          w.plant_floor?.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [workstations, searchTerm],
  );

  if (isLoading) return <LoadingState variant="cards" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workstations"
        subtitle="Manage manufacturing machines and operational centers"
        showSearch
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        actions={
          <Button
            onClick={() => router.push("/manufacturing/workstation/new")}
            className="rounded-full shadow-lg shadow-primary/20"
          >
            <Plus className="h-4 w-4 mr-2" /> Add Workstation
          </Button>
        }
      />

      {filtered?.length === 0 ? (
        <EmptyState
          icon={Cpu}
          title="No Workstations Found"
          description="Define your machines and workstations to start costing production."
          action={
            <Button
              onClick={() => router.push("/manufacturing/workstation/new")}
            >
              Add Workstation
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered?.map((w, idx) => (
            <WorkstationCard
              key={w.name}
              workstation={w}
              index={idx}
              onView={() =>
                router.push(
                  `/manufacturing/workstation/${encodeURIComponent(w.name)}`,
                )
              }
              onEdit={() =>
                router.push(
                  `/manufacturing/workstation/${encodeURIComponent(w.name)}/edit`,
                )
              }
              onDelete={() => setDeleteTarget(w.name)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Workstation"
        description="Are you sure? This may affect historical costing data."
        confirmText="Delete"
        onConfirm={async () => {
          if (deleteTarget) {
            await deleteMutation.mutateAsync(deleteTarget);
          }
        }}
        loading={deleteMutation.isPending}
        variant="destructive"
      />
    </div>
  );
}
