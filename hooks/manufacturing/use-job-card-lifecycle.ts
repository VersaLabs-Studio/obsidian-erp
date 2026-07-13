// hooks/manufacturing/use-job-card-lifecycle.ts
// Obsidian ERP v4.0 — Phase 2Y-R2 (P0/P3): shared Job Card lifecycle.
//
// Encapsulates the Start / Complete / Assign-Employee / Assign-Workstation
// mutations for a Job Card. Every handler takes the FULL Job Card doc
// (fetched via useFrappeDoc) — never a get_list row — because `employee`
// and `time_logs` are child tables and CANNOT be requested in a Frappe
// get_list (they 500 with "Unknown column"). The caller is responsible for
// fetching the full doc and passing it in.
//
// The Frappe controller recomputes `status` from `time_logs` on every PUT,
// so we write the CORRECT time_logs data (2X P0-B):
//   Start:    append a new time_log {employee, from_time, completed_qty: 0}
//   Complete: update the open time_log row with {to_time, completed_qty}

"use client";

import { useState, useCallback } from "react";
import { useFrappeUpdate } from "@/hooks/generic";
import type { JobCard } from "@/types/doctype-types";
import { toast } from "sonner";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";

type GuidedResolution = ReturnType<typeof resolveFrappeError>;

export interface JobCardLifecycle {
  /** Name of the JC currently running a mutation (for button disabling). */
  activeJc: string | null;
  handleAssignEmployee: (jc: JobCard, employeeId: string, employeeName?: string) => void;
  handleStartJob: (jc: JobCard) => void;
  handleCompleteJob: (jc: JobCard) => void;
  handleAssignWorkstation: (jc: JobCard, workstation: string) => void;
}

export function useJobCardLifecycle(
  onChanged: () => void | Promise<void>,
  showError: (resolution: GuidedResolution) => void,
): JobCardLifecycle {
  const assignJCMutation = useFrappeUpdate<JobCard>("Job Card", { showToast: false });
  const lifecycleJCMutation = useFrappeUpdate<JobCard>("Job Card", { showToast: false });
  const wsJCMutation = useFrappeUpdate<JobCard>("Job Card", { showToast: false });
  const [activeJc, setActiveJc] = useState<string | null>(null);

  const handleAssignEmployee = useCallback(
    (jc: JobCard, employeeId: string, employeeName?: string) => {
      if (!employeeId) return;
      const existing = (Array.isArray(jc.employee) ? jc.employee : [])
        .map((r) =>
          typeof r === "object" && r && "employee" in r
            ? (r as { employee: string }).employee
            : null,
        )
        .filter(Boolean) as string[];
      if (existing.includes(employeeId)) {
        toast.info(`${employeeName || employeeId} is already assigned to ${jc.name}.`);
        return;
      }
      // 2X P0-D — include employee_name so the chip shows the name, not the ID.
      const rows = [...existing, employeeId].map((id) => ({
        employee: id,
        employee_name: id === employeeId && employeeName ? employeeName : undefined,
      }));
      setActiveJc(jc.name);
      assignJCMutation.mutate(
        { name: jc.name, data: { employee: rows } },
        {
          onSuccess: async () => {
            toast.success(`Assigned ${employeeName || employeeId} to ${jc.name}`);
            await onChanged();
            setActiveJc(null);
          },
          onError: (err) => {
            setActiveJc(null);
            showError(resolveFrappeError(err, { doctype: "Job Card" }));
          },
        },
      );
    },
    [assignJCMutation, onChanged, showError],
  );

  const handleStartJob = useCallback(
    (jc: JobCard) => {
      const employees = Array.isArray(jc.employee) ? jc.employee : [];
      if (employees.length === 0) {
        toast.error("Assign an employee before starting this Job Card.");
        return;
      }
      const employeeId = (employees[0] as { employee?: string })?.employee || "";
      const existingLogs = Array.isArray(jc.time_logs) ? jc.time_logs : [];
      const newTimeLog = {
        employee: employeeId,
        from_time: new Date().toISOString().slice(0, 19).replace("T", " "),
        completed_qty: 0,
      };
      setActiveJc(jc.name);
      lifecycleJCMutation.mutate(
        {
          name: jc.name,
          data: {
            status: "Work In Progress",
            time_logs: [...(existingLogs as unknown[]), newTimeLog],
          },
        },
        {
          onSuccess: async () => {
            toast.success(`Job Card ${jc.name} started`);
            await onChanged();
            setActiveJc(null);
          },
          onError: (err) => {
            setActiveJc(null);
            showError(resolveFrappeError(err, { doctype: "Job Card" }));
          },
        },
      );
    },
    [lifecycleJCMutation, onChanged, showError],
  );

  const handleCompleteJob = useCallback(
    (jc: JobCard) => {
      const now = new Date().toISOString().slice(0, 19).replace("T", " ");
      const forQty = Number(jc.for_quantity ?? 0);
      const existingLogs = Array.isArray(jc.time_logs)
        ? (jc.time_logs as Array<Record<string, unknown>>)
        : [];
      const updatedLogs = existingLogs.map((log, idx) => {
        const isOpen = !log.to_time;
        if (isOpen || idx === existingLogs.length - 1) {
          return { ...log, to_time: now, completed_qty: forQty };
        }
        return log;
      });
      setActiveJc(jc.name);
      lifecycleJCMutation.mutate(
        {
          name: jc.name,
          data: {
            status: "Completed",
            total_completed_qty: forQty,
            time_logs: updatedLogs,
          },
        },
        {
          onSuccess: async () => {
            toast.success(`Job Card ${jc.name} completed`);
            await onChanged();
            setActiveJc(null);
          },
          onError: (err) => {
            setActiveJc(null);
            showError(resolveFrappeError(err, { doctype: "Job Card" }));
          },
        },
      );
    },
    [lifecycleJCMutation, onChanged, showError],
  );

  const handleAssignWorkstation = useCallback(
    (jc: JobCard, workstation: string) => {
      if (!workstation) return;
      setActiveJc(jc.name);
      wsJCMutation.mutate(
        { name: jc.name, data: { workstation } },
        {
          onSuccess: async () => {
            toast.success(`Workstation ${workstation} assigned to ${jc.name}`);
            await onChanged();
            setActiveJc(null);
          },
          onError: (err) => {
            setActiveJc(null);
            showError(resolveFrappeError(err, { doctype: "Job Card" }));
          },
        },
      );
    },
    [wsJCMutation, onChanged, showError],
  );

  return {
    activeJc,
    handleAssignEmployee,
    handleStartJob,
    handleCompleteJob,
    handleAssignWorkstation,
  };
}
