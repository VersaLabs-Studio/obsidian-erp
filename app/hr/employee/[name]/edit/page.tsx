"use client";

// app/hr/employee/[name]/edit/page.tsx
// Edit Employee — Form with react-hook-form + Zod. OKLCH semantic tokens only.

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
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
import type { Employee } from "@/types/doctype-types";

type FormData = z.infer<typeof EmployeeUpdateSchema>;

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

export default function EditEmployeePage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(params.name as string);

  const {
    data: emp,
    isLoading,
    error,
  } = useFrappeDoc<Employee>("Employee", name);

  const updateMutation = useFrappeUpdate<Employee, { name: string; data: FormData }>("Employee", {
    onSuccess: () => router.push(`/hr/employee/${encodeURIComponent(name)}`),
  });

  const form = useForm<FormData>({
    resolver: zodResolver(EmployeeUpdateSchema),
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
      cell_number: "",
      personal_email: "",
      company_email: "",
      branch: "",
      reports_to: "",
    },
  });

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
        cell_number: emp.cell_number,
        personal_email: emp.personal_email,
        company_email: emp.company_email,
        branch: emp.branch,
        reports_to: emp.reports_to,
      });
    }
  }, [emp, form]);

  const handleSubmit = form.handleSubmit((data) => {
    updateMutation.mutate({ name, data: data as FormData });
  });

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
        <form onSubmit={handleSubmit} className="space-y-6">
          <motion.div
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            variants={staggerContainer}
            initial="hidden"
            animate="show"
          >
            <motion.div className="lg:col-span-2 space-y-6" variants={fadeIn}>
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
                  <FormInput
                    control={form.control}
                    name="blood_group"
                    label="Blood Group"
                    placeholder="e.g. A+, B+, O+"
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
                  <FormFrappeSelect
                    control={form.control}
                    name="reports_to"
                    label="Reports To"
                    doctype="Employee"
                    labelField="employee_name"
                  />
                  <FormInput
                    control={form.control}
                    name="branch"
                    label="Branch"
                    placeholder="Enter branch"
                  />
                </div>
              </InfoCard>

              <InfoCard title="Contact Information" icon="phone">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput
                    control={form.control}
                    name="cell_number"
                    label="Mobile Number"
                    placeholder="Enter mobile number"
                  />
                  <FormInput
                    control={form.control}
                    name="personal_email"
                    label="Personal Email"
                    placeholder="Enter personal email"
                  />
                  <FormInput
                    control={form.control}
                    name="company_email"
                    label="Company Email"
                    placeholder="Enter company email"
                  />
                  <FormSelect
                    control={form.control}
                    name="prefered_contact_email"
                    label="Preferred Contact Email"
                    options={[
                      { label: "Company Email", value: "Company Email" },
                      { label: "Personal Email", value: "Personal Email" },
                      { label: "User ID", value: "User ID" },
                    ]}
                  />
                </div>
              </InfoCard>
            </motion.div>

            <motion.div className="space-y-6" variants={fadeIn}>
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
            </motion.div>
          </motion.div>
        </form>
      </Form>
    </div>
  );
}
