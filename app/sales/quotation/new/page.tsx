// app/sales/quotation/new/page.tsx
// Obsidian ERP v4.0 - Create Quotation Page (Job Shop Core)
// @ts-nocheck - React Hook Form + Zod type inference limitations

"use client";

import { useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Trash2,
  Loader2,
  FileText,
  MapPin,
  Calculator,
  Briefcase,
  Building2,
  Package,
} from "lucide-react";
import { useFrappeCreate, useFrappeList, useFrappeDoc } from "@/hooks/generic";
import { PageHeader } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import {
  FormInput,
  FormSelect,
  FormFrappeSelect,
  FormDatePicker,
} from "@/components/form";
import { QuotationCreateSchema } from "@/lib/schemas/doctype-schemas";
import type { Quotation, Customer, Lead } from "@/types/doctype-types";
import { cn } from "@/lib/utils";

/**
 * v3.0 Design Pattern:
 * - Schema-First: Uses auto-generated QuotationCreateSchema
 * - Premium UI: InfoCards, Glassmorphism inputs, Responsive grid
 * - Data Integrity: Context-aware filtering for Address/Contact
 * - Auto-Selection: Fetches default address/contact from Customer/Lead directly
 */

export default function CreateQuotationPage() {
  const router = useRouter();

  // --- Form Setup ---
  const form = useForm({
    resolver: zodResolver(QuotationCreateSchema),
    defaultValues: {
      naming_series: "SAL-QTN-.YYYY.-",
      quotation_to: "Customer",
      party_name: "",
      transaction_date: new Date().toISOString().split("T")[0],
      valid_till: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      order_type: "Sales",
      company: "",
      currency: "ETB",
      selling_price_list: "Standard Selling",
      price_list_currency: "ETB",
      conversion_rate: 1,
      plc_conversion_rate: 1,
      status: "Draft",
      customer_address: "",
      contact_person: "",
      taxes_and_charges: "",
      tc_name: "",
      items: [{ item_code: "", description: "", qty: 1, rate: 0 }],
    },
  });

  const { control, handleSubmit, watch, setValue } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  // Use useWatch for better reactivity on items array
  const watchedItems = useWatch({ control, name: "items" });
  const selectedPartyType = watch("quotation_to");
  const selectedPartyName = watch("party_name");

  // --- Fetch Related Data ---
  const { data: taxTemplates } = useFrappeList<any>(
    "Sales Taxes and Charges Template",
    { limit: 50 }
  );

  const { data: terms } = useFrappeList<any>("Terms and Conditions", {
    filters: [
      ["selling", "=", 1],
      ["disabled", "=", 0],
    ],
    limit: 50,
  });

  // Fetch the selected Customer/Lead to get their default address and contact
  const { data: customerData } = useFrappeDoc<Customer>(
    "Customer",
    selectedPartyName || "",
    { enabled: selectedPartyType === "Customer" && !!selectedPartyName }
  );

  const { data: leadData } = useFrappeDoc<Lead>(
    "Lead",
    selectedPartyName || "",
    { enabled: selectedPartyType === "Lead" && !!selectedPartyName }
  );

  // --- Auto-Selection Effect ---
  // When party changes, auto-select their primary/default address and contact from the party doc
  useEffect(() => {
    if (selectedPartyType === "Customer" && customerData) {
      // Customer has customer_primary_address and customer_primary_contact fields
      if (customerData.customer_primary_address) {
        setValue("customer_address", customerData.customer_primary_address);
      }
      if (customerData.customer_primary_contact) {
        setValue("contact_person", customerData.customer_primary_contact);
      }
    } else if (selectedPartyType === "Lead" && leadData) {
      // Lead doesn't typically have these, so we skip auto-select for leads
      // User can manually select if needed
    }
  }, [selectedPartyType, customerData, leadData, setValue]);

  // Clear address and contact when party NAME changes (not type)
  useEffect(() => {
    // When party name changes, reset the address and contact
    // The auto-select effect above will then populate them if available
    if (!selectedPartyName) {
      setValue("customer_address", "");
      setValue("contact_person", "");
    }
  }, [selectedPartyName, setValue]);

  // --- Real-time Calculations ---
  // Calculate subtotal from items with proper reactivity
  const subtotal = useMemo(() => {
    if (!watchedItems || !Array.isArray(watchedItems)) return 0;
    return watchedItems.reduce((acc, item) => {
      const qty = Number(item?.qty) || 0;
      const rate = Number(item?.rate) || 0;
      return acc + qty * rate;
    }, 0);
  }, [watchedItems]);

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat("en-ET", {
      style: "currency",
      currency: "ETB",
    }).format(amount || 0);
  }, []);

  // --- Submission ---
  const createMutation = useFrappeCreate<{ data: Quotation }, any>(
    "Quotation",
    {
      onSuccess: (data) =>
        router.push(`/sales/quotation/${encodeURIComponent(data.data.name)}`),
    }
  );

  const onSubmit = async (values: any) => {
    // Filter out empty items
    const validItems = (values.items || []).filter(
      (item: any) => item.item_code && item.qty > 0
    );

    if (validItems.length === 0) {
      form.setError("items", {
        type: "manual",
        message: "At least one item is required",
      });
      return;
    }

    const payload = {
      ...values,
      items: validItems,
      currency: "ETB",
      price_list_currency: "ETB",
      conversion_rate: 1,
      plc_conversion_rate: 1,
    };
    await createMutation.mutateAsync(payload);
  };

  return (
    <div className="space-y-8 pb-24">
      <PageHeader
        title="New Quotation"
        subtitle="Create a professional sales quotation for printing & services"
        backHref="/sales/quotation"
      />

      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Section 1: Header */}
          <InfoCard
            title="Primary Details"
            icon={<Briefcase className="h-4 w-4" />}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormFrappeSelect
                control={control}
                name="company"
                label="Company"
                required
                doctype="Company"
                labelField="company_name"
                placeholder="Select company..."
              />
              <FormSelect
                control={control}
                name="quotation_to"
                label="Quotation For"
                required
                options={[
                  { value: "Customer", label: "Customer" },
                  { value: "Lead", label: "Lead" },
                ]}
              />
              <FormFrappeSelect
                control={control}
                name="party_name"
                label={selectedPartyType}
                required
                doctype={selectedPartyType}
                labelField={
                  selectedPartyType === "Customer"
                    ? "customer_name"
                    : "lead_name"
                }
                placeholder={`Search ${selectedPartyType}...`}
              />
              <FormDatePicker
                control={control}
                name="transaction_date"
                label="Date"
                required
              />
              <FormDatePicker
                control={control}
                name="valid_till"
                label="Valid Till"
                required
              />
              <FormSelect
                control={control}
                name="order_type"
                label="Order Type"
                required
                options={[
                  { value: "Sales", label: "Sales" },
                  { value: "Maintenance", label: "Maintenance" },
                ]}
              />
            </div>
          </InfoCard>

          {/* Section 2: Pricing */}
          <InfoCard title="Pricing" icon={<Building2 className="h-4 w-4" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormFrappeSelect
                control={control}
                name="selling_price_list"
                label="Price List"
                required
                doctype="Price List"
                filters={[["selling", "=", 1]]}
                labelField="price_list_name"
                placeholder="Select price list..."
              />
            </div>
          </InfoCard>

          {/* Section 3: Address & Contact */}
          <InfoCard
            title="Logistics & Point of Contact"
            icon={<MapPin className="h-4 w-4" />}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <FormFrappeSelect
                  control={control}
                  name="customer_address"
                  label="Billing Address"
                  doctype="Address"
                  disabled={!selectedPartyName}
                  filters={
                    selectedPartyName
                      ? [
                          [
                            "Dynamic Link",
                            "link_doctype",
                            "=",
                            selectedPartyType,
                          ],
                          ["Dynamic Link", "link_name", "=", selectedPartyName],
                        ]
                      : []
                  }
                  orderBy={{ field: "`tabAddress`.name", order: "asc" }}
                  labelField="address_title"
                  placeholder={
                    selectedPartyName
                      ? "Select address..."
                      : "Select customer first"
                  }
                />
                {selectedPartyType === "Customer" &&
                  customerData?.customer_primary_address && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                      ✓ Auto-selected primary address
                    </p>
                  )}
              </div>
              <div className="space-y-2">
                <FormFrappeSelect
                  control={control}
                  name="contact_person"
                  label="Contact Person"
                  doctype="Contact"
                  disabled={!selectedPartyName}
                  filters={
                    selectedPartyName
                      ? [
                          [
                            "Dynamic Link",
                            "link_doctype",
                            "=",
                            selectedPartyType,
                          ],
                          ["Dynamic Link", "link_name", "=", selectedPartyName],
                        ]
                      : []
                  }
                  orderBy={{ field: "`tabContact`.name", order: "asc" }}
                  labelField="first_name"
                  placeholder={
                    selectedPartyName
                      ? "Select contact..."
                      : "Select customer first"
                  }
                />
                {selectedPartyType === "Customer" &&
                  customerData?.customer_primary_contact && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                      ✓ Auto-selected primary contact
                    </p>
                  )}
              </div>
            </div>
          </InfoCard>

          {/* Section 4: Items Table (v3 Premium Styles) */}
          <InfoCard
            title="Quotation Items & Technical Specs"
            icon={<Package className="h-4 w-4" />}
          >
            <div className="rounded-2xl border border-border bg-card/50 backdrop-blur-sm overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-secondary/20 border-b border-border">
                    <tr>
                      <th className="px-4 py-3 font-bold text-muted-foreground uppercase tracking-widest text-[10px] w-[25%]">
                        Item / Service
                      </th>
                      <th className="px-4 py-3 font-bold text-muted-foreground uppercase tracking-widest text-[10px] w-[35%]">
                        Technical Specs (GSM, Color, Size)
                      </th>
                      <th className="px-4 py-3 font-bold text-muted-foreground uppercase tracking-widest text-[10px] w-[12%] text-right">
                        Qty
                      </th>
                      <th className="px-4 py-3 font-bold text-muted-foreground uppercase tracking-widest text-[10px] w-[15%] text-right">
                        Rate (ETB)
                      </th>
                      <th className="px-4 py-3 font-bold text-muted-foreground uppercase tracking-widest text-[10px] w-[13%] text-right">
                        Amount
                      </th>
                      <th className="px-4 py-3 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {fields.map((field, index) => {
                      const qty = Number(watchedItems?.[index]?.qty) || 0;
                      const rate = Number(watchedItems?.[index]?.rate) || 0;
                      const amount = qty * rate;

                      return (
                        <tr
                          key={field.id}
                          className="group hover:bg-secondary/10 transition-colors"
                        >
                          <td className="p-3 align-top">
                            <FormFrappeSelect
                              control={control}
                              name={`items.${index}.item_code`}
                              doctype="Item"
                              placeholder="Search item..."
                              hideLabel
                              className="h-10 rounded-xl bg-secondary/30 border-0"
                            />
                          </td>
                          <td className="p-3 align-top">
                            <FormField
                              control={control}
                              name={`items.${index}.description`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Textarea
                                      {...field}
                                      className="min-h-[70px] rounded-xl bg-secondary/30 border-0 text-sm resize-none focus:bg-card transition-all"
                                      placeholder="Paper type, size, finish..."
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </td>
                          <td className="p-3 align-top">
                            <FormField
                              control={control}
                              name={`items.${index}.qty`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      type="number"
                                      min="0"
                                      step="1"
                                      className="h-10 rounded-xl bg-secondary/30 border-0 text-right font-medium"
                                      onChange={(e) => {
                                        field.onChange(Number(e.target.value));
                                      }}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </td>
                          <td className="p-3 align-top">
                            <FormField
                              control={control}
                              name={`items.${index}.rate`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      className="h-10 rounded-xl bg-secondary/30 border-0 text-right font-medium"
                                      onChange={(e) => {
                                        field.onChange(Number(e.target.value));
                                      }}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </td>
                          <td className="p-3 align-top">
                            <div className="h-10 px-3 rounded-xl bg-primary/5 flex items-center justify-end font-semibold text-primary">
                              {formatCurrency(amount)}
                            </div>
                          </td>
                          <td className="p-3 align-top text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10 rounded-xl text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                              onClick={() => remove(index)}
                              disabled={fields.length === 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="p-4 bg-secondary/5 border-t border-border flex justify-between items-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full px-4 border-dashed"
                  onClick={() =>
                    append({ item_code: "", description: "", qty: 1, rate: 0 })
                  }
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Line Item
                </Button>

                <div className="flex gap-8 items-center">
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Subtotal
                    </p>
                    <p className="text-2xl font-bold tracking-tight text-primary">
                      {formatCurrency(subtotal)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            {form.formState.errors.items && (
              <p className="text-sm text-destructive mt-2">
                {form.formState.errors.items.message ||
                  "Please add at least one valid item"}
              </p>
            )}
          </InfoCard>

          {/* Section 5: Taxes & Terms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <InfoCard
              title="Taxes & Financials"
              icon={<Calculator className="h-4 w-4" />}
            >
              <div className="space-y-6">
                <FormSelect
                  control={control}
                  name="taxes_and_charges"
                  label="Tax Template"
                  options={
                    taxTemplates?.map((t) => ({
                      value: t.name,
                      label: t.title || t.name,
                    })) || []
                  }
                  placeholder="Select VAT/Tax Template..."
                />
                <div className="bg-secondary/20 p-4 rounded-2xl space-y-3 border border-border/50">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground bg-primary/5 px-3 py-2 rounded-lg text-center">
                    Taxes and Grand Total will be calculated by the system after
                    saving.
                  </div>
                </div>
              </div>
            </InfoCard>

            <InfoCard
              title="Terms & Conditions"
              icon={<FileText className="h-4 w-4" />}
            >
              <div className="space-y-6">
                <FormSelect
                  control={control}
                  name="tc_name"
                  label="Standard Terms"
                  options={
                    terms?.map((t) => ({
                      value: t.name,
                      label: t.title || t.name,
                    })) || []
                  }
                  placeholder="Select Terms..."
                />
                <div className="bg-primary/5 p-4 rounded-2xl min-h-[80px] text-xs text-muted-foreground flex items-center justify-center border border-primary/10 italic">
                  Selected terms will be appended to the generated quotation.
                </div>
              </div>
            </InfoCard>
          </div>

          {/* Action Bar */}
          <div className="flex justify-end gap-3 sticky bottom-6 z-10">
            <Button
              type="button"
              variant="outline"
              className="rounded-full px-8 bg-card shadow-lg"
              onClick={() => router.push("/sales/quotation")}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-full px-10 shadow-lg shadow-primary/20"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Create Quotation
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
