// app/crm/contact/new/page.tsx
// Obsidian ERP v4.0 - Create Contact Page
// @ts-nocheck

"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Loader2 } from "lucide-react";

// v3.0 Imports
import { useFrappeCreate } from "@/hooks/generic";
import { PageHeader, LoadingState } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import {
  FormInput,
  FormSelect,
  FormSwitch,
  FormFrappeSelect,
} from "@/components/form";
import type { Contact } from "@/types/doctype-types";

// Form Schema (Inline for New Page)
const contactCreateSchema = z.object({
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
  status: z.enum(["Passive", "Open", "Replied"]).default("Open"),
  is_primary_contact: z.union([z.literal(0), z.literal(1)]).optional(),
  links: z.array(z.object({
    link_doctype: z.string(),
    link_name: z.string(),
  })).optional(),
});

type ContactFormData = z.infer<typeof contactCreateSchema>;

const STATUS_OPTIONS = [
  { value: "Open", label: "Open" },
  { value: "Replied", label: "Replied" },
  { value: "Passive", label: "Passive" },
];

export default function CreateContactPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [initialLinkSet, setInitialLinkSet] = useState(false);

  const linkDoctype = searchParams.get("link_doctype");
  const linkName = searchParams.get("link_name");

  // Create mutation
  const createMutation = useFrappeCreate<{ data: Contact }, ContactFormData>(
    "Contact",
    {
      onSuccess: (data) => {
        // If we have a link, go back to linked entity
        if (linkDoctype && linkName) {
          router.push(`/crm/${linkDoctype.toLowerCase()}/${encodeURIComponent(linkName)}`);
        } else {
          router.push(`/crm/contact/${encodeURIComponent(data.data.name)}`);
        }
      },
      successMessage: "Contact created successfully",
    }
  );

  // Form setup
  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactCreateSchema),
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
      links: [],
    },
  });

  // Populate link data if passed in URL
  useEffect(() => {
    if (linkDoctype && linkName && !initialLinkSet) {
      form.setValue("links", [{ link_doctype: linkDoctype, link_name: linkName }]);
      setInitialLinkSet(true);
    }
  }, [linkDoctype, linkName, form, initialLinkSet]);

  // Submit handler
  const onSubmit = async (data: ContactFormData) => {
    await createMutation.mutateAsync(data);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Contact"
        subtitle="Add a person of contact"
        backHref="/crm/contact"
      />

      {createMutation.isPending && <LoadingState type="detail" />}

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
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Contact"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-xl"
                    onClick={() => router.push("/crm/contact")}
                  >
                    Cancel
                  </Button>
                </div>
              </InfoCard>

              {/* Debug Info */}
              {linkDoctype && linkName && (
                <div className="p-3 bg-primary/5 rounded-xl text-xs text-muted-foreground">
                  <p className="font-medium">Linking to:</p>
                  <p>{linkDoctype}: {linkName}</p>
                </div>
              )}
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}