// app/manufacturing/operation/[name]/page.tsx
// Obsidian ERP v4.0 - Operation Detail Page with Sub-Operations Display
// @ts-nocheck

"use client";

import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Pencil,
  Trash2,
  Cog as OperationIcon,
  Clock,
  Cpu,
  FileText,
  ChevronRight,
  Activity,
  Layers,
} from "lucide-react";
import { useFrappeDoc, useFrappeDelete } from "@/hooks/generic";
import {
  PageHeader,
  LoadingState,
  EmptyState,
  ConfirmDialog,
} from "@/components/smart";
import { InfoCard, DataPoint } from "@/components/ui/info-card";
import type { Operation, Workstation } from "@/types/doctype-types";
import { toast } from "sonner";
import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Format time helper
function formatTime(minutes: number | undefined): string {
  if (!minutes || minutes === 0) return "Not set";
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0
    ? `${hours} hour${hours > 1 ? "s" : ""} ${mins} min`
    : `${hours} hour${hours > 1 ? "s" : ""}`;
}

// Sub Operation type (for child table rows)
interface SubOperationRow {
  operation: string;
  time_in_mins: number;
  idx?: number;
}

export default function OperationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const operationName = decodeURIComponent(params.name as string);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch operation
  const {
    data: operation,
    isLoading,
    error,
  } = useFrappeDoc<Operation>("Operation", operationName);

  // Fetch linked workstation if it exists
  const { data: workstation } = useFrappeDoc<Workstation>(
    "Workstation",
    operation?.workstation || "",
    { enabled: !!operation?.workstation },
  );

  // Delete mutation
  const deleteMutation = useFrappeDelete("Operation", {
    onSuccess: () => {
      toast.success("Operation deleted successfully");
      router.push("/manufacturing/operation");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to delete operation");
    },
    showToast: false,
  });

  if (isLoading) {
    return (
      <LoadingState variant="detail" message="Opening operation profile..." />
    );
  }

  if (error || !operation) {
    return (
      <EmptyState
        icon={OperationIcon}
        title="Operation not found"
        description="The requested operation profile could not be loaded."
        action={
          <Button
            onClick={() => router.push("/manufacturing/operation")}
            className="rounded-full"
          >
            Back to Operations
          </Button>
        }
      />
    );
  }

  // Get sub-operations array
  const subOperations: SubOperationRow[] = (operation.sub_operations ||
    []) as SubOperationRow[];
  const hasSubOperations = subOperations.length > 0;

  // Calculate estimated cost
  const estimatedCost =
    workstation?.hour_rate && operation.total_operation_time
      ? (workstation.hour_rate / 60) * operation.total_operation_time
      : null;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={operation.name}
        subtitle="Manufacturing Operation Profile"
        backHref="/manufacturing/operation"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() =>
                router.push(
                  `/manufacturing/operation/${encodeURIComponent(operationName)}/edit`,
                )
              }
              className="rounded-full px-6"
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              className="rounded-full px-6 shadow-lg shadow-destructive/20"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Costing & Time Card */}
        <InfoCard
          title="Standard Estimation"
          icon={<Clock className="h-4 w-4 text-amber-500" />}
        >
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <DataPoint
                label="Total Operation Time"
                value={formatTime(operation.total_operation_time)}
              />
              <DataPoint
                label="Time in Hours"
                value={
                  operation.total_operation_time
                    ? `${(operation.total_operation_time / 60).toFixed(2)} hrs`
                    : "—"
                }
              />
            </div>

            {/* Sub-operations count badge */}
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="rounded-full bg-violet-500/10 text-violet-600"
              >
                <Layers className="h-3 w-3 mr-1" />
                {subOperations.length} sub-operation
                {subOperations.length !== 1 ? "s" : ""}
              </Badge>
              {hasSubOperations && (
                <span className="text-xs text-muted-foreground">
                  Time calculated from sub-operations
                </span>
              )}
            </div>

            {estimatedCost !== null ? (
              <div className="pt-6 border-t border-border/50">
                <div className="bg-emerald-500/5 rounded-2xl p-5 border border-emerald-500/10">
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest mb-1">
                    Estimated Operational Cost
                  </p>
                  <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                    ETB {estimatedCost.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Calculated using {workstation?.workstation_name}&apos;s rate
                    of{" "}
                    <span className="font-bold text-foreground">
                      ETB {workstation?.hour_rate}/hr
                    </span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="pt-6 border-t border-border/50">
                <div className="bg-secondary/20 rounded-2xl p-5 border border-border/30 flex gap-4 items-center">
                  <div className="h-10 w-10 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                    <Activity className="h-5 w-5" />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Assign a{" "}
                    <span className="font-bold text-foreground">
                      Workstation
                    </span>{" "}
                    to see cost projections for this operation.
                  </p>
                </div>
              </div>
            )}
          </div>
        </InfoCard>

        {/* Workstation Details Card */}
        <InfoCard
          title="Default Workstation"
          icon={<Cpu className="h-4 w-4 text-indigo-500" />}
        >
          {workstation ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/20 border border-border/30">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                    <Cpu className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground">
                      {workstation.workstation_name}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {workstation.name}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/manufacturing/workstation/${encodeURIComponent(workstation.name)}`}
                  className="h-8 w-8 rounded-full hover:bg-secondary flex items-center justify-center transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <DataPoint
                  label="Machine Status"
                  value={
                    <Badge
                      variant="secondary"
                      className="rounded-full bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 px-3"
                    >
                      {workstation.status || "Operational"}
                    </Badge>
                  }
                />
                <DataPoint
                  label="Capacity"
                  value={`${workstation.production_capacity || 1} units/hr`}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 opacity-60">
              <Cpu className="h-12 w-12 text-muted-foreground mb-4 stroke-[1.5]" />
              <p className="text-sm font-medium text-muted-foreground">
                No workstation linked
              </p>
              <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">
                Costing disabled
              </p>
            </div>
          )}
        </InfoCard>

        {/* Sub-Operations Card */}
        <InfoCard
          title="Sub-Operations"
          icon={<Layers className="h-4 w-4 text-violet-500" />}
          className="lg:col-span-2"
        >
          {hasSubOperations ? (
            <div className="space-y-4">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border/50">
                <div className="col-span-1">#</div>
                <div className="col-span-8">Sub-Operation</div>
                <div className="col-span-3 text-right">Time</div>
              </div>

              {/* Table Rows */}
              {subOperations.map((sub, index) => (
                <div
                  key={sub.operation || index}
                  className={cn(
                    "grid grid-cols-12 gap-4 items-center px-4 py-3 rounded-xl",
                    "bg-secondary/20 border border-border/30",
                    "hover:bg-secondary/30 transition-colors",
                  )}
                >
                  <div className="col-span-1">
                    <span className="text-sm font-medium text-muted-foreground">
                      {index + 1}
                    </span>
                  </div>
                  <div className="col-span-8">
                    <Link
                      href={`/manufacturing/operation/${encodeURIComponent(sub.operation)}`}
                      className="flex items-center gap-3 group"
                    >
                      <div className="h-8 w-8 rounded-lg bg-violet-500/10 text-violet-600 flex items-center justify-center">
                        <OperationIcon className="h-4 w-4" />
                      </div>
                      <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                        {sub.operation}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </div>
                  <div className="col-span-3 text-right">
                    <Badge
                      variant="secondary"
                      className="rounded-full bg-amber-500/10 text-amber-600"
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      {sub.time_in_mins} min
                    </Badge>
                  </div>
                </div>
              ))}

              {/* Total Row */}
              <div className="grid grid-cols-12 gap-4 items-center px-4 py-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                <div className="col-span-1" />
                <div className="col-span-8">
                  <span className="text-sm font-bold text-foreground">
                    Total Operation Time
                  </span>
                </div>
                <div className="col-span-3 text-right">
                  <span className="text-lg font-black text-indigo-600">
                    {formatTime(operation.total_operation_time)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-border/40 rounded-3xl">
              <Layers className="h-10 w-10 text-muted-foreground/30 mb-4" />
              <p className="text-sm text-muted-foreground">
                No sub-operations defined
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Add sub-operations to break down this operation into steps
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  router.push(
                    `/manufacturing/operation/${encodeURIComponent(operationName)}/edit`,
                  )
                }
                className="rounded-full mt-4"
              >
                <Pencil className="h-4 w-4 mr-2" />
                Add Sub-Operations
              </Button>
            </div>
          )}
        </InfoCard>

        {/* Instructions Card */}
        <InfoCard
          title="Work Instructions"
          icon={<FileText className="h-4 w-4 text-blue-500" />}
          className="lg:col-span-2"
        >
          {operation.description ? (
            <div className="bg-secondary/10 rounded-2xl p-6 border border-border/30">
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {operation.description}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-border/40 rounded-3xl">
              <FileText className="h-10 w-10 text-muted-foreground/30 mb-4" />
              <p className="text-sm text-muted-foreground italic">
                No technical instructions provided for this operation.
              </p>
            </div>
          )}
        </InfoCard>

        {/* System Info Card */}
        <InfoCard
          title="Resource Metadata"
          icon={<OperationIcon className="h-4 w-4 text-muted-foreground" />}
          className="lg:col-span-2"
          variant="transparent"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-[11px]">
            <DataPoint label="Integration ID" value={operation.name} />
            <DataPoint
              label="Created"
              value={
                operation.creation
                  ? new Date(operation.creation).toLocaleDateString()
                  : "—"
              }
            />
            <DataPoint label="Resource Owner" value={operation.owner || "—"} />
            <DataPoint
              label="Last Modified"
              value={
                operation.modified
                  ? new Date(operation.modified).toLocaleDateString()
                  : "—"
              }
            />
          </div>
        </InfoCard>
      </div>

      {/* Delete Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Permanently Delete Operation?"
        description={`This will remove "${operationName}" from the manufacturing system. Any Bill of Materials (BOM) using this operation may fail or require updates.`}
        confirmText="Remove Operation"
        onConfirm={() => deleteMutation.mutateAsync(operationName)}
        loading={deleteMutation.isPending}
        variant="destructive"
      />
    </div>
  );
}
