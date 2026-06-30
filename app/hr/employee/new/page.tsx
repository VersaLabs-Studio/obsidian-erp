"use client";

// app/hr/employee/new/page.tsx
// New Employee — Form with react-hook-form + Zod. OKLCH semantic tokens only.

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
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
import type { Employee } from "@/types/doctype-types";

const ExtendedEmployeeCreateSchema = EmployeeCreateSchema.extend({
  blood_group: z.string().optional(),
  reports_to: z.string().optional(),
  branch: z.string().optional(),
  cell_number: z.string().optional(),
  personal_email: z.string().optional(),
  company_email: z.string().optional(),
  prefered_contact_email: z
    .enum(["Company Email", "Personal Email", "User ID"])
    .optional(),
});

type FormData = z.infer<typeof ExtendedEmployeeCreateSchema>;

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

export default function NewEmployeePage() {
  const router = useRouter();
  const createMutation = useFrappeCreate<Employee, FormData>("Employee", {
    onSuccess: () => router.push("/hr/employee"),
  });

  const form = useForm<FormData>({
    resolver: zodResolver(ExtendedEmployeeCreateSchema),
    defaultValues: {
      status: "Active",
      gender: "Male",
      company: "",
      first_name: "",
      last_name: "",
      date_of_birth: "",
      date_of_joining: "",
      cell_number: "",
      personal_email: "",
      company_email: "",
      branch: "",
      reports_to: "",
    },
  });

  const handleSubmit = form.handleSubmit((data) => {
    createMutation.mutate(data);
  });

  return (
    <div className="space-y-6">
      <PageHeader title="New Employee" backHref="/hr/employee" />

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
                    placeholder="Enter first name"
                  />
                  <FormInput
                    control={form.control}
                    name="last_name"
                    label="Last Name"
                    placeholder="Enter last name"
                  />
                  <FormInput
                    control={form.control}
                    name="employee_name"
                    label="Full Name"
                    placeholder="Auto-generated or enter full name"
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
            </motion.div>
          </motion.div>
        </form>
      </Form>
    </div>
  );
}
