"use client";

import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Pencil,
  Trash2,
  Cpu as WorkstationIcon,
  Activity,
  Gauge,
  MapPin,
  Warehouse as WarehouseIcon,
  Settings2,
  Clock,
} from "lucide-react";
import { useFrappeDoc, useFrappeDelete } from "@/hooks/generic";
import { PageHeader, LoadingState, ConfirmDialog } from "@/components/smart";
import { InfoCard, DataPoint } from "@/components/ui/info-card";
import { useState } from "react";
import { toast } from "sonner";
import type { Workstation } from "@/types/doctype-types";
import { cn } from "@/lib/utils";

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

export default function WorkstationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workstationName = decodeURIComponent(params.name as string);
  const [showDelete, setShowDelete] = useState(false);

  const {
    data: workstation,
    isLoading,
    error,
  } = useFrappeDoc<Workstation>("Workstation", workstationName);

  const deleteMutation = useFrappeDelete("Workstation", {
    onSuccess: () => {
      router.push("/manufacturing/workstation");
      toast.success("Workstation deleted successfully");
    },
    onError: (err) => toast.error(err.message),
    showToast: false,
  });

  if (isLoading) return <LoadingState variant="detail" />;
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="h-16 w-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
          <Activity className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold">Error loading Workstation</h2>
        <p className="text-muted-foreground">{error.message}</p>
        <Button onClick={() => router.push("/manufacturing/workstation")}>
          Back to List
        </Button>
      </div>
    );
  }
  if (!workstation) return null;

  const statusStyle = workstation.status
    ? STATUS_COLORS[workstation.status]
    : null;
  const docStatusLabel =
    workstation.docstatus === 1
      ? "Submitted"
      : workstation.docstatus === 2
        ? "Cancelled"
        : "Draft";
  const docStatusColor =
    workstation.docstatus === 1
      ? "text-emerald-600 bg-emerald-500/10"
      : workstation.docstatus === 2
        ? "text-red-600 bg-red-500/10"
        : "text-muted-foreground bg-secondary";

  return (
    <div className="space-y-6">
      <PageHeader
        title={workstation.workstation_name}
        subtitle={
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground">{workstation.name}</span>
            {workstation.status && statusStyle && (
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-bold uppercase",
                  statusStyle.bg,
                  statusStyle.text,
                  statusStyle.border,
                  "border",
                )}
              >
                {workstation.status}
              </span>
            )}
            <span
              className={cn(
                "px-2 py-0.5 rounded-full text-xs font-medium",
                docStatusColor,
              )}
            >
              {docStatusLabel}
            </span>
          </div>
        }
        backHref="/manufacturing/workstation"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() =>
                router.push(
                  `/manufacturing/workstation/${encodeURIComponent(workstation.name)}/edit`,
                )
              }
              className="rounded-full px-6"
            >
              <Pencil className="h-4 w-4 mr-2" /> Edit
            </Button>
            <Button
              variant="destructive"
              onClick={() => setShowDelete(true)}
              className="rounded-full px-6 shadow-lg shadow-destructive/20"
            >
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Machine Identity */}
        <InfoCard
          title="Machine Identity"
          icon={<WorkstationIcon className="h-4 w-4 text-primary" />}
        >
          <div className="grid grid-cols-2 gap-x-8 gap-y-6">
            <DataPoint
              label="Machine Name"
              value={workstation.workstation_name}
            />
            <DataPoint
              label="Machine Type"
              value={workstation.workstation_type || "—"}
            />
            <DataPoint
              label="Plant Floor"
              value={
                workstation.plant_floor ? (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    {workstation.plant_floor}
                  </span>
                ) : (
                  "—"
                )
              }
            />
            <DataPoint
              label="Default Warehouse"
              value={
                workstation.warehouse ? (
                  <span className="flex items-center gap-1.5">
                    <WarehouseIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    {workstation.warehouse}
                  </span>
                ) : (
                  "—"
                )
              }
            />
            <DataPoint
              label="Production Capacity"
              value={`${workstation.production_capacity || 1} units/hr`}
            />
            <DataPoint
              label="Status"
              value={
                workstation.status && statusStyle ? (
                  <span
                    className={cn(
                      "px-2 py-1 rounded-full text-xs font-bold uppercase",
                      statusStyle.bg,
                      statusStyle.text,
                    )}
                  >
                    {workstation.status}
                  </span>
                ) : (
                  "—"
                )
              }
            />
          </div>
        </InfoCard>

        {/* Cost Rates */}
        <InfoCard
          title="Cost Rates (ETB/hr)"
          icon={<Gauge className="h-4 w-4 text-emerald-500" />}
        >
          <div className="grid grid-cols-2 gap-x-8 gap-y-6">
            <DataPoint
              label="Total Hour Rate"
              value={
                <span className="text-xl font-bold text-emerald-600">
                  ETB {(workstation.hour_rate || 0).toFixed(2)}
                </span>
              }
            />
            <div /> {/* Spacer */}
            <DataPoint
              label="Labour"
              value={`ETB ${(workstation.hour_rate_labour || 0).toFixed(2)}`}
            />
            <DataPoint
              label="Electricity"
              value={`ETB ${(workstation.hour_rate_electricity || 0).toFixed(2)}`}
            />
            <DataPoint
              label="Consumables"
              value={`ETB ${(workstation.hour_rate_consumable || 0).toFixed(2)}`}
            />
            <DataPoint
              label="Rent / Depreciation"
              value={`ETB ${(workstation.hour_rate_rent || 0).toFixed(2)}`}
            />
          </div>
        </InfoCard>

        {/* Description */}
        <InfoCard
          title="Technical Description"
          icon={<Settings2 className="h-4 w-4 text-muted-foreground" />}
          className="lg:col-span-2"
        >
          <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {workstation.description || "No description provided."}
          </p>
        </InfoCard>

        {/* Metadata */}
        <InfoCard
          title="Document Info"
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
          className="lg:col-span-2"
          variant="transparent"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-muted-foreground">
            <div>
              <span className="font-medium">Created:</span>{" "}
              {workstation.creation
                ? new Date(workstation.creation).toLocaleString()
                : "—"}
            </div>
            <div>
              <span className="font-medium">Modified:</span>{" "}
              {workstation.modified
                ? new Date(workstation.modified).toLocaleString()
                : "—"}
            </div>
            <div>
              <span className="font-medium">Owner:</span>{" "}
              {workstation.owner || "—"}
            </div>
            <div>
              <span className="font-medium">Doc Status:</span>{" "}
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded text-[10px] font-medium",
                  docStatusColor,
                )}
              >
                {docStatusLabel}
              </span>
            </div>
          </div>
        </InfoCard>
      </div>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete Workstation?"
        description="Are you sure you want to delete this workstation? This action may affect historical costing data and cannot be undone."
        onConfirm={async () => {
          await deleteMutation.mutateAsync(workstationName);
        }}
        loading={deleteMutation.isPending}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
