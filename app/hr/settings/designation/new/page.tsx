"use client";

// app/hr/settings/designation/new/page.tsx
// New Designation — simple form with react-hook-form + Zod.

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { PageHeader } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import { FormInput } from "@/components/form";
import { useFrappeCreate } from "@/hooks/generic";
import { DesignationCreateSchema } from "@/lib/schemas/doctype-schemas";
import type { Designation } from "@/types/doctype-types";
import type { z } from "zod";

type FormData = z.infer<typeof DesignationCreateSchema>;

export default function NewDesignationPage() {
  const router = useRouter();
  const createMutation = useFrappeCreate<Designation, FormData>("Designation", {
    onSuccess: () => router.push("/hr/settings/designation"),
  });

  const form = useForm<FormData>({
    resolver: zodResolver(DesignationCreateSchema),
    defaultValues: {
      designation_name: "",
      description: "",
    },
  });

  const handleSubmit = form.handleSubmit((data) => {
    createMutation.mutate(data);
  });

  return (
    <div className="space-y-6">
      <PageHeader title="New Designation" backHref="/hr/settings/designation" />
      <Form {...form}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <InfoCard title="Designation Details">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                control={form.control}
                name="designation_name"
                label="Designation Name"
                required
                placeholder="e.g. Senior Engineer"
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
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create Designation"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
