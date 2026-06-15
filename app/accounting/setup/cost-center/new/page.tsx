"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import {
  Plus,
  Loader2,
  Building2,
  FolderTree,
  Target,
  ArrowRightCircle,
  Network,
} from "lucide-react";
import { useFrappeCreate } from "@/hooks/generic";
import { PageHeader, LoadingState } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import { FormFrappeSelect, FormSwitch, FormInput } from "@/components/form";
import { CostCenterCreateSchema } from "@/lib/schemas/doctype-schemas";
import type { CostCenter } from "@/types/doctype-types";
import { toast } from "sonner";

function CreateCostCenterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const parentCC = searchParams.get("parent_cost_center");

  const form = useForm({
    resolver: zodResolver(CostCenterCreateSchema),
    defaultValues: {
      cost_center_name: "",
      cost_center_number: "",
      parent_cost_center: parentCC || "",
      company: "",
      is_group: 0,
      disabled: 0,
    },
  });

  const { control, handleSubmit } = form;

  const createMutation = useFrappeCreate<{ data: CostCenter }, any>(
    "Cost Center",
    {
      onSuccess: (data) => {
        toast.success("Cost Center created successfully");
        router.push("/accounting/setup/cost-center");
      },
    },
  );

  const onSubmit = async (values: any) => {
    await createMutation.mutateAsync(values);
  };

  return (
    <div className="space-y-8 pb-24 max-w-5xl mx-auto">
      <PageHeader
        title="Add Cost Center"
        subtitle="Define a new organizational unit or department"
        backUrl="/accounting/setup/cost-center"
      />

      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <InfoCard
            title="Cost Center Identity"
            icon={<Building2 className="h-4 w-4" />}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <FormInput
                  control={control}
                  name="cost_center_name"
                  label="Name"
                  required
                  placeholder="e.g. Sales Department"
                />
                <FormInput
                  control={control}
                  name="cost_center_number"
                  label="Number / Code (Optional)"
                  placeholder="e.g. 200"
                />
              </div>
              <div className="space-y-6">
                <FormFrappeSelect
                  control={control}
                  name="company"
                  label="Company"
                  required
                  doctype="Company"
                />
                <FormFrappeSelect
                  control={control}
                  name="parent_cost_center"
                  label="Parent Cost Center"
                  doctype="Cost Center"
                  placeholder="Select parent..."
                  filters={[["is_group", "=", 1]]}
                />
              </div>
            </div>
          </InfoCard>

          <InfoCard
            title="Hierarchy Settings"
            icon={<Network className="h-4 w-4" />}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FormSwitch
                control={control}
                name="is_group"
                label="Is Group"
                description="Can this center contain child cost centers?"
              />
              <FormSwitch
                control={control}
                name="disabled"
                label="Disabled"
                description="Deactivate this cost center"
              />
            </div>
          </InfoCard>

          <div className="flex justify-end gap-3 sticky bottom-6 z-10 glass-card p-4 rounded-2xl shadow-xl">
            <Button
              type="button"
              variant="outline"
              className="rounded-full px-10"
              onClick={() => router.push("/accounting/setup/cost-center")}
            >
              Discard
            </Button>
            <Button
              type="submit"
              className="rounded-full px-12 shadow-lg shadow-primary/20 bg-rose-600 hover:bg-rose-700 text-white font-black"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Save Cost Center
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

export default function NewCostCenterPage() {
  return (
    <Suspense fallback={<LoadingState type="detail" />}>
      <CreateCostCenterForm />
    </Suspense>
  );
}
