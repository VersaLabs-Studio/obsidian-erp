"use client";

import { useRouter } from "next/navigation";
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
import { useFrappeCreate, useFrappeOptions } from "@/hooks/generic";
import { PageHeader } from "@/components/smart";
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
import type { ApiSuccessResponse } from "@/lib/api-factory";
import type { Workstation } from "@/types/doctype-types";

const STATUS_OPTIONS = [
  { label: "Production", value: "Production" },
  { label: "Off", value: "Off" },
  { label: "Idle", value: "Idle" },
  { label: "Problem", value: "Problem" },
  { label: "Maintenance", value: "Maintenance" },
  { label: "Setup", value: "Setup" },
];

export default function CreateWorkstationPage() {
  const router = useRouter();
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

  const createMutation = useFrappeCreate<
    ApiSuccessResponse<Workstation>,
    WorkstationFormData
  >("Workstation", {
    onSuccess: (response) => {
      toast.success("Workstation created");
      const newWorkstation = response.data;
      if (newWorkstation?.name) {
        router.push(
          `/manufacturing/workstation/${encodeURIComponent(newWorkstation.name)}`,
        );
      } else {
        router.push("/manufacturing/workstation");
      }
    },
    onError: (err) => toast.error(err.message),
    showToast: false,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Workstation"
        subtitle="Define a physical machine or operation center"
        backHref="/manufacturing/workstation"
      />

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((data) => createMutation.mutate(data))}
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
              disabled={createMutation.isPending}
              className="rounded-full min-w-[140px] shadow-lg shadow-primary/20"
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Create Machine
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
