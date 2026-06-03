// app/crm/contact/[name]/edit/page.tsx
// Obsidian ERP v4.0 - Edit Contact Page
// @ts-nocheck

"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Loader2 } from "lucide-react";

// v3.0 Imports
import { useFrappeDoc, useFrappeUpdate } from "@/hooks/generic";
import { PageHeader, LoadingState } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import {
  FormInput,
  FormSelect,
  FormSwitch,
  FormFrappeSelect,
} from "@/components/form";
import type { Contact } from "@/types/doctype-types";
import type { z } from "zod";

// Form Schema (Inline for Edit Page)
const contactUpdateSchema = z.object({
  first_name: z.string().min(1, "First Name is required"),
  middle_name: z.string().optional(),
  last_name: z.string().optional(),
  salutation: z.string().optional(),
  gender: z.string().optional(),
  email_id: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  mobile_no: z.string().optional(),
  company_name: z.string().optional(),
  designation: z.string().optional(),
  department: z.string().optional(),
  address: z.string().optional(),
  status: z.enum(["Passive", "Open", "Replied"]).optional(),
  is_primary_contact: z.union([z.literal(0), z.literal(1)]).optional(),
});

type ContactUpdateFormData = z.infer<typeof contactUpdateSchema>;

const STATUS_OPTIONS = [
  { value: "Open", label: "Open" },
  { value: "Replied", label: "Replied" },
  { value: "Passive", label: "Passive" },
];

export default function EditContactPage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(params.name as string);

  // Fetch existing contact
  const { data: contact, isLoading: isLoadingContact, error } = useFrappeDoc<Contact>("Contact", name);

  // Update mutation
  const updateMutation = useFrappeUpdate<{ data: Contact }, ContactUpdateFormData>(
    "Contact",
    {
      onSuccess: () => {
        router.push(`/crm/contact/${encodeURIComponent(name)}`);
      },
      successMessage: "Contact updated successfully",
    }
  );

  // Form setup
  const form = useForm<ContactUpdateFormData>({
    resolver: zodResolver(contactUpdateSchema),
    defaultValues: {
      first_name: "",
      middle_name: "",
      last_name: "",
      salutation: "",
      gender: "",
      email_id: "",
      phone: "",
      mobile_no: "",
      company_name: "",
      designation: "",
      department: "",
      address: "",
      status: "Open",
      is_primary_contact: 0,
    },
  });

  // Populate form when data loads
  useEffect(() => {
    if (contact) {
      form.reset({
        first_name: contact.first_name || "",
        middle_name: contact.middle_name || "",
        last_name: contact.last_name || "",
        salutation: contact.salutation || "",
        gender: contact.gender || "",
        email_id: contact.email_id || "",
        phone: contact.phone || "",
        mobile_no: contact.mobile_no || "",
        company_name: contact.company_name || "",
        designation: contact.designation || "",
        department: contact.department || "",
        address: contact.address || "",
        status: contact.status || "Open",
        is_primary_contact: contact.is_primary_contact || 0,
      });
    }
  }, [contact, form]);

  // Submit handler
  const onSubmit = async (data: ContactUpdateFormData) => {
    await updateMutation.mutateAsync({ name, data });
  };

  // Loading state
  if (isLoadingContact) {
    return <LoadingState type="detail" />;
  }

  // Error state
  if (error || !contact) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Contact not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit: ${contact.full_name || "Contact"}`}
        subtitle={`ID: ${contact.name}`}
        backHref={`/crm/contact/${encodeURIComponent(name)}`}
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form - 2 columns */}
            <div className="lg:col-span-2 space-y-6">
              {/* Personal Information */}
              <InfoCard title="Personal Information" icon="user">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormFrappeSelect
                    control={form.control}
                    name="salutation"
                    label="Salutation"
                    doctype="Salutation"
                    labelField="salutation"
                  />
                  <FormFrappeSelect
                    control={form.control}
                    name="gender"
                    label="Gender"
                    doctype="Gender"
                    labelField="gender"
                  />
                  <FormInput
                    control={form.control}
                    name="first_name"
                    label="First Name"
                    required
                    placeholder="First Name"
                  />
                  <FormInput
                    control={form.control}
                    name="middle_name"
                    label="Middle Name"
                    placeholder="Middle Name"
                  />
                  <FormInput
                    control={form.control}
                    name="last_name"
                    label="Last Name"
                    placeholder="Last Name"
                  />
                </div>
              </InfoCard>

              {/* Contact Information */}
              <InfoCard title="Contact Details" icon="contact">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput
                    control={form.control}
                    name="email_id"
                    label="Email"
                    type="email"
                    placeholder="email@example.com"
                  />
                  <FormInput
                    control={form.control}
                    name="phone"
                    label="Phone"
                    placeholder="+1 234 567 890"
                  />
                  <FormInput
                    control={form.control}
                    name="mobile_no"
                    label="Mobile No"
                    placeholder="+1 234 567 891"
                  />
                  <FormFrappeSelect
                    control={form.control}
                    name="address"
                    label="Address"
                    doctype="Address"
                    labelField="address_title"
                  />
                </div>
              </InfoCard>

              {/* Business Information */}
              <InfoCard title="Business Information" icon="briefcase">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput
                    control={form.control}
                    name="company_name"
                    label="Company Name"
                    placeholder="e.g. Acme Corp"
                  />
                  <FormInput
                    control={form.control}
                    name="designation"
                    label="Designation"
                    placeholder="e.g. Sales Manager"
                  />
                  <FormInput
                    control={form.control}
                    name="department"
                    label="Department"
                    placeholder="e.g. Sales"
                  />
                </div>
              </InfoCard>
            </div>

            {/* Sidebar - 1 column */}
            <div className="space-y-6">
              {/* Status */}
              <InfoCard title="Status" variant="gradient">
                <div className="space-y-4">
                  <FormSelect
                    control={form.control}
                    name="status"
                    label="Contact Status"
                    required
                    options={STATUS_OPTIONS}
                  />
                  <div className="pt-2 space-y-3">
                    <FormSwitch
                      control={form.control}
                      name="is_primary_contact"
                      label="Primary Contact"
                      description="Main contact for this entity"
                    />
                  </div>
                </div>
              </InfoCard>

              {/* Actions */}
              <InfoCard title="Actions">
                <div className="space-y-3">
                  <Button
                    type="submit"
                    className="w-full rounded-xl"
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-xl"
                    onClick={() => router.push(`/crm/contact/${encodeURIComponent(name)}`)}
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