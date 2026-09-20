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
import { useQueryClient } from "@tanstack/react-query";
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
  /** 5.2-A — one-click Start + Complete (the SME auto-run fast path). */
  handleRunJob: (jc: JobCard) => void;
  handleAssignWorkstation: (jc: JobCard, workstation: string) => void;
}

export function useJobCardLifecycle(
  onChanged: () => void | Promise<void>,
  showError: (resolution: GuidedResolution) => void,
): JobCardLifecycle {
  const [activeJc, setActiveJc] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // 2Y-R5 P8 — After ANY successful JC mutation, drop every cached Job Card /
  // Work Order query by doctype prefix and force mounted observers to refetch.
  // The Start/Complete path goes through raw fetch (no useFrappeMutation), so
  // without this the SO cockpit / WO detail kept pre-mutation statuses until a
  // manual browser refresh. Centralized HERE so every caller inherits correct
  // cache behavior (`refetchType: "all"` hits active full-doc queries like
  // ["Job Card","doc",name] that belong to no list key).
  const invalidateLifecycleCaches = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["Job Card"], refetchType: "all" });
    await queryClient.invalidateQueries({ queryKey: ["Work Order"], refetchType: "all" });
  }, [queryClient]);

  // Assign-workstation still uses the generic REST PUT — a simple top-level
  // field write (no child-row update). Employee assignment and Start/Complete
  // go through the server lifecycle route (see below).
  const wsJCMutation = useFrappeUpdate<JobCard>("Job Card", { showToast: false });

  // v4.2.1 — Start/Complete now go through the server lifecycle route
  // (/api/manufacturing/job-card/[name]/lifecycle) which fetches the FRESH doc
  // and closes the open time_log by name via frappe.client.set. The previous
  // REST PUT (db.updateDoc) silently failed to update the existing child row,
  // so Complete returned 200 but the status stayed "Work In Progress".
  const lifecycle = useCallback(
    async (jc: JobCard, action: "start" | "complete" | "run") => {
      setActiveJc(jc.name);
      try {
        const res = await fetch(
          `/api/manufacturing/job-card/${encodeURIComponent(jc.name)}/lifecycle`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action }),
          },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.success) {
          throw new Error(
            data?.details || data?.error || `Failed to ${action} Job Card`,
          );
        }
        toast.success(
          `Job Card ${jc.name} ${action === "start" ? "started" : "completed"}`,
        );
        // 2Y-R6 — the lifecycle route auto-completes the parent WO when this
        // was its last open Job Card. Celebrate it so the operator isn't
        // surprised by the WO flipping to Completed.
        if (data?.workOrderAutoCompleted?.workOrder) {
          toast.success(
            `Work Order ${data.workOrderAutoCompleted.workOrder} auto-completed`,
            { description: "All Job Cards are done — finished goods declared." },
          );
        } else if (data?.autoCompleteError) {
          toast.warning(
            "Work Order could not be completed automatically",
            { description: `${data.autoCompleteError} — use Complete Work Order manually.` },
          );
        }
        await onChanged();
        await invalidateLifecycleCaches();
      } catch (err) {
        showError(resolveFrappeError(err, { doctype: "Job Card" }));
      } finally {
        setActiveJc(null);
      }
    },
    [onChanged, showError, invalidateLifecycleCaches],
  );

  // 2Y-R6b — Employee assignment ALSO goes through the server lifecycle route
  // now. The generic REST PUT fails on SUBMITTED Job Cards ("No permission for
  // Job Card Time Log") when replacing the employee table with fresh rows; the
  // route swaps the link in place on the existing row instead. REPLACE
  // semantics: one operator per Job Card.
  const handleAssignEmployee = useCallback(
    async (jc: JobCard, employeeId: string, employeeName?: string) => {
      if (!employeeId) return;
      const existingIds = (Array.isArray(jc.employee) ? jc.employee : [])
        .map((r) =>
          typeof r === "object" && r && "employee" in r
            ? (r as { employee: string }).employee
            : null,
        )
        .filter(Boolean) as string[];
      if (existingIds.length === 1 && existingIds[0] === employeeId) {
        toast.info(`${employeeName || employeeId} is already assigned to ${jc.name}.`);
        return;
      }
      setActiveJc(jc.name);
      try {
        const res = await fetch(
          `/api/manufacturing/job-card/${encodeURIComponent(jc.name)}/lifecycle`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "assign_employee",
              employeeId,
              employeeName,
            }),
          },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.success) {
          throw new Error(
            data?.details || data?.error || "Failed to assign employee",
          );
        }
        toast.success(`Assigned ${employeeName || employeeId} to ${jc.name}`);
        await onChanged();
        await invalidateLifecycleCaches();
      } catch (err) {
        showError(resolveFrappeError(err, { doctype: "Job Card" }));
      } finally {
        setActiveJc(null);
      }
    },
    [onChanged, showError, invalidateLifecycleCaches],
  );

  const handleStartJob = useCallback(
    (jc: JobCard) => lifecycle(jc, "start"),
    [lifecycle],
  );

  const handleCompleteJob = useCallback(
    (jc: JobCard) => lifecycle(jc, "complete"),
    [lifecycle],
  );

  // 5.2-A — Run Job: one action does Start + Complete server-side (and the
  // route still auto-completes the parent WO when this was the last open JC).
  const handleRunJob = useCallback(
    (jc: JobCard) => lifecycle(jc, "run"),
    [lifecycle],
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
            await invalidateLifecycleCaches();
            setActiveJc(null);
          },
          onError: () => {
            setActiveJc(null);
            showError(resolveFrappeError(new Error("Failed to assign workstation"), { doctype: "Job Card" }));
          },
        },
      );
    },
    [wsJCMutation, onChanged, showError, invalidateLifecycleCaches],
  );

  return {
    activeJc,
    handleAssignEmployee,
    handleStartJob,
    handleCompleteJob,
    handleRunJob,
    handleAssignWorkstation,
  };
}
