// @ts-nocheck
"use client";

import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Save, Loader2, Truck } from "lucide-react";
import { Form } from "@/components/ui/form";
import { useFrappeDoc, useFrappeUpdate } from "@/hooks/generic";
import { PageHeader, LoadingState } from "@/components/smart";
import { FormInput, FormSelect } from "@/components/form";
import {
  VehicleCreateSchema,
  type VehicleFormData,
} from "@/lib/schemas/doctype-schemas";
import { toast } from "sonner";
import { useEffect } from "react";
import type { Vehicle } from "@/types/doctype-types";

export default function EditVehiclePage() {
  const { name } = useParams();
  const router = useRouter();
  const vehicleName = decodeURIComponent(name as string);

  const { data: vehicle, isLoading } = useFrappeDoc<Vehicle>(
    "Vehicle",
    vehicleName,
  );

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

  useEffect(() => {
    if (vehicle) {
      form.reset({
        license_plate: vehicle.license_plate,
        make: vehicle.make || "",
        model: vehicle.model || "",
        fuel_type: vehicle.fuel_type || "Diesel",
        location: vehicle.location || "",
        acquisition_date: vehicle.acquisition_date,
        insurance_company: vehicle.insurance_company || "",
        policy_no: vehicle.policy_no || "",
      });
    }
  }, [vehicle, form]);

  const updateMutation = useFrappeUpdate("Vehicle", {
    onSuccess: () => {
      toast.success("Vehicle updated");
      router.push(`/stock/setup/vehicle/${encodeURIComponent(vehicleName)}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = (data: VehicleFormData) =>
    updateMutation.mutate({ name: vehicleName, data });

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Vehicle"
        subtitle={`Updating ${vehicle?.license_plate}`}
        backHref={`/stock/setup/vehicle/${encodeURIComponent(vehicleName)}`}
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
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormInput control={form.control} name="make" label="Make" />
              <FormInput control={form.control} name="model" label="Model" />
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
              />
            </div>

            <FormInput
              control={form.control}
              name="acquisition_date"
              label="Acquisition Date"
              type="date"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormInput
                control={form.control}
                name="insurance_company"
                label="Insurance Company"
              />
              <FormInput
                control={form.control}
                name="policy_no"
                label="Policy Number"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={updateMutation.isPending}
            className="rounded-full h-12 px-8"
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </form>
      </Form>
    </div>
  );
}
