// @ts-nocheck
"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Save, Loader2, User } from "lucide-react";
import { Form } from "@/components/ui/form";
import { useFrappeCreate } from "@/hooks/generic";
import { PageHeader } from "@/components/smart";
import { FormInput, FormFrappeSelect, FormSelect } from "@/components/form";
import {
  DriverCreateSchema,
  type DriverFormData,
} from "@/lib/schemas/doctype-schemas";
import { toast } from "sonner";

export default function CreateDriverPage() {
  const router = useRouter();

  const form = useForm<DriverFormData>({
    resolver: zodResolver(DriverCreateSchema),
    defaultValues: {
      full_name: "",
      status: "Active",
      license_number: "",
      cell_number: "",
      transporter: "",
    },
  });

  const createMutation = useFrappeCreate("Driver", {
    onSuccess: (response) => {
      toast.success("Driver created");
      router.push(
        `/stock/setup/driver/${encodeURIComponent(response.data?.name || response.name)}`,
      );
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = (data: DriverFormData) => createMutation.mutate(data);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Driver"
        subtitle="Register a new driver for deliveries"
        backHref="/stock/setup/driver"
      />

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="max-w-2xl space-y-6"
        >
          <div className="bg-card rounded-2xl border border-border/50 p-8 space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-bold text-lg">Driver Information</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormInput
                control={form.control}
                name="full_name"
                label="Full Name"
                required
                placeholder="John Doe"
              />
              <FormSelect
                control={form.control}
                name="status"
                label="Status"
                options={[
                  { value: "Active", label: "Active" },
                  { value: "Left", label: "Left" },
                ]}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormInput
                control={form.control}
                name="license_number"
                label="License Number"
                placeholder="DL-12345"
              />
              <FormInput
                control={form.control}
                name="cell_number"
                label="Mobile Number"
                placeholder="+251..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormInput
                control={form.control}
                name="issuing_date"
                label="License Issued"
                type="date"
              />
              <FormInput
                control={form.control}
                name="expiry_date"
                label="License Expiry"
                type="date"
              />
            </div>

            <FormFrappeSelect
              control={form.control}
              name="transporter"
              label="Transporter / Logistics Company"
              doctype="Supplier"
              placeholder="Select transporter..."
              filters={[["is_transporter", "=", 1]]}
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
            Save Driver
          </Button>
        </form>
      </Form>
    </div>
  );
}
