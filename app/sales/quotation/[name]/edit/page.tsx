// app/sales/quotation/[name]/edit/page.tsx
// Pana ERP v3.0 - Edit Quotation Page
// @ts-nocheck - React Hook Form + Zod type inference limitations

"use client";

import { useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
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
} from "lucide-react";
import { useFrappeDoc, useFrappeUpdate, useFrappeList } from "@/hooks/generic";
import { PageHeader, LoadingState } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import {
  FormInput,
  FormSelect,
  FormFrappeSelect,
  FormDatePicker,
} from "@/components/form";
import { QuotationUpdateSchema } from "@/lib/schemas/doctype-schemas";
import type { Quotation } from "@/types/doctype-types";

export default function EditQuotationPage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(params.name as string);

  // --- Fetch Original Data ---
  const { data: quote, isLoading: isQuoteLoading } = useFrappeDoc<Quotation>(
    "Quotation",
    name
  );

  // --- Form Setup ---
  const form = useForm({
    resolver: zodResolver(QuotationUpdateSchema),
    defaultValues: {
      quotation_to: "Customer",
      items: [{ item_code: "", description: "", qty: 1, rate: 0 }],
    },
  });

  const { control, handleSubmit, watch, setValue, reset } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const watchedItems = watch("items");
  const selectedPartyType = watch("quotation_to");
  const selectedPartyName = watch("party_name");

  // --- Populate Form When Data Loads ---
  useEffect(() => {
    if (quote) {
      // Security check: Only draft can be edited
      if (quote.docstatus !== 0) {
        router.replace(`/sales/quotation/${encodeURIComponent(name)}`);
        return;
      }

      reset({
        naming_series: quote.naming_series,
        quotation_to: quote.quotation_to,
        party_name: quote.party_name,
        transaction_date: quote.transaction_date,
        valid_till: quote.valid_till,
        order_type: quote.order_type,
        company: quote.company,
        currency: quote.currency,
        selling_price_list: quote.selling_price_list,
        price_list_currency: quote.price_list_currency,
        items:
          quote.items?.map((i) => ({
            item_code: i.item_code,
            description: i.description,
            qty: i.qty,
            rate: i.rate,
          })) || [],
        customer_address: quote.customer_address,
        contact_person: quote.contact_person,
        taxes_and_charges: quote.taxes_and_charges,
        tc_name: quote.tc_name,
      });
    }
  }, [quote, reset, router, name]);

  // --- Dynamic Data Fetching (Mirrored from New) ---
  const { data: taxTemplates } = useFrappeList<any>(
    "Sales Taxes and Charges Template"
  );
  const { data: terms } = useFrappeList<any>("Terms and Conditions", {
    filters: [
      ["selling", "=", 1],
      ["disabled", "=", 0],
    ],
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
  const updateMutation = useFrappeUpdate<{ data: Quotation }, any>(
    "Quotation",
    {
      onSuccess: () =>
        router.push(`/sales/quotation/${encodeURIComponent(name)}`),
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
    await updateMutation.mutateAsync({ name, data: payload });
  };

  if (isQuoteLoading) return <LoadingState type="detail" />;

  return (
    <div className="space-y-8 pb-24">
      <PageHeader
        title={`Edit ${quote?.name}`}
        subtitle="Modify quotation details and specifications"
        backHref={`/sales/quotation/${encodeURIComponent(name)}`}
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

          {/* Section 2: Address & Contact */}
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
                        Technical Specs
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

          {/* Section 4: Finalization */}
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
                />
              </div>
            </InfoCard>
          </div>

          <div className="flex justify-end gap-3 sticky bottom-6 z-10">
            <Button
              type="button"
              variant="outline"
              className="rounded-full px-8 bg-card"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-full px-10 shadow-lg shadow-primary/20"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Save Changes
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
