"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { PageHeader } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import {
  FormInput,
  FormFrappeSelect,
  FormSelect,
  FormDatePicker,
} from "@/components/form";
import { useFrappeCreate } from "@/hooks/generic";
import { EmployeeCreateSchema } from "@/lib/schemas/doctype-schemas";
import type { Employee, EmployeeCreateRequest } from "@/types/doctype-types";

type FormData = z.infer<typeof EmployeeCreateSchema>;

export default function NewEmployeePage() {
  const router = useRouter();
  const createMutation = useFrappeCreate<Employee, FormData>("Employee", {
    onSuccess: () => router.push("/hr/employee"),
  });

  const form = useForm<FormData>({
    resolver: zodResolver(EmployeeCreateSchema) as any,
    defaultValues: {
      status: "Active",
      gender: "Male",
      company: "",
    } as any,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="New Employee" backHref="/hr/employee" />
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((d) => createMutation.mutate(d as any))}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <InfoCard title="Personal Details" icon="user">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput
                    control={form.control}
                    name="first_name"
                    label="First Name"
                    required
                    placeholder="Enter first name"
                  />
                  <FormInput
                    control={form.control}
                    name="last_name"
                    label="Last Name"
                    placeholder="Enter last name"
                  />
                  <FormSelect
                    control={form.control}
                    name="gender"
                    label="Gender"
                    required
                    options={[
                      { label: "Male", value: "Male" },
                      { label: "Female", value: "Female" },
                      { label: "Other", value: "Other" },
                    ]}
                  />
                  <FormDatePicker
                    control={form.control}
                    name="date_of_birth"
                    label="Date of Birth"
                    required
                  />
                </div>
              </InfoCard>

              <InfoCard title="Employment Details" icon="briefcase">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormFrappeSelect
                    control={form.control}
                    name="company"
                    label="Company"
                    required
                    doctype="Company"
                    labelField="company_name"
                  />
                  <FormDatePicker
                    control={form.control}
                    name="date_of_joining"
                    label="Date of Joining"
                    required
                  />
                  <FormFrappeSelect
                    control={form.control}
                    name="department"
                    label="Department"
                    doctype="Department"
                    labelField="department_name"
                  />
                  <FormFrappeSelect
                    control={form.control}
                    name="designation"
                    label="Designation"
                    doctype="Designation"
                    labelField="designation_name"
                  />
                </div>
              </InfoCard>
            </div>

            <div className="space-y-6">
              <InfoCard title="Status & Actions" variant="gradient">
                <div className="space-y-4">
                  <FormSelect
                    control={form.control}
                    name="status"
                    label="Employment Status"
                    required
                    options={[
                      { label: "Active", value: "Active" },
                      { label: "Inactive", value: "Inactive" },
                      { label: "Suspended", value: "Suspended" },
                      { label: "Left", value: "Left" },
                    ]}
                  />
                  <Button
                    type="submit"
                    className="w-full rounded-xl"
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? "Saving..." : "Create Employee"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-xl"
                    onClick={() => router.back()}
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
