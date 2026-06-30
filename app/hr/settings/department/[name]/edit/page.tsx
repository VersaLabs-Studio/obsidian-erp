"use client";

// app/hr/settings/department/[name]/edit/page.tsx
// Edit Department — loads existing data, updates via factory hook.

import { useRouter, useParams } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { PageHeader, LoadingState } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import { FormInput, FormFrappeSelect } from "@/components/form";
import { useFrappeDoc, useFrappeUpdate } from "@/hooks/generic";
import { DepartmentUpdateSchema } from "@/lib/schemas/doctype-schemas";
import type { Department } from "@/types/doctype-types";
import type { z } from "zod";

type FormData = z.infer<typeof DepartmentUpdateSchema>;

export default function EditDepartmentPage() {
  const router = useRouter();
  const params = useParams();
  const name = decodeURIComponent(params.name as string);

  const { data: department, isLoading } = useFrappeDoc<Department>("Department", name);

  const updateMutation = useFrappeUpdate<Department, { name: string; data: FormData }>("Department", {
    onSuccess: () => router.push(`/hr/settings/department/${encodeURIComponent(name)}`),
  });

  const form = useForm<FormData>({
    resolver: zodResolver(DepartmentUpdateSchema),
    defaultValues: {
      department_name: "",
      company: "",
    },
  });

  useEffect(() => {
    if (department) {
      form.reset({
        department_name: department.department_name,
        company: department.company,
        parent_department: department.parent_department ?? "",
      });
    }
  }, [department, form]);

  if (isLoading) return <LoadingState type="table" count={4} />;

  const handleSubmit = form.handleSubmit((data) => {
    updateMutation.mutate({ name, data });
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit ${department?.department_name ?? "Department"}`}
        backHref="/hr/settings/department"
      />
      <Form {...form}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <InfoCard title="Department Details">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                control={form.control}
                name="department_name"
                label="Department Name"
                required
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
