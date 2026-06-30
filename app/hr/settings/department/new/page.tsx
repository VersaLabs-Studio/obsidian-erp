"use client";

// app/hr/settings/department/new/page.tsx
// New Department — simple form with react-hook-form + Zod.

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { PageHeader } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import { FormInput, FormFrappeSelect, FormSelect } from "@/components/form";
import { useFrappeCreate } from "@/hooks/generic";
import { DepartmentCreateSchema } from "@/lib/schemas/doctype-schemas";
import { getActiveCompany } from "@/lib/settings/company";
import type { Department } from "@/types/doctype-types";
import type { z } from "zod";

type FormData = z.infer<typeof DepartmentCreateSchema>;

export default function NewDepartmentPage() {
  const router = useRouter();
  const createMutation = useFrappeCreate<Department, FormData>("Department", {
    onSuccess: () => router.push("/hr/settings/department"),
  });

  const form = useForm<FormData>({
    resolver: zodResolver(DepartmentCreateSchema),
    defaultValues: {
      department_name: "",
      company: getActiveCompany(),
    },
  });

  const handleSubmit = form.handleSubmit((data) => {
    createMutation.mutate(data);
  });

  return (
    <div className="space-y-6">
      <PageHeader title="New Department" backHref="/hr/settings/department" />
      <Form {...form}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <InfoCard title="Department Details">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                control={form.control}
                name="department_name"
                label="Department Name"
                required
                placeholder="e.g. Engineering"
              />
              <FormFrappeSelect
                control={form.control}
                name="company"
                label="Company"
                doctype="Company"
                required
              />
              <FormFrappeSelect
                control={form.control}
                name="parent_department"
                label="Parent Department"
                doctype="Department"
                placeholder="Optional parent..."
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
              {createMutation.isPending ? "Creating..." : "Create Department"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
