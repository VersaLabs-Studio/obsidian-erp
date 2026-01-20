"use client";

import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Save,
  Loader2,
  Cpu as WorkstationIcon,
  Settings2,
  Gauge,
} from "lucide-react";
import { Form } from "@/components/ui/form";
import { useFrappeDoc, useFrappeUpdate } from "@/hooks/generic";
import { PageHeader, LoadingState } from "@/components/smart";
import {
  FormInput,
  FormTextarea,
  FormSelect,
  FormFrappeSelect,
} from "@/components/form";
import {
  WorkstationCreateSchema,
  type WorkstationFormData,
} from "@/lib/schemas/doctype-schemas";
import { toast } from "sonner";
import type { Workstation } from "@/types/doctype-types";
import { useEffect } from "react";
import type { ApiSuccessResponse } from "@/lib/api-factory";

const STATUS_OPTIONS = [
  { label: "Production", value: "Production" },
  { label: "Off", value: "Off" },
  { label: "Idle", value: "Idle" },
  { label: "Problem", value: "Problem" },
  { label: "Maintenance", value: "Maintenance" },
  { label: "Setup", value: "Setup" },
];

export default function EditWorkstationPage() {
  const { name } = useParams();
  const router = useRouter();
  const workstationName = decodeURIComponent(name as string);

  const { data: workstation, isLoading } = useFrappeDoc<Workstation>(
    "Workstation",
    workstationName,
  );

  const form = useForm<WorkstationFormData>({
    resolver: zodResolver(WorkstationCreateSchema),
    defaultValues: {
      workstation_name: "",
      workstation_type: "",
      plant_floor: "",
      warehouse: "",
      status: undefined,
      production_capacity: 1,
      hour_rate: 0,
      hour_rate_labour: 0,
      hour_rate_electricity: 0,
      hour_rate_consumable: 0,
      hour_rate_rent: 0,
      description: "",
    },
  });

  useEffect(() => {
    if (workstation) {
      form.reset({
        workstation_name: workstation.workstation_name,
        workstation_type: workstation.workstation_type || "",
        plant_floor: workstation.plant_floor || "",
        warehouse: workstation.warehouse || "",
        status: workstation.status,
        production_capacity: workstation.production_capacity || 1,
        hour_rate: workstation.hour_rate || 0,
        hour_rate_labour: workstation.hour_rate_labour || 0,
        hour_rate_electricity: workstation.hour_rate_electricity || 0,
        hour_rate_consumable: workstation.hour_rate_consumable || 0,
        hour_rate_rent: workstation.hour_rate_rent || 0,
        description: workstation.description || "",
      });
    }
  }, [workstation, form]);

  const updateMutation = useFrappeUpdate<
    ApiSuccessResponse<Workstation>,
    { name: string; data: WorkstationFormData }
  >("Workstation", {
    onSuccess: (response) => {
      toast.success("Workstation updated");
      const updatedDoc = response.data;
      router.push(
        `/manufacturing/workstation/${encodeURIComponent(updatedDoc.name || workstationName)}`,
      );
    },
    onError: (err) => toast.error(err.message),
    showToast: false,
  });

  if (isLoading) return <LoadingState variant="detail" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit ${workstation?.workstation_name || "Workstation"}`}
        subtitle={workstation?.name}
        backHref={`/manufacturing/workstation/${encodeURIComponent(workstationName)}`}
      />

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((data) =>
            updateMutation.mutate({ name: workstationName, data }),
          )}
          className="space-y-6"
        >
          {/* Section 1: Identity */}
          <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-6">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <WorkstationIcon className="h-5 w-5 text-primary" />
              Machine Identity
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                control={form.control}
                name="workstation_name"
                label="Machine Name"
                placeholder="e.g. Offset Printer A"
                required
              />
              <FormInput
                control={form.control}
                name="workstation_type"
                label="Machine Type"
                placeholder="e.g. Printing, Cutting, Binding"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                control={form.control}
                name="plant_floor"
                label="Plant Floor / Location"
                placeholder="e.g. Floor 1, Building A"
              />
              <FormFrappeSelect
                control={form.control}
                name="warehouse"
                label="Default Warehouse"
                doctype="Warehouse"
                placeholder="Select warehouse..."
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormSelect
                control={form.control}
                name="status"
                label="Operational Status"
                options={STATUS_OPTIONS}
                placeholder="Select status..."
              />
              <FormInput
                control={form.control}
                name="production_capacity"
                label="Production Capacity (units/hr)"
                type="number"
                required
              />
            </div>
          </div>

          {/* Section 2: Cost Rates */}
          <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-6">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Gauge className="h-5 w-5 text-emerald-500" />
              Cost Rates (ETB per Hour)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                control={form.control}
                name="hour_rate"
                label="Total Hour Rate (ETB)"
                type="number"
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <FormInput
                control={form.control}
                name="hour_rate_labour"
                label="Labour (ETB)"
                type="number"
              />
              <FormInput
                control={form.control}
                name="hour_rate_electricity"
                label="Electricity (ETB)"
                type="number"
              />
              <FormInput
                control={form.control}
                name="hour_rate_consumable"
                label="Consumables (ETB)"
                type="number"
              />
              <FormInput
                control={form.control}
                name="hour_rate_rent"
                label="Rent / Depreciation (ETB)"
                type="number"
              />
            </div>
          </div>

          {/* Section 3: Additional Info */}
          <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-6">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-muted-foreground" />
              Additional Information
            </h3>
            <FormTextarea
              control={form.control}
              name="description"
              label="Technical Description"
              placeholder="Enter technical specifications, maintenance notes, or operational details..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="rounded-full px-6"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              className="rounded-full min-w-[140px] shadow-lg shadow-primary/20"
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
