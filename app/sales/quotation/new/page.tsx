// app/sales/quotation/new/page.tsx
// Pana ERP v3.0 - Create Quotation Page (Job Shop Core)
// @ts-nocheck - React Hook Form + Zod type inference limitations

"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
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
} from "lucide-react";
import { useFrappeCreate, useFrappeList } from "@/hooks/generic";
import { PageHeader } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import {
  FormInput,
  FormSelect,
  FormFrappeSelect,
  FormDatePicker,
} from "@/components/form";
import { QuotationCreateSchema } from "@/lib/schemas/doctype-schemas";
import type { Quotation } from "@/types/doctype-types";
import { cn } from "@/lib/utils";
import { Building2 } from "lucide-react";

/**
 * v3.0 Design Pattern:
 * - Schema-First: Uses auto-generated QuotationCreateSchema
 * - Premium UI: InfoCards, Glassmorphism inputs, Responsive grid
 * - Data Integrity: Context-aware filtering for Address/Contact
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

  const { control, handleSubmit, watch, formState } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const watchedItems = watch("items");
  const selectedPartyType = watch("quotation_to");
  const selectedPartyName = watch("party_name");

  const { data: taxTemplates } = useFrappeList<any>(
    "Sales Taxes and Charges Template",
    { limit: 20 }
  );
  const { data: terms } = useFrappeList<any>("Terms and Conditions", {
    filters: [
      ["selling", "=", 1],
      ["disabled", "=", 0],
    ],
    limit: 20,
  });

  // --- Calculations ---
  const subtotal = useMemo(() => {
    return (watchedItems || []).reduce(
      (acc, item) => acc + (Number(item.qty) || 0) * (Number(item.rate) || 0),
      0
    );
  }, [watchedItems]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ET", {
      style: "currency",
      currency: "ETB",
    }).format(amount || 0);
  };

  // --- Submission ---
  const createMutation = useFrappeCreate<{ data: Quotation }, any>(
    "Quotation",
    {
      onSuccess: (data) =>
        router.push(`/sales/quotation/${encodeURIComponent(data.data.name)}`),
    }
  );

  const onSubmit = async (values: any) => {
    const payload = {
      ...values,
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

          <InfoCard
            title="Logistics & Point of Contact"
            icon={<MapPin className="h-4 w-4" />}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormFrappeSelect
                control={control}
                name="customer_address"
                label="Address"
                doctype="Address"
                disabled={!selectedPartyName}
                filters={[
                  ["Dynamic Link", "link_doctype", "=", selectedPartyType],
                  ["Dynamic Link", "link_name", "=", selectedPartyName],
                ]}
                labelField="address_title"
                placeholder={
                  selectedPartyName
                    ? "Select address..."
                    : "Select customer first"
                }
              />
              <FormFrappeSelect
                control={control}
                name="contact_person"
                label="Contact Person"
                doctype="Contact"
                disabled={!selectedPartyName}
                filters={[
                  ["Dynamic Link", "link_doctype", "=", selectedPartyType],
                  ["Dynamic Link", "link_name", "=", selectedPartyName],
                ]}
                labelField="full_name"
                placeholder={
                  selectedPartyName
                    ? "Select contact..."
                    : "Select customer first"
                }
              />
            </div>
          </InfoCard>

          {/* Section 3: Items Table (v3 Premium Styles) */}
          <InfoCard
            title="Quotation Items & Technical Specs"
            icon={<Calculator className="h-4 w-4" />}
          >
            <div className="rounded-[2rem] border border-border bg-card/50 backdrop-blur-sm overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-secondary/20 border-b border-border">
                    <tr>
                      <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px] w-1/3">
                        Item Service
                      </th>
                      <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px] w-1/3">
                        Technical Specs (GSM, Color, Size)
                      </th>
                      <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px] w-1/6 text-right">
                        Qty
                      </th>
                      <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px] w-1/6 text-right">
                        Rate (ETB)
                      </th>
                      <th className="px-6 py-4 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {fields.map((field, index) => (
                      <tr
                        key={field.id}
                        className="group hover:bg-secondary/10 transition-colors"
                      >
                        <td className="p-4 align-top">
                          <FormFrappeSelect
                            control={control}
                            name={`items.${index}.item_code`}
                            doctype="Item"
                            placeholder="Search service..."
                            hideLabel
                            className="h-11 rounded-xl bg-secondary/30 border-0"
                          />
                        </td>
                        <td className="p-4 align-top">
                          <FormField
                            control={control}
                            name={`items.${index}.description`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Textarea
                                    {...field}
                                    className="min-h-[80px] rounded-xl bg-secondary/30 border-0 text-sm resize-none focus:bg-card transition-all"
                                    placeholder="Paper type, laminate, folding..."
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </td>
                        <td className="p-4 align-top">
                          <FormField
                            control={control}
                            name={`items.${index}.qty`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="number"
                                    className="h-11 rounded-xl bg-secondary/30 border-0 text-right font-medium"
                                    onChange={(e) =>
                                      field.onChange(Number(e.target.value))
                                    }
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </td>
                        <td className="p-4 align-top">
                          <FormField
                            control={control}
                            name={`items.${index}.rate`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="number"
                                    className="h-11 rounded-xl bg-secondary/30 border-0 text-right font-medium"
                                    onChange={(e) =>
                                      field.onChange(Number(e.target.value))
                                    }
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </td>
                        <td className="p-4 align-top text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-11 w-11 rounded-xl text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                            onClick={() => remove(index)}
                            disabled={fields.length === 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
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
                  <Plus className="h-4 w-4 mr-2" /> Add Quotation Line
                </Button>

                <div className="flex gap-8 items-center pr-12">
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">
                      Subtotal
                    </p>
                    <p className="text-xl font-bold tracking-tight text-primary">
                      {formatCurrency(subtotal)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </InfoCard>

          {/* Section 4: Settings & Finalization */}
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
                      label: t.title,
                    })) || []
                  }
                  placeholder="Select VAT/Tax Template..."
                />
                <div className="bg-secondary/20 p-4 rounded-2xl space-y-2 border border-border/50">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Calculated Subtotal
                    </span>
                    <span className="font-semibold">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground bg-primary/5 px-2 py-1 rounded-md text-center">
                    Taxes and Grand Total will be precisely calculated by the
                    backend on save.
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
                    terms?.map((t) => ({ value: t.name, label: t.title })) || []
                  }
                  placeholder="Select Terms..."
                />
                <div className="bg-primary/5 p-4 rounded-2xl min-h-[80px] text-xs text-muted-foreground flex items-center justify-center border border-primary/10 italic">
                  Selected terms will be appended to the generated quotation
                  PDF.
                </div>
              </div>
            </InfoCard>
          </div>

          {/* Action Bar */}
          <div className="flex justify-end gap-3 sticky bottom-6 z-10">
            <Button
              type="button"
              variant="outline"
              className="rounded-full px-8 bg-card"
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
