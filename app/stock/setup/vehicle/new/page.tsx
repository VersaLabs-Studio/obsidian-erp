// @ts-nocheck
"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Save, Loader2, Truck } from "lucide-react";
import { Form } from "@/components/ui/form";
import { useFrappeCreate } from "@/hooks/generic";
import { PageHeader } from "@/components/smart";
import { FormInput, FormSelect } from "@/components/form";
import {
  VehicleCreateSchema,
  type VehicleFormData,
} from "@/lib/schemas/doctype-schemas";
import { toast } from "sonner";

export default function CreateVehiclePage() {
  const router = useRouter();

  const form = useForm<VehicleFormData>({
    resolver: zodResolver(VehicleCreateSchema),
    defaultValues: {
      license_plate: "",
      make: "",
      model: "",
      fuel_type: "Diesel",
      location: "",
    },
  });

  const createMutation = useFrappeCreate("Vehicle", {
    onSuccess: (response) => {
      toast.success("Vehicle added");
      router.push(
        `/stock/setup/vehicle/${encodeURIComponent(response.data?.name || response.name)}`,
      );
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = (data: VehicleFormData) => createMutation.mutate(data);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Vehicle"
        subtitle="Register a new vehicle for deliveries"
        backHref="/stock/setup/vehicle"
      />

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="max-w-2xl space-y-6"
        >
          <div className="bg-card rounded-2xl border border-border/50 p-8 space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Truck className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-bold text-lg">Vehicle Information</h3>
            </div>

            <FormInput
              control={form.control}
              name="license_plate"
              label="License Plate"
              required
              placeholder="AA-12345"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormInput
                control={form.control}
                name="make"
                label="Make"
                placeholder="Toyota"
              />
              <FormInput
                control={form.control}
                name="model"
                label="Model"
                placeholder="Hilux"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormSelect
                control={form.control}
                name="fuel_type"
                label="Fuel Type"
                options={[
                  { value: "Petrol", label: "Petrol" },
                  { value: "Diesel", label: "Diesel" },
                  { value: "Electric", label: "Electric" },
                  { value: "Natural Gas", label: "Natural Gas" },
                ]}
              />
              <FormInput
                control={form.control}
                name="location"
                label="Current Location"
                placeholder="Main Warehouse"
              />
            </div>

            <FormInput
              control={form.control}
              name="acquisition_date"
              label="Acquisition Date"
              type="date"
            />
          </div>

          <Button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-full h-12 px-8"
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Vehicle
          </Button>
        </form>
      </Form>
    </div>
  );
}
