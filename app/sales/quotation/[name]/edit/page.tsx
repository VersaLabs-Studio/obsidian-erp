// app/sales/quotation/[name]/edit/page.tsx
// Obsidian ERP v4.0 - Edit Quotation Page
// @ts-nocheck - React Hook Form + Zod type inference limitations

"use client";

import { useMemo, useEffect, useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
  AlertTriangle,
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
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function EditQuotationPage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(params.name as string);
  const [isFormReady, setIsFormReady] = useState(false);

  // --- Fetch Original Data ---
  const { data: quote, isLoading: isQuoteLoading } = useFrappeDoc<Quotation>(
    "Quotation",
    name
  );

  // --- Fetch Tax Templates and Terms (needed for dropdown options) ---
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

  // --- Form Setup ---
  const form = useForm({
    resolver: zodResolver(QuotationUpdateSchema),
    defaultValues: {
      naming_series: "",
      quotation_to: "Customer",
      party_name: "",
      transaction_date: "",
      valid_till: "",
      order_type: "Sales",
      company: "",
      currency: "ETB",
      selling_price_list: "",
      price_list_currency: "ETB",
      conversion_rate: 1,
      plc_conversion_rate: 1,
      customer_address: "",
      contact_person: "",
      taxes_and_charges: "",
      tc_name: "",
      items: [{ item_code: "", description: "", qty: 1, rate: 0 }],
    },
  });

  const { control, handleSubmit, watch, setValue, reset } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  // Use useWatch for real-time reactivity
  const watchedItems = useWatch({ control, name: "items" });
  const selectedPartyType = watch("quotation_to");
  const selectedPartyName = watch("party_name");

  // --- Populate Form When Data Loads ---
  useEffect(() => {
    if (quote && !isFormReady) {
      // Security check: Only draft can be edited
      if (quote.docstatus !== 0) {
        toast.error("Only draft quotations can be edited");
        router.replace(`/sales/quotation/${encodeURIComponent(name)}`);
        return;
      }

      // Reset the form with ALL the loaded data including taxes and terms
      reset({
        naming_series: quote.naming_series || "",
        quotation_to: quote.quotation_to || "Customer",
        party_name: quote.party_name || "",
        transaction_date: quote.transaction_date || "",
        valid_till: quote.valid_till || "",
        order_type: quote.order_type || "Sales",
        company: quote.company || "",
        currency: quote.currency || "ETB",
        selling_price_list: quote.selling_price_list || "Standard Selling",
        price_list_currency: quote.price_list_currency || "ETB",
        conversion_rate: quote.conversion_rate || 1,
        plc_conversion_rate: quote.plc_conversion_rate || 1,
        customer_address: quote.customer_address || "",
        contact_person: quote.contact_person || "",
        // CRITICAL: Ensure taxes_and_charges and tc_name are populated
        taxes_and_charges: quote.taxes_and_charges || "",
        tc_name: quote.tc_name || "",
        items:
          quote.items && quote.items.length > 0
            ? quote.items.map((i: any) => ({
                item_code: i.item_code || "",
                description: i.description || "",
                qty: Number(i.qty) || 1,
                rate: Number(i.rate) || 0,
              }))
            : [{ item_code: "", description: "", qty: 1, rate: 0 }],
      });

      setIsFormReady(true);
    }
  }, [quote, reset, router, name, isFormReady]);

  // --- Calculations ---
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
  const updateMutation = useFrappeUpdate<{ data: Quotation }, any>(
    "Quotation",
    {
      onSuccess: () => {
        toast.success("Quotation updated successfully");
        router.push(`/sales/quotation/${encodeURIComponent(name)}`);
      },
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

    await updateMutation.mutateAsync({ name, data: payload });
  };

  // Loading State
  if (isQuoteLoading) return <LoadingState type="detail" />;

  if (!quote) {
    return (
      <div className="p-8 text-center text-destructive">
        Quotation not found
      </div>
    );
  }

  // Check if editable
  if (quote.docstatus !== 0) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-amber-500" />
        <h2 className="text-xl font-bold text-foreground mb-2">
          Cannot Edit This Quotation
        </h2>
        <p className="text-muted-foreground mb-4">
          Only draft quotations can be edited. This quotation has been{" "}
          {quote.docstatus === 1 ? "submitted" : "cancelled"}.
        </p>
        <Button
          onClick={() =>
            router.push(`/sales/quotation/${encodeURIComponent(name)}`)
          }
          className="rounded-full"
        >
          View Quotation
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-24">
      <PageHeader
        title={`Edit ${quote.name}`}
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
                label={selectedPartyType || "Customer"}
                required
                doctype={selectedPartyType || "Customer"}
                labelField={
                  selectedPartyType === "Lead" ? "lead_name" : "customer_name"
                }
                placeholder={`Search ${selectedPartyType || "Customer"}...`}
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
            </div>
          </InfoCard>

          {/* Section 4: Items Table */}
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
                        Technical Specs
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

          {/* Section 5: Taxes & Terms - CRITICAL: Display current values */}
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
                {quote.taxes_and_charges && (
                  <p className="text-xs text-muted-foreground">
                    Current: <strong>{quote.taxes_and_charges}</strong>
                  </p>
                )}
                <div className="bg-secondary/20 p-4 rounded-2xl space-y-3 border border-border/50">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground bg-primary/5 px-3 py-2 rounded-lg text-center">
                    Taxes and Grand Total will be recalculated after saving.
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
                {quote.tc_name && (
                  <p className="text-xs text-muted-foreground">
                    Current: <strong>{quote.tc_name}</strong>
                  </p>
                )}
              </div>
            </InfoCard>
          </div>

          {/* Action Bar */}
          <div className="flex justify-end gap-3 sticky bottom-6 z-10">
            <Button
              type="button"
              variant="outline"
              className="rounded-full px-8 bg-card shadow-lg"
              onClick={() =>
                router.push(`/sales/quotation/${encodeURIComponent(name)}`)
              }
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
