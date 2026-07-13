// components/manufacturing/CreateJobCardModal.tsx
// Obsidian ERP v4.0 — Phase 2Y-R3: create an additional Job Card against a
// Work Order. Lets the operator pick the Operation, Workstation, and an
// optional Employee before creating. Used from the WO detail page so a WO
// can carry multiple Job Cards (one per operation / re-run).

"use client";

import { useState, useCallback, useMemo } from "react";
import { Loader2, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FrappeSelect } from "@/components/smart/frappe-select";
import { useFrappeCreate, useFrappeDoc } from "@/hooks/generic";
import { useGuidedError } from "@/components/errors/GuidedErrorDialog";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import { getActiveCompany } from "@/lib/settings/company";
import { toast } from "sonner";
import type { WorkOrder, JobCard } from "@/types/doctype-types";

interface CreateJobCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workOrder: WorkOrder;
  onCreated: () => void;
}

export function CreateJobCardModal({
  open,
  onOpenChange,
  workOrder,
  onCreated,
}: CreateJobCardModalProps) {
  const { showError } = useGuidedError();
  const [operation, setOperation] = useState("");
  const [workstation, setWorkstation] = useState("");
  const [employee, setEmployee] = useState("");
  const [employeeName, setEmployeeName] = useState("");

  const createMutation = useFrappeCreate<JobCard, Record<string, unknown>>(
    "Job Card",
    { showToast: false },
  );

  // 2Y-R3 — Fetch the FULL Work Order doc independently so we always have
  // the `operations` child table, even if the parent's list row doesn't
  // carry child fields.  This is the canonical source for filtering
  // operations and workstations.
  const { data: fullWO, isLoading: loadingWO } = useFrappeDoc<WorkOrder>(
    "Work Order",
    workOrder.name,
    { enabled: open && !!workOrder.name },
  );

  // Use the independently-fetched full doc when available; fall back to
  // the prop (which may only have parent-level fields).
  const wo = useMemo(() => fullWO ?? workOrder, [fullWO, workOrder]);

  const woOperations = useMemo(() => {
    if (!Array.isArray(wo.operations)) return [];
    return (wo.operations as Array<{ operation?: string; workstation?: string }>);
  }, [wo.operations]);

  const woOperationNames = useMemo(
    () =>
      woOperations
        .map((o) => o.operation)
        .filter((n): n is string => Boolean(n)),
    [woOperations],
  );
  const woWorkstationNames = useMemo(
    () =>
      Array.from(
        new Set(woOperations.map((o) => o.workstation).filter(Boolean) as string[]),
      ),
    [woOperations],
  );

  // 2Y-R3 — when the operator picks an operation, pre-fill the workstation
  // from that operation's routing on the Work Order. Frappe REQUIRES a
  // workstation on a Job Card, so defaulting it removes the 400 ("Workstation
  // is required") that occurred when the field was left blank/optional.
  const handleOperationChange = useCallback(
    (op: string) => {
      setOperation(op);
      const match = woOperations.find((o) => o.operation === op);
      if (match?.workstation) setWorkstation(match.workstation);
    },
    [woOperations],
  );

  const handleCreate = useCallback(() => {
    if (!operation || !workstation) return;
    const payload = {
      naming_series: "JOB-.YYYY.-",
      work_order: wo.name,
      operation,
      workstation,
      production_item: wo.production_item || "",
      item_name: wo.item_name || "",
      for_quantity: Number(wo.qty) || 1,
      bom_no: wo.bom_no || "",
      company: wo.company || getActiveCompany(),
      wip_warehouse: wo.wip_warehouse || "",
      posting_date: new Date().toISOString().split("T")[0],
      expected_start_date: new Date().toISOString().slice(0, 19).replace("T", " "),
      employee: employee
        ? [{ employee, employee_name: employeeName || employee }]
        : [],
    };
    createMutation.mutate(payload, {
      onSuccess: () => {
        onCreated();
        onOpenChange(false);
        setOperation("");
        setWorkstation("");
        setEmployee("");
        setEmployeeName("");
      },
      onError: (err) => {
        // Surface the raw Frappe error so the operator sees the exact
        // rejection reason (e.g. "Operation X is not part of this Work
        // Order", missing mandatory field, etc.) instead of a generic
        // fallback message.
        const msg =
          err instanceof Error ? err.message : String(err);
        toast.error("Job Card creation failed", {
          description: msg,
          duration: 12_000,
        });
        showError(resolveFrappeError(err, { doctype: "Job Card" }));
      },
    });
  }, [operation, workstation, employee, employeeName, wo, createMutation, onCreated, onOpenChange, showError]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Job Card</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {loadingWO && (
            <p className="text-xs text-muted-foreground">
              Loading Work Order details…
            </p>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Operation
              {woOperationNames.length > 0 && (
                <span className="ml-1 text-muted-foreground/60 normal-case">
                  ({woOperationNames.length} available)
                </span>
              )}
            </label>
            <FrappeSelect
              doctype="Operation"
              value={operation}
              placeholder={
                woOperationNames.length
                  ? "Select operation…"
                  : "All operations available…"
              }
              filters={
                woOperationNames.length
                  ? [["name", "in", woOperationNames]]
                  : undefined
              }
              onChange={handleOperationChange}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Workstation
              {woWorkstationNames.length > 0 && (
                <span className="ml-1 text-muted-foreground/60 normal-case">
                  ({woWorkstationNames.length} available)
                </span>
              )}
            </label>
            <FrappeSelect
              doctype="Workstation"
              value={workstation}
              placeholder={
                woWorkstationNames.length
                  ? "Select workstation…"
                  : "All workstations available…"
              }
              filters={
                woWorkstationNames.length
                  ? [["name", "in", woWorkstationNames]]
                  : undefined
              }
              onChange={setWorkstation}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Employee <span className="text-muted-foreground/60">(optional)</span>
            </label>
            <FrappeSelect
              doctype="Employee"
              labelField="employee_name"
              value={employee}
              placeholder="Assign employee…"
              onChange={(val, doc) => {
                setEmployee(val);
                setEmployeeName((doc as { employee_name?: string })?.employee_name || "");
              }}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!operation || !workstation || createMutation.isPending}>
            {createMutation.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-1.5 h-4 w-4" />
            )}
            Create Job Card
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
