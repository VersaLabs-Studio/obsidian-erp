// app/crm/address/new/page.tsx
// Obsidian ERP v4.0 - Create Address Page
// @ts-nocheck

"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Loader2, Plus } from "lucide-react";

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
import {
  AddressCreateSchema,
  type AddressFormData,
} from "@/lib/schemas/doctype-schemas";
import type { Address } from "@/types/doctype-types";

const ADDRESS_TYPE_OPTIONS = [
  { value: "Billing", label: "Billing" },
  { value: "Shipping", label: "Shipping" },
  { value: "Office", label: "Office" },
  { value: "Personal", label: "Personal" },
  { value: "Plant", label: "Plant" },
  { value: "Postal", label: "Postal" },
  { value: "Shop", label: "Shop" },
  { value: "Subsidiary", label: "Subsidiary" },
  { value: "Warehouse", label: "Warehouse" },
  { value: "Current", label: "Current" },
  { value: "Permanent", label: "Permanent" },
  { value: "Other", label: "Other" },
];

export default function CreateAddressPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [initialLinkSet, setInitialLinkSet] = useState(false);

  const linkDoctype = searchParams.get("link_doctype");
  const linkName = searchParams.get("link_name");

  // Create mutation
  const createMutation = useFrappeCreate<{ data: Address }, AddressFormData>(
    "Address",
    {
      onSuccess: (data) => {
        // If we have a link, go back to the linked entity
        if (linkDoctype && linkName) {
          router.push(
            `/crm/${linkDoctype.toLowerCase()}/${encodeURIComponent(linkName)}`
          );
        } else {
          router.push(`/crm/address/${encodeURIComponent(data.data.name)}`);
        }
      },
      successMessage: "Address created successfully",
    }
  );

  // Form setup
  const form = useForm<AddressFormData>({
    resolver: zodResolver(AddressCreateSchema),
    defaultValues: {
      address_type: "Billing",
      address_title: "",
      address_line1: "",
      address_line2: "",
      city: "",
      state: "",
      pincode: "",
      country: "",
      county: "",
      email_id: "",
      phone: "",
      fax: "",
      is_primary_address: 0,
      is_shipping_address: 0,
      disabled: 0,
      links: [],
    },
  });

  // Populate link data if passed in URL
  useEffect(() => {
    if (linkDoctype && linkName && !initialLinkSet) {
      form.setValue("links", [
        { link_doctype: linkDoctype, link_name: linkName },
      ]);
      setInitialLinkSet(true);
    }
  }, [linkDoctype, linkName, form, initialLinkSet]);

  // Submit handler
  const onSubmit = async (data: AddressFormData) => {
    await createMutation.mutateAsync(data);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Address"
        subtitle="Add a physical location"
        backHref="/crm/address"
      />

      {createMutation.isPending && <LoadingState type="detail" />}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form - 2 columns */}
            <div className="lg:col-span-2 space-y-6">
              {/* Address Details */}
              <InfoCard title="Address Details" icon="map-pin">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput
                    control={form.control}
                    name="address_title"
                    label="Address Title"
                    required
                    placeholder="e.g. Headquarters, Home"
                    className="md:col-span-2"
                  />
                  <FormInput
                    control={form.control}
                    name="address_line1"
                    label="Address Line 1"
                    required
                    placeholder="Street Address"
                    className="md:col-span-2"
                  />
                  <FormInput
                    control={form.control}
                    name="address_line2"
                    label="Address Line 2"
                    placeholder="Apartment, Suite, Unit, etc."
                    className="md:col-span-2"
                  />
                  <FormInput
                    control={form.control}
                    name="city"
                    label="City"
                    required
                    placeholder="City / Town"
                  />
                  <FormInput
                    control={form.control}
                    name="state"
                    label="State / Province"
                    placeholder="State"
                  />
                  <FormInput
                    control={form.control}
                    name="country"
                    label="Country"
                    required
                    placeholder="Select Country"
                  />
                  <FormInput
                    control={form.control}
                    name="pincode"
                    label="Postal Code"
                    placeholder="ZIP / Postal Code"
                  />
                </div>
              </InfoCard>

              {/* Contact Info */}
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
                    name="fax"
                    label="Fax"
                    placeholder="+1 234 567 891"
                  />
                </div>
              </InfoCard>
            </div>

            {/* Sidebar - 1 column */}
            <div className="space-y-6">
              {/* Classification */}
              <InfoCard title="Classification" variant="gradient">
                <div className="space-y-4">
                  <FormSelect
                    control={form.control}
                    name="address_type"
                    label="Address Type"
                    required
                    options={ADDRESS_TYPE_OPTIONS}
                  />
                  <div className="pt-2 space-y-3">
                    <FormSwitch
                      control={form.control}
                      name="is_primary_address"
                      label="Primary Address"
                      description="Default address for this contact"
                    />
                    <FormSwitch
                      control={form.control}
                      name="is_shipping_address"
                      label="Shipping Address"
                      description="Default shipping address"
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
                      "Create Address"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-xl"
                    onClick={() => router.push("/crm/address")}
                  >
                    Cancel
                  </Button>
                </div>
              </InfoCard>

              {/* Debug Info */}
              {linkDoctype && linkName && (
                <div className="p-3 bg-primary/5 rounded-xl text-xs text-muted-foreground">
                  <p className="font-medium">Linking to:</p>
                  <p>
                    {linkDoctype}: {linkName}
                  </p>
                </div>
              )}
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
