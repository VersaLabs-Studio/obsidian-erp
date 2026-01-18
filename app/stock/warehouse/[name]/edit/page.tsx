"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { LoadingState, PageHeader } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import { FormInput, FormFrappeSelect, FormSwitch } from "@/components/form";
import { useFrappeDoc, useFrappeUpdate } from "@/hooks/generic";
import { Warehouse as WarehouseIcon, Info, Settings } from "lucide-react";
import { WarehouseUpdateSchema } from "@/lib/schemas/doctype-schemas";
import type { Warehouse, WarehouseUpdateRequest } from "@/types/doctype-types";

type FormData = z.input<typeof WarehouseUpdateSchema>;

export default function EditWarehousePage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(params.name as string);
  const { data: wh, isLoading } = useFrappeDoc<Warehouse>("Warehouse", name);
  const updateMutation = useFrappeUpdate<
    { data: Warehouse },
    { name: string; data: WarehouseUpdateRequest }
  >("Warehouse", {
    onSuccess: () =>
      router.push(`/stock/warehouse/${encodeURIComponent(name)}`),
  });

  const form = useForm<FormData>({
    resolver: zodResolver(WarehouseUpdateSchema),
  });

  useEffect(() => {
    if (wh) {
      form.reset({
        warehouse_name: wh.warehouse_name,
        parent_warehouse: wh.parent_warehouse,
        is_group: wh.is_group,
        warehouse_type: wh.warehouse_type,
        company: wh.company,
        disabled: wh.disabled,
        city: wh.city,
        state: wh.state,
      });
    }
  }, [wh, form]);

  if (isLoading) return <LoadingState type="detail" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit: ${wh?.warehouse_name}`}
        backHref={`/stock/warehouse/${encodeURIComponent(name)}`}
      />
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((d) =>
            updateMutation.mutate({ name, data: d as WarehouseUpdateRequest }),
          )}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <InfoCard
                title="Basic Information"
                icon={<Info className="h-4 w-4" />}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput
                    control={form.control}
                    name="warehouse_name"
                    label="Warehouse Name"
                    required
                  />
                  <FormFrappeSelect
                    control={form.control}
                    name="parent_warehouse"
                    label="Parent Warehouse"
                    doctype="Warehouse"
                    filters={[
                      ["is_group", "=", 1],
                      ["name", "!=", name],
                    ]}
                  />
                  <FormInput
                    control={form.control}
                    name="warehouse_type"
                    label="Warehouse Type"
                  />
                  <FormFrappeSelect
                    control={form.control}
                    name="company"
                    label="Company"
                    doctype="Company"
                  />
                </div>
                <div className="flex flex-wrap gap-6 pt-4">
                  <FormSwitch
                    control={form.control}
                    name="is_group"
                    label="Is Parent Group"
                  />
                  <FormSwitch
                    control={form.control}
                    name="disabled"
                    label="Disabled"
                  />
                </div>
              </InfoCard>
            </div>
            <div className="space-y-6">
              <InfoCard
                title="Actions"
                icon={<Settings className="h-4 w-4" />}
                variant="gradient"
              >
                <Button
                  type="submit"
                  className="w-full rounded-xl"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </InfoCard>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
