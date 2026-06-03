// app/manufacturing/operation/[name]/edit/page.tsx
// Obsidian ERP v4.0 - Edit Operation Page with Sub-Operations
// @ts-nocheck

"use client";

import { useParams, useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Save,
  Loader2,
  Cog as OperationIcon,
  Clock,
  Cpu,
  FileText,
  AlertCircle,
  Plus,
  Trash2,
  Layers,
} from "lucide-react";
import { Form } from "@/components/ui/form";
import { useFrappeDoc, useFrappeUpdate } from "@/hooks/generic";
import { PageHeader, LoadingState, EmptyState } from "@/components/smart";
import { FormInput, FormFrappeSelect, FormTextarea } from "@/components/form";
import {
  OperationUpdateSchema,
  type OperationUpdateData,
} from "@/lib/schemas/doctype-schemas";
import { toast } from "sonner";
import type { Operation } from "@/types/doctype-types";
import { cn } from "@/lib/utils";

export default function EditOperationPage() {
  const params = useParams();
  const router = useRouter();
  const operationName = decodeURIComponent(params.name as string);

  // Fetch existing operation
  const {
    data: operation,
    isLoading,
    error,
  } = useFrappeDoc<Operation>("Operation", operationName);

  // Initialize form
  const form = useForm<OperationUpdateData>({
    resolver: zodResolver(OperationUpdateSchema),
    defaultValues: {
      workstation: "",
      description: "",
      sub_operations: [],
    },
  });

  // Field array for sub-operations
  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "sub_operations",
  });

  // Populate form when operation loads
  useEffect(() => {
    if (operation) {
      form.reset({
        workstation: operation.workstation || "",
        description: operation.description || "",
        sub_operations: (operation.sub_operations || []).map((sub: any) => ({
          operation: sub.operation || "",
          time_in_mins: sub.time_in_mins || 0,
        })),
      });
    }
  }, [operation, form]);

  // Watch sub_operations to calculate total time
  const subOperations = form.watch("sub_operations") || [];
  const totalTime = subOperations.reduce(
    (sum, sub) => sum + (sub?.time_in_mins || 0),
    0,
  );

  // Update mutation
  const updateMutation = useFrappeUpdate<
    any,
    { name: string; data: OperationUpdateData }
  >("Operation", {
    onSuccess: () => {
      toast.success("Operation updated successfully");
      router.push(
        `/manufacturing/operation/${encodeURIComponent(operationName)}`,
      );
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to update operation");
    },
    showToast: false,
  });

  const onSubmit = (data: OperationUpdateData) => {
    updateMutation.mutate({
      name: operationName,
      data: data,
    });
  };

  // Add new sub-operation row
  const handleAddSubOperation = () => {
    append({ operation: "", time_in_mins: 0 });
  };

  // Format time helper
  const formatTime = (minutes: number): string => {
    if (minutes === 0) return "0 min";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  if (isLoading) {
    return (
      <LoadingState variant="detail" message="Fetching operation data..." />
    );
  }

  if (error || !operation) {
    return (
      <EmptyState
        icon={OperationIcon}
        title="Operation not found"
        description="The operation you are trying to edit could not be loaded."
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit: ${operation.name}`}
        subtitle="Modify operation configuration and sub-operations"
        backHref={`/manufacturing/operation/${encodeURIComponent(operationName)}`}
      />

      {/* Immutability Notice */}
      <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 flex gap-3 items-center">
        <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          The <span className="font-bold text-foreground">Operation Name</span>{" "}
          is a unique identifier and cannot be renamed. To change the name,
          delete this operation and create a new one.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-6 shadow-sm">
            {/* Workstation Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Cpu className="h-5 w-5 text-indigo-500" />
                <span>Default Workstation</span>
              </div>

              <FormFrappeSelect
                control={form.control}
                name="workstation"
                label="Machine Assignment"
                doctype="Workstation"
                placeholder="Select default machine..."
              />
            </div>

            {/* Sub-Operations Section */}
            <div className="space-y-4 pt-6 border-t border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <Layers className="h-5 w-5 text-violet-500" />
                  <span>Sub-Operations</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddSubOperation}
                  className="rounded-full"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Step
                </Button>
              </div>

              <p className="text-sm text-muted-foreground">
                Modify the individual steps that make up this operation.
              </p>

              {/* Sub-Operations Table */}
              {fields.length === 0 ? (
                <div className="bg-secondary/20 rounded-xl p-8 text-center">
                  <Layers className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">
                    No sub-operations defined. Add steps to break down this
                    operation.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddSubOperation}
                    className="rounded-full"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add First Step
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Header */}
                  <div className="grid grid-cols-12 gap-4 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <div className="col-span-1">#</div>
                    <div className="col-span-6">Sub-Operation</div>
                    <div className="col-span-3">Time (Minutes)</div>
                    <div className="col-span-2 text-right">Actions</div>
                  </div>

                  {/* Rows */}
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className={cn(
                        "grid grid-cols-12 gap-4 items-center p-4 rounded-xl",
                        "bg-secondary/20 border border-border/30",
                      )}
                    >
                      {/* Row Number */}
                      <div className="col-span-1">
                        <span className="text-sm font-medium text-muted-foreground">
                          {index + 1}
                        </span>
                      </div>

                      {/* Sub-Operation Select */}
                      <div className="col-span-6">
                        <FormFrappeSelect
                          control={form.control}
                          name={`sub_operations.${index}.operation`}
                          doctype="Operation"
                          placeholder="Select operation..."
                          filters={[["name", "!=", operationName]]}
                        />
                      </div>

                      {/* Time Input */}
                      <div className="col-span-3">
                        <FormInput
                          control={form.control}
                          name={`sub_operations.${index}.time_in_mins`}
                          type="number"
                          placeholder="0"
                        />
                      </div>

                      {/* Remove Button */}
                      <div className="col-span-2 flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                          className="h-8 w-8 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* Add More Button */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleAddSubOperation}
                    className="w-full rounded-xl border border-dashed border-border/50 hover:border-primary/50"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Another Step
                  </Button>
                </div>
              )}

              {/* Total Time Display */}
              <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                      Total Operation Time
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Calculated from sub-operations
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-indigo-600">
                    {formatTime(totalTime)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(totalTime / 60).toFixed(2)} hours
                  </p>
                </div>
              </div>
            </div>

            {/* Description Section */}
            <div className="space-y-4 pt-6 border-t border-border/50">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <FileText className="h-5 w-5 text-blue-500" />
                <span>Work Instructions</span>
              </div>

              <FormTextarea
                control={form.control}
                name="description"
                label="Detailed Description"
                rows={4}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="rounded-full px-8"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              className="rounded-full min-w-[160px] shadow-lg shadow-primary/20"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
