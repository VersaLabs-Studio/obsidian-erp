"use client";

import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { PageHeader, LoadingState } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import {
  FormInput,
  FormFrappeSelect,
  FormSelect,
  FormDatePicker,
} from "@/components/form";
import { useFrappeDoc, useFrappeUpdate } from "@/hooks/generic";
import { EmployeeUpdateSchema } from "@/lib/schemas/doctype-schemas";
import type { Employee, EmployeeUpdateRequest } from "@/types/doctype-types";
import { useEffect } from "react";

type FormData = z.infer<typeof EmployeeUpdateSchema>;

export default function EditEmployeePage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(params.name as string);

  const {
    data: emp,
    isLoading,
    error,
  } = useFrappeDoc<Employee>("Employee", name);

  const updateMutation = useFrappeUpdate<Employee, any>("Employee", {
    onSuccess: () => router.push(`/hr/employee/${encodeURIComponent(name)}`),
  });

  const form = useForm<FormData>({
    resolver: zodResolver(EmployeeUpdateSchema) as any,
    defaultValues: {
      first_name: "",
      last_name: "",
      gender: "Male",
      date_of_birth: "",
      company: "",
      date_of_joining: "",
      department: "",
      designation: "",
      status: "Active",
    } as any,
  });

  // Sync form with fetched data
  useEffect(() => {
    if (emp) {
      form.reset({
        first_name: emp.first_name,
        last_name: emp.last_name,
        gender: emp.gender,
        date_of_birth: emp.date_of_birth,
        company: emp.company,
        date_of_joining: emp.date_of_joining,
        department: emp.department,
        designation: emp.designation,
        status: emp.status,
      } as any);
    }
  }, [emp, form]);

  if (isLoading) return <LoadingState type="detail" />;
  if (error || !emp)
    return (
      <div className="p-8 text-center text-destructive">Employee not found</div>
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit: ${emp.employee_name || emp.name}`}
        backHref={`/hr/employee/${encodeURIComponent(name)}`}
      />
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((d) =>
            updateMutation.mutate({
              name,
              data: d as unknown as EmployeeUpdateRequest,
            }),
          )}
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
                  />
                  <FormInput
                    control={form.control}
                    name="last_name"
                    label="Last Name"
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
              <InfoCard title="Update Status" variant="gradient">
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
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending
                      ? "Saving Changes..."
                      : "Save Employee"}
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
