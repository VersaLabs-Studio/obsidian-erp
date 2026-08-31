"use client";

// app/hr/settings/designation/[name]/edit/page.tsx
// Edit Designation — loads existing data, updates via factory hook.

import { useRouter, useParams } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { PageHeader, LoadingState } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import { FormInput } from "@/components/form";
import { useFrappeDoc, useFrappeUpdate } from "@/hooks/generic";
import { DesignationUpdateSchema } from "@/lib/schemas/doctype-schemas";
import type { Designation } from "@/types/doctype-types";
import type { z } from "zod";

type FormData = z.infer<typeof DesignationUpdateSchema>;

export default function EditDesignationPage() {
  const router = useRouter();
  const params = useParams();
  const name = decodeURIComponent(params.name as string);

  const { data: designation, isLoading } = useFrappeDoc<Designation>("Designation", name);

  const updateMutation = useFrappeUpdate<Designation, { name: string; data: FormData }>("Designation", {
    onSuccess: () => router.push(`/hr/settings/designation/${encodeURIComponent(name)}`),
  });

  const form = useForm<FormData>({
    resolver: zodResolver(DesignationUpdateSchema),
    defaultValues: {
      designation_name: "",
      description: "",
    },
  });

  useEffect(() => {
    if (designation) {
      form.reset({
        designation_name: designation.designation_name,
        description: designation.description ?? "",
      });
    }
  }, [designation, form]);

  if (isLoading) return <LoadingState type="table" count={4} />;

  const handleSubmit = form.handleSubmit((data) => {
    updateMutation.mutate({ name, data });
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit ${designation?.designation_name ?? "Designation"}`}
        backHref="/hr/settings/designation"
      />
      <Form {...form}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <InfoCard title="Designation Details">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                control={form.control}
                name="designation_name"
                label="Designation Name"
                required
              />
              <FormInput
                control={form.control}
                name="description"
                label="Description"
                placeholder="Optional description..."
              />
            </div>
          </InfoCard>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-full"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
