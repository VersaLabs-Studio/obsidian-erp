// app/crm/address/[name]/edit/page.tsx
// Obsidian ERP v4.0 - Edit Address Page
// @ts-nocheck

"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { AddressUpdateSchema } from "@/lib/schemas/doctype-schemas";
import type { Address } from "@/types/doctype-types";
import type { z } from "zod";

type AddressUpdateFormData = z.infer<typeof AddressUpdateSchema>;

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

export default function EditAddressPage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(params.name as string);

  // Fetch existing address
  const { data: address, isLoading: isLoadingAddress, error } = useFrappeDoc<Address>("Address", name);

  // Update mutation
  const updateMutation = useFrappeUpdate<{ data: Address }, AddressUpdateFormData>(
    "Address",
    {
      onSuccess: () => {
        router.push(`/crm/address/${encodeURIComponent(name)}`);
      },
      successMessage: "Address updated successfully",
    }
  );

  // Form setup
  const form = useForm<AddressUpdateFormData>({
    resolver: zodResolver(AddressUpdateSchema),
    defaultValues: {
      address_type: "Billing",
      address_title: "",
      address_line1: "",
      address_line2: "",
      city: "",
      state: "",
      country: "",
      pincode: "",
      email_id: "",
      phone: "",
      is_primary_address: 0,
      is_shipping_address: 0,
    },
  });

  // Populate form when data loads
  useEffect(() => {
    if (address) {
      form.reset({
        address_type: address.address_type,
        address_title: address.address_title || "",
        address_line1: address.address_line1 || "",
        address_line2: address.address_line2 || "",
        city: address.city || "",
        state: address.state || "",
        country: address.country || "",
        pincode: address.pincode || "",
        email_id: address.email_id || "",
        phone: address.phone || "",
        is_primary_address: address.is_primary_address || 0,
        is_shipping_address: address.is_shipping_address || 0,
      });
    }
  }, [address, form]);

  // Submit handler
  const onSubmit = async (data: AddressUpdateFormData) => {
    await updateMutation.mutateAsync({ name, data });
  };

  // Loading state
  if (isLoadingAddress) {
    return <LoadingState type="detail" />;
  }

  // Error state
  if (error || !address) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Address not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit: ${address.address_title || "Address"}`}
        subtitle={`ID: ${address.name}`}
        backHref={`/crm/address/${encodeURIComponent(name)}`}
      />

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
                    placeholder="e.g. Headquarters"
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
                    placeholder="Apartment, Suite"
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
                    label="State"
                    placeholder="State"
                  />
                  <FormFrappeSelect
                    control={form.control}
                    name="country"
                    label="Country"
                    required
                    doctype="Country"
                    labelField="country_name"
                  />
                  <FormInput
                    control={form.control}
                    name="pincode"
                    label="Postal Code"
                    placeholder="ZIP"
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
                    onClick={() => router.push(`/crm/address/${encodeURIComponent(name)}`)}
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