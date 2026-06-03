// app/manufacturing/operation/new/page.tsx
// Obsidian ERP v4.0 - Create Operation Page with Sub-Operations
// @ts-nocheck

"use client";

import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Save,
  Loader2,
  Cog as OperationIcon,
  Clock,
  Cpu,
  FileText,
  Plus,
  Trash2,
  Layers,
} from "lucide-react";
import { Form } from "@/components/ui/form";
import { useFrappeCreate, useFrappeList } from "@/hooks/generic";
import { PageHeader } from "@/components/smart";
import { FormInput, FormFrappeSelect, FormTextarea } from "@/components/form";
import {
  OperationCreateSchema,
  type OperationFormData,
  type SubOperationData,
} from "@/lib/schemas/doctype-schemas";
import { toast } from "sonner";
import type { Operation } from "@/types/doctype-types";
import { cn } from "@/lib/utils";

export default function CreateOperationPage() {
  const router = useRouter();

  // Initialize form with sub_operations array
  const form = useForm<OperationFormData>({
    resolver: zodResolver(OperationCreateSchema),
    defaultValues: {
      name: "",
      workstation: "",
      description: "",
      sub_operations: [],
    },
  });

  // Field array for sub-operations child table
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "sub_operations",
  });

  // Watch sub_operations to calculate total time
  const subOperations = form.watch("sub_operations") || [];
  const totalTime = subOperations.reduce(
    (sum, sub) => sum + (sub?.time_in_mins || 0),
    0,
  );

  // Fetch existing operations for sub-operation selection
  // We need to exclude the current operation being created
  const { data: existingOperations } = useFrappeList<Operation>("Operation", {
    fields: ["name", "total_operation_time"],
    orderBy: { field: "name", order: "asc" },
    limit: 200,
  });

  // Create mutation
  const createMutation = useFrappeCreate<any, OperationFormData>("Operation", {
    onSuccess: (response) => {
      toast.success("Operation created successfully");
      const createdOp = response.data;
      router.push(
        `/manufacturing/operation/${encodeURIComponent(createdOp.name)}`,
      );
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to create operation");
    },
    showToast: false,
  });

  const onSubmit = (data: OperationFormData) => {
    createMutation.mutate(data);
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="New Operation"
        subtitle="Define a manufacturing action with sub-operations"
        backHref="/manufacturing/operation"
      />

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Main Card */}
          <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-6 shadow-sm">
            {/* Identity Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <OperationIcon className="h-5 w-5 text-indigo-500" />
                <span>Operation Identity</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormInput
                  control={form.control}
                  name="name"
                  label="Operation Name"
                  placeholder="e.g., Printing, Cutting, Binding"
                  required
                  description="Use a clear, unique action name"
                />

                <FormFrappeSelect
                  control={form.control}
                  name="workstation"
                  label="Default Workstation"
                  doctype="Workstation"
                  placeholder="Select default machine..."
                  description="Assigns default rates when used in BOMs"
                />
              </div>
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
                Define the individual steps that make up this operation. The
                total time will be calculated automatically.
              </p>

              {/* Sub-Operations Table */}
              {fields.length === 0 ? (
                <div className="bg-secondary/20 rounded-xl p-8 text-center">
                  <Layers className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">
                    No sub-operations defined yet. Add steps to break down this
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
                        "animate-in fade-in slide-in-from-top-2",
                      )}
                      style={{ animationDelay: `${index * 50}ms` }}
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
                          // Filter out current operation name if set
                          filters={
                            form.watch("name")
                              ? [["name", "!=", form.watch("name")]]
                              : undefined
                          }
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
                label="Operation Description"
                placeholder="Describe the step-by-step process for this operation..."
                rows={4}
              />
            </div>
          </div>

          {/* Info Banner */}
          <div className="bg-violet-500/5 border border-violet-500/10 rounded-2xl p-5 flex gap-4 items-start">
            <div className="h-10 w-10 min-w-[40px] rounded-xl bg-violet-500/10 text-violet-600 flex items-center justify-center">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-foreground mb-1">
                Sub-Operations Workflow
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Sub-operations allow you to break down complex operations into
                smaller, trackable steps. The total operation time is
                automatically calculated from all sub-operation times. This
                enables detailed job card tracking and accurate costing.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
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
              disabled={createMutation.isPending}
              className="rounded-full min-w-[160px] shadow-lg shadow-primary/20"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Operation
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
