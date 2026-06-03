// app/crm/settings/territory/new/page.tsx
// Obsidian ERP v4.0 - Create Territory Page
// @ts-nocheck

"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Loader2 } from "lucide-react";

// v3.0 Imports
import { useFrappeCreate } from "@/hooks/generic";
import { PageHeader } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import { FormInput, FormFrappeSelect, FormSwitch } from "@/components/form";
import type { Territory } from "@/types/doctype-types";

// Form Schema
const territoryFormSchema = z.object({
  territory_name: z.string().min(1, "Territory name is required"),
  parent_territory: z.string().optional(),
  is_group: z.boolean().optional(),
});

type TerritoryFormData = z.infer<typeof territoryFormSchema>;

export default function CreateTerritoryPage() {
  const router = useRouter();

  const createMutation = useFrappeCreate<
    { data: Territory },
    Partial<Territory>
  >("Territory", {
    onSuccess: () => router.push("/crm/settings/territory"),
    successMessage: "Territory created successfully",
  });

  const form = useForm<TerritoryFormData>({
    resolver: zodResolver(territoryFormSchema),
    defaultValues: {
      territory_name: "",
      parent_territory: "All Territories",
      is_group: false,
    },
  });

  const onSubmit = async (data: TerritoryFormData) => {
    const submitData: Partial<Territory> = {
      territory_name: data.territory_name,
      parent_territory: data.parent_territory || undefined,
      is_group: data.is_group ? 1 : 0,
    };
    await createMutation.mutateAsync(submitData);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Territory"
        subtitle="Create a new geographical territory"
        backHref="/crm/settings/territory"
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <InfoCard title="Territory Information" icon="map">
                <div className="grid grid-cols-1 gap-4">
                  <FormInput
                    control={form.control}
                    name="territory_name"
                    label="Territory Name"
                    required
                    placeholder="e.g., Addis Ababa, Bole, Regional..."
                  />
                  <FormFrappeSelect
                    control={form.control}
                    name="parent_territory"
                    label="Parent Territory"
                    doctype="Territory"
                    labelField="territory_name"
                  />
                  <FormSwitch
                    control={form.control}
                    name="is_group"
                    label="Is Region/Parent"
                    description="Enable if this territory will contain sub-territories"
                  />
                </div>
              </InfoCard>
            </div>

            <div className="space-y-6">
              <InfoCard title="Actions" variant="gradient">
                <div className="space-y-3">
                  <Button
                    type="submit"
                    className="w-full rounded-xl"
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Territory"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-xl"
                    onClick={() => router.push("/crm/settings/territory")}
                  >
                    Cancel
                  </Button>
                </div>
              </InfoCard>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
