"use client";

// app/manufacturing/job-card/[name]/page.tsx
// Job Card Detail — FlowRail, WhatsNext, ActivityTimeline.
// Status machine: Open → Work In Progress → Completed.
// OKLCH tokens only. No @ts-nocheck, no any.

import { useCallback, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Play,
  CheckCircle2,
  Clock,
  Wrench,
  Loader2,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";

import { PageHeader, LoadingState } from "@/components/smart";
import { StatusBadge } from "@/components/smart/status-badge";
import { InfoCard, DataPoint } from "@/components/ui/info-card";
import { Button } from "@/components/ui/button";
import { FlowRail } from "@/components/flows/FlowRail";
import { WhatsNext } from "@/components/smart/WhatsNext";
import { ActivityTimeline } from "@/components/smart/ActivityTimeline";
import { useFlowChain } from "@/hooks/flows/use-flow-chain";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import {
  GuidedErrorDialog,
  useGuidedError,
} from "@/components/errors/GuidedErrorDialog";
import { useFrappeDoc, useFrappeUpdate } from "@/hooks/generic";
import { PrintShare } from "@/components/ui/print-share";
import { FrappeSelect } from "@/components/smart/frappe-select";
import type { JobCard } from "@/types/doctype-types";

interface TimeLogEntry {
  from_time?: string;
  to_time?: string;
  time_in_mins?: number;
  completed_qty?: number;
}

const fadeInUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const },
};

export default function JobCardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(String(params.name));

  const { resolution, showError, dismiss } = useGuidedError();

  const {
    data: jc,
    isLoading,
    error,
    refetch,
  } = useFrappeDoc<JobCard>("Job Card", name);

  const { result: chain, isLoading: chainLoading } = useFlowChain(
    "Job Card",
    name,
  );

  const updateMutation = useFrappeUpdate<JobCard>("Job Card", {
    showToast: false,
  });

  const status = jc?.status || "Open";
  const [busy, setBusy] = useState(false);

  // 2W A2 — Job Card lifecycle via frappe.client.set_value (same approach
  // as the WO detail JC table). useFrappeUpdate (PUT /api/resource/Job Card)
  // triggers the Frappe controller's validate hook which recomputes status
  // from time_logs — so writing status: "Work In Progress" gets reset on
  // save. set_value bypasses the controller for atomic field writes.
  const setJcFields = useCallback(
    async (fields: Record<string, unknown>): Promise<void> => {
      const res = await fetch(`/api/method/frappe.client.set_value`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctype: "Job Card",
          name,
          fieldname: fields,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body?.message || body?.exception || `set_value failed (${res.status})`,
        );
      }
    },
    [name],
  );

  const handleStart = async () => {
    setBusy(true);
    try {
      await setJcFields({
        status: "Work In Progress",
        actual_start_date: new Date().toISOString().slice(0, 19).replace("T", " "),
      });
      toast.success("Job Card started");
      await refetch();
    } catch (err) {
      showError(resolveFrappeError(err, { doctype: "Job Card" }));
    } finally {
      setBusy(false);
    }
  };

  const handleComplete = async () => {
    setBusy(true);
    try {
      const forQty = Number(jc?.for_quantity ?? 0);
      await setJcFields({
        status: "Completed",
        total_completed_qty: forQty,
        actual_end_date: new Date().toISOString().slice(0, 19).replace("T", " "),
      });
      toast.success("Job Card completed");
      await refetch();
    } catch (err) {
      showError(resolveFrappeError(err, { doctype: "Job Card" }));
    } finally {
      setBusy(false);
    }
  };

  // Employee chip assignment — append to the union row table (Table
  // MultiSelect child), same shape the WO detail JC row writes.
  const assignEmployee = (employeeId: string) => {
    if (!employeeId || !jc) return;
    const existing = (Array.isArray(jc.employee) ? jc.employee : [])
      .map((r: unknown) =>
        typeof r === "object" && r && "employee" in r
          ? (r as { employee: string }).employee
          : null,
      )
      .filter(Boolean) as string[];
    if (existing.includes(employeeId)) return;
    const rows = [...existing, employeeId].map((id) => ({ employee: id }));
    setBusy(true);
    updateMutation.mutate(
      { name, data: { employee: rows } },
      {
        onSuccess: () => {
          toast.success(`Employee assigned to ${name}`);
          refetch();
          setBusy(false);
        },
        onError: (err) => {
          setBusy(false);
          showError(resolveFrappeError(err, { doctype: "Job Card" }));
        },
      },
    );
  };

  const assignedEmployees = useMemo(() => {
    if (!jc || !Array.isArray(jc.employee)) return [];
    return jc.employee
      .map((r: unknown) =>
        typeof r === "object" && r && "employee_name" in r
          ? (r as { employee_name: string; employee?: string }).employee_name
          : typeof r === "object" && r && "employee" in r
            ? (r as { employee: string }).employee
            : null,
      )
      .filter(Boolean) as string[];
  }, [jc]);

  const whatsNext = [
    status === "Open" && {
      label: "Start Job",
      description: "Begin working on this job card",
      onClick: handleStart,
      isPrimary: true,
      isLoading: busy,
    },
    status === "Work In Progress" && {
      label: "Complete Job",
      description: "Mark this job card as completed",
      onClick: handleComplete,
      isPrimary: true,
      isLoading: busy,
    },
  ].filter(Boolean) as React.ComponentProps<typeof WhatsNext>["actions"];

  const activityItems = useMemo(
    () => [
      {
        id: "created",
        type: "created" as const,
        description: "Job Card created",
        user: jc?.owner ?? "—",
        timestamp: jc?.creation ?? new Date().toISOString(),
      },
      ...(status === "Work In Progress"
        ? [
            {
              id: "started",
              type: "status_change" as const,
              description: "Job started",
              user: jc?.modified_by ?? "—",
              timestamp:
                jc?.actual_start_date ??
                jc?.modified ??
                new Date().toISOString(),
            },
          ]
        : []),
      ...(status === "Completed"
        ? [
            {
              id: "completed",
              type: "status_change" as const,
              description: "Job completed",
              user: jc?.modified_by ?? "—",
              timestamp:
                jc?.actual_end_date ??
                jc?.modified ??
                new Date().toISOString(),
            },
          ]
        : []),
    ],
    [jc, status],
  );

  const timeLogs = useMemo(() => {
    if (!Array.isArray(jc?.time_logs) || jc.time_logs.length === 0) return [];
    return jc.time_logs as TimeLogEntry[];
  }, [jc]);

  if (isLoading) return <LoadingState />;

  if (error || !jc) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
        <p className="text-sm text-destructive">
          {error?.message ?? "Job Card not found."}
        </p>
        <Button
          variant="ghost"
          className="mt-3"
          onClick={() => router.push("/manufacturing/job-card")}
        >
          Back to Job Cards
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <motion.div {...fadeInUp}>
        <PageHeader
          title={jc.name}
          subtitle={jc.operation}
          backHref="/manufacturing/job-card"
          actions={
            <div className="flex items-center gap-2">
              <PrintShare doctype="Job Card" name={name} />
              {status === "Open" && (
                <Button size="sm" onClick={handleStart} disabled={busy}>
                  {busy ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="mr-1.5 h-4 w-4" />
                  )}
                  Start Job
                </Button>
              )}
              {status === "Work In Progress" && (
                <Button size="sm" onClick={handleComplete} disabled={busy}>
                  {busy ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  )}
                  Complete Job
                </Button>
              )}
            </div>
          }
        />
      </motion.div>

      {/* Status & Summary Bar */}
      <motion.div
        {...fadeInUp}
        transition={{ ...fadeInUp.transition, delay: 0.05 }}
        className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center gap-4">
            <StatusBadge status={status} size="lg" />
            <div className="h-8 w-px bg-border hidden md:block" />
            {jc.work_order && (
              <Link
                href={`/manufacturing/work-order/${encodeURIComponent(jc.work_order)}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                {jc.work_order}
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <DataPoint
            label="For Quantity"
            value={jc.for_quantity?.toString() ?? "—"}
          />
          <DataPoint
            label="Completed Qty"
            value={jc.total_completed_qty?.toString() ?? "—"}
          />
          <DataPoint
            label="Process Loss"
            value={jc.process_loss_qty?.toString() ?? "—"}
          />
          <DataPoint label="Company" value={jc.company} />
        </div>
      </motion.div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Center Column */}
        <div className="space-y-6 lg:col-span-8">
          {/* Job Details */}
          <motion.div
            {...fadeInUp}
            transition={{ ...fadeInUp.transition, delay: 0.1 }}
          >
            <InfoCard
              title="Job Details"
              icon={<Wrench className="h-5 w-5 text-primary" />}
            >
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <DataPoint label="Work Order" value={jc.work_order} />
                <DataPoint label="Operation" value={jc.operation} />
                <DataPoint
                  label="Workstation"
                  value={jc.workstation || "—"}
                />
                <DataPoint
                  label="For Quantity"
                  value={jc.for_quantity?.toString() ?? "—"}
                />
                <DataPoint label="Company" value={jc.company} />
                <DataPoint label="Status" value={status} />
                {jc.expected_start_date && (
                  <DataPoint
                    label="Expected Start"
                    value={new Date(
                      jc.expected_start_date,
                    ).toLocaleDateString()}
                  />
                )}
                {jc.expected_end_date && (
                  <DataPoint
                    label="Expected End"
                    value={new Date(
                      jc.expected_end_date,
                    ).toLocaleDateString()}
                  />
                )}
                {jc.time_required != null && (
                  <DataPoint
                    label="Time Required"
                    value={`${jc.time_required} min`}
                  />
                )}
              </div>
            </InfoCard>
          </motion.div>

          {/* Employees */}
          <motion.div
            {...fadeInUp}
            transition={{ ...fadeInUp.transition, delay: 0.13 }}
          >
            <InfoCard
              title="Employees"
              icon={<Users className="h-5 w-5 text-emerald-500" />}
            >
              <div className="flex flex-wrap items-center gap-2">
                {assignedEmployees.length > 0 ? (
                  assignedEmployees.map((emp) => (
                    <span
                      key={emp}
                      className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400"
                    >
                      {emp}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">
                    No employees assigned yet.
                  </span>
                )}
                <div className="ml-2 w-48">
                  <FrappeSelect
                    doctype="Employee"
                    labelField="employee_name"
                    placeholder="Assign employee…"
                    disabled={busy}
                    onChange={(val) => assignEmployee(val)}
                  />
                </div>
              </div>
            </InfoCard>
          </motion.div>

          {/* Time Logs */}
          {timeLogs.length > 0 && (
            <motion.div
              {...fadeInUp}
              transition={{ ...fadeInUp.transition, delay: 0.15 }}
            >
              <InfoCard
                title="Time Logs"
                icon={<Clock className="h-5 w-5 text-amber-500" />}
              >
                <div className="overflow-hidden rounded-xl border border-border/60">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border/60 bg-secondary/20">
                      <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        <th className="px-3 py-2.5 text-left font-semibold">
                          From
                        </th>
                        <th className="px-3 py-2.5 text-left font-semibold">
                          To
                        </th>
                        <th className="px-3 py-2.5 text-right font-semibold">
                          Time (min)
                        </th>
                        <th className="px-3 py-2.5 text-right font-semibold">
                          Completed Qty
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {timeLogs.map((log, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2.5 text-foreground">
                            {log.from_time
                              ? new Date(log.from_time).toLocaleString()
                              : "—"}
                          </td>
                          <td className="px-3 py-2.5 text-foreground">
                            {log.to_time
                              ? new Date(log.to_time).toLocaleString()
                              : "—"}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {log.time_in_mins ?? "—"}
                          </td>
                          <td className="px-3 py-2.5 text-right font-bold tabular-nums">
                            {log.completed_qty ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </InfoCard>
            </motion.div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6 lg:col-span-4">
          <motion.div
            {...fadeInUp}
            transition={{ ...fadeInUp.transition, delay: 0.2 }}
          >
            <InfoCard title="Journey">
              <FlowRail
                result={chain}
                currentDocName={name}
                sourceDoctype="Job Card"
                isLoading={chainLoading}
              />
            </InfoCard>
          </motion.div>

          <motion.div
            {...fadeInUp}
            transition={{ ...fadeInUp.transition, delay: 0.25 }}
          >
            <WhatsNext actions={whatsNext} />
          </motion.div>

          <motion.div
            {...fadeInUp}
            transition={{ ...fadeInUp.transition, delay: 0.3 }}
          >
            <ActivityTimeline items={activityItems} />
          </motion.div>
        </div>
      </div>

      <GuidedErrorDialog resolution={resolution} onDismiss={dismiss} />
    </div>
  );
}
