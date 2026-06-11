// app/sales/quotation/[name]/edit/page.tsx
// Obsidian ERP v4.0 — Quotation Edit (FlowWizard, edit mode)

"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { toast } from "sonner";
import {
  UserRound,
  Package,
  ClipboardCheck,
  Plus,
  Trash2,
} from "lucide-react";

import { PageHeader, LoadingState } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  FormInput,
  FormFrappeSelect,
  FormDatePicker,
  FormSelect,
} from "@/components/form";
import { FieldWrap } from "@/components/form/field-wrap";
import { Form, FormField, FormItem, FormControl } from "@/components/ui/form";
import { FlowWizard } from "@/components/flows/FlowWizard";
import { useFrappeDoc, useFrappeUpdate } from "@/hooks/generic";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import { GuidedErrorDialog, useGuidedError } from "@/components/errors/GuidedErrorDialog";
import { getActiveCompany } from "@/lib/settings/company";
import { validateWizardStep } from "@/lib/flows/flow-validation";
import type { StepValidationResult } from "@/lib/flows/flow-validation";
import type { WizardStep } from "@/types/flow-types";
import type { Quotation } from "@/types/doctype-types";
import { cn } from "@/lib/utils";

interface QuotationItem {
  item_code: string;
  item_name?: string;
  description?: string;
  qty: number;
  rate: number;
  amount?: number;
  uom?: string;
}

interface QuotationForm {
  naming_series: string;
  quotation_to: "Customer" | "Lead";
  party_name: string;
  customer_name?: string;
  transaction_date: string;
  valid_till: string;
  order_type: "Sales" | "Maintenance";
  company: string;
  currency: string;
  selling_price_list: string;
  price_list_currency: string;
  conversion_rate: number;
  plc_conversion_rate: number;
  status: string;
  customer_address?: string;
  contact_person?: string;
  taxes_and_charges?: string;
  tc_name?: string;
  items: QuotationItem[];
}

const EMPTY_ITEM: QuotationItem = {
  item_code: "",
  item_name: "",
  description: "",
  qty: 1,
  rate: 0,
  amount: 0,
  uom: "Nos",
};

const WIZARD_STEPS: WizardStep[] = [
  {
    id: "step1",
    label: "Party & Dates",
    description: "Confirm target Customer/Lead and valid timeline",
    schema: null,
    fields: ["quotation_to", "party_name", "transaction_date", "valid_till", "order_type"],
    icon: "UserRound",
  },
  {
    id: "step2",
    label: "Quotation Items",
    description: "Review and adjust pricing for each item",
    schema: null,
    fields: ["items"],
    icon: "Package",
  },
  {
    id: "step3",
    label: "Review & Save",
    description: "Review details, then save changes",
    schema: null,
    fields: [],
    icon: "ClipboardCheck",
  },
];

const ETB = new Intl.NumberFormat("en-ET", {
  style: "currency",
  currency: "ETB",
});

export default function EditQuotationPage() {
  const router = useRouter();
  const params = useParams();
  const name = decodeURIComponent(String(params.name));

  const [step, setStep] = useState(0);
  const [triedNextSteps, setTriedNextSteps] = useState<Set<number>>(new Set());
  const { resolution, showError, dismiss } = useGuidedError();

  const { data: quote, isLoading, error } = useFrappeDoc<Quotation>("Quotation", name);

  const form = useForm<QuotationForm>({
    defaultValues: {
      naming_series: "SAL-QTN-.YYYY.-",
      quotation_to: "Customer",
      party_name: "",
      transaction_date: "",
      valid_till: "",
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
      items: [{ ...EMPTY_ITEM }],
    },
  });

  const { control, getValues, reset, setValue } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const watchedAll = useWatch({ control });
  const watchedItems = watchedAll?.items ?? [];
  const selectedPartyType = watchedAll?.quotation_to ?? "Customer";
  const selectedPartyName = watchedAll?.party_name ?? "";

  // Populate form when data loads
  useEffect(() => {
    if (!quote) return;
    reset({
      naming_series: quote.naming_series || "SAL-QTN-.YYYY.-",
      quotation_to: (quote.quotation_to as "Customer" | "Lead") || "Customer",
      party_name: quote.party_name || "",
      customer_name: quote.customer_name || "",
      transaction_date: quote.transaction_date || "",
      valid_till: quote.valid_till || "",
      order_type: (quote.order_type as "Sales" | "Maintenance") || "Sales",
      company: quote.company || "",
      currency: quote.currency || "ETB",
      selling_price_list: quote.selling_price_list || "Standard Selling",
      price_list_currency: quote.price_list_currency || "ETB",
      conversion_rate: quote.conversion_rate || 1,
      plc_conversion_rate: quote.plc_conversion_rate || 1,
      status: quote.status || "Draft",
      customer_address: quote.customer_address || "",
      contact_person: quote.contact_person || "",
      taxes_and_charges: quote.taxes_and_charges || "",
      tc_name: quote.tc_name || "",
      items: ((quote.items ?? []) as unknown as QuotationItem[]).map((it) => ({
        item_code: it.item_code,
        item_name: it.item_name,
        description: it.description,
        qty: Number(it.qty) || 0,
        rate: Number(it.rate) || 0,
        uom: it.uom || "Nos",
      })),
    });
  }, [quote, reset]);

  // Fetch address & contact when customer changes
  const { data: customerData } = useFrappeDoc<any>(
    "Customer",
    selectedPartyName,
    { enabled: selectedPartyType === "Customer" && !!selectedPartyName }
  );

  useEffect(() => {
    if (selectedPartyType === "Customer" && customerData) {
      if (customerData.customer_primary_address) {
        setValue("customer_address", customerData.customer_primary_address);
      }
      if (customerData.customer_primary_contact) {
        setValue("contact_person", customerData.customer_primary_contact);
      }
    }
  }, [selectedPartyType, customerData, setValue]);

  const subtotal = useMemo(() => {
    return (watchedItems ?? []).reduce(
      (sum, item) => sum + (Number(item?.qty) || 0) * (Number(item?.rate) || 0),
      0
    );
  }, [watchedItems]);

  const validationResults = useMemo<Record<string, StepValidationResult>>(() => {
    const values = {
      ...getValues(),
      ...watchedAll,
      items: watchedAll?.items ?? [],
    };
    return {
      step1: validateWizardStep("Quotation", "step1", values),
      step2: validateWizardStep("Quotation", "step2", values),
      step3: { valid: true, errors: {} },
    };
  }, [watchedAll, getValues]);

  const updateMutation = useFrappeUpdate<{ data: { name: string } }, Record<string, unknown>>(
    "Quotation",
    {
      successMessage: "Quotation updated successfully",
      onSuccess: () => {
        router.push(`/sales/quotation/${encodeURIComponent(name)}`);
      },
      onError: (err) => {
        showError(resolveFrappeError(err, { doctype: "Quotation", values: getValues() }));
      },
    }
  );

  const handleSubmit = useCallback(() => {
    const values = getValues();
    const cleanItems = (values.items ?? []).filter(
      (it) => it.item_code && Number(it.qty) > 0
    );
    if (cleanItems.length === 0) {
      toast.error("Add at least one item before updating the quotation.");
      setStep(1);
      return;
    }

    updateMutation.mutate({
      name,
      data: {
        ...values,
        company: getActiveCompany(),
        items: cleanItems.map((it) => ({
          ...it,
          amount: (Number(it.qty) || 0) * (Number(it.rate) || 0),
        })),
      },
    });
  }, [updateMutation, getValues, name]);

  if (isLoading) return <LoadingState />;
  if (error || !quote) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
        <p className="text-sm text-destructive">
          {error?.message ?? "Quotation not found."}
        </p>
        <Button variant="ghost" className="mt-3" onClick={() => router.push("/sales/quotation")}>
          Back to Quotations
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={`Edit Quotation: ${quote.name}`}
        subtitle="Modify the draft sales quotation"
        backHref={`/sales/quotation/${encodeURIComponent(name)}`}
      />

      <Form {...form}>
        <FlowWizard
          steps={WIZARD_STEPS}
          formData={watchedAll as Record<string, unknown>}
          validationResults={validationResults}
          isSubmitting={updateMutation.isPending}
          onFormDataChange={() => {}}
          onStepChange={setStep}
          onTriedNextChange={setTriedNextSteps}
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
          submitLabel="Save Changes"
          submittingLabel="Saving..."
          renderStep={(s) => {
            if (s.id === "step1") {
              const showErr = triedNextSteps.has(0);
              const stepErrors = validationResults?.step1?.errors ?? {};

              return (
                <div className="space-y-6 animate-slide-up">
                  <InfoCard title="Quotation Parties">
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <FieldWrap error={showErr ? stepErrors.quotation_to : undefined}>
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
                      </FieldWrap>

                      <FieldWrap error={showErr ? stepErrors.party_name : undefined}>
                        <FormFrappeSelect
                          control={control}
                          name="party_name"
                          label={selectedPartyType}
                          required
                          doctype={selectedPartyType}
                          labelField={selectedPartyType === "Customer" ? "customer_name" : "lead_name"}
                          placeholder={`Search ${selectedPartyType}...`}
                        />
                      </FieldWrap>
                    </div>
                  </InfoCard>

                  <InfoCard title="Logistics & Dates">
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                      <FieldWrap error={showErr ? stepErrors.transaction_date : undefined}>
                        <FormDatePicker
                          control={control}
                          name="transaction_date"
                          label="Date"
                          required
                        />
                      </FieldWrap>

                      <FieldWrap error={showErr ? stepErrors.valid_till : undefined}>
                        <FormDatePicker
                          control={control}
                          name="valid_till"
                          label="Valid Till"
                          required
                        />
                      </FieldWrap>

                      <FieldWrap error={showErr ? stepErrors.order_type : undefined}>
                        <FormSelect
                          control={control}
                          name="order_type"
                          label="Order Type"
                          options={[
                            { value: "Sales", label: "Sales" },
                            { value: "Maintenance", label: "Maintenance" },
                          ]}
                        />
                      </FieldWrap>
                    </div>
                  </InfoCard>

                  <InfoCard title="Price List & Logistics">
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
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
                      <FormFrappeSelect
                        control={control}
                        name="customer_address"
                        label="Billing Address"
                        doctype="Address"
                        disabled={!selectedPartyName}
                        // R6: filter on the Dynamic Link child table
                        filters={
                          selectedPartyName
                            ? ([
                                ["Dynamic Link", "link_doctype", "=", "Customer"],
                                ["Dynamic Link", "link_name", "=", selectedPartyName],
                              ] as unknown as [string, string, unknown][])
                            : []
                        }
                        placeholder="Select address..."
                      />
                    </div>
                  </InfoCard>
                </div>
              );
            }

            if (s.id === "step2") {
              const showErr = triedNextSteps.has(1);
              const itemsError = showErr ? validationResults?.step2?.errors?.items : undefined;

              return (
                <div className="space-y-6 animate-slide-up">
                  <InfoCard
                    title="Quotation Items"
                    icon={<Package className="h-5 w-5 text-primary" />}
                  >
                    {itemsError && (
                      <p className="text-xs text-destructive mb-3 font-semibold">
                        {itemsError}
                      </p>
                    )}

                    <div className="overflow-hidden rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm">
                      <table className="w-full text-sm">
                        <thead className="border-b border-border/60 bg-secondary/20">
                          <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            <th className="px-3 py-2.5 text-left font-semibold">Item</th>
                            <th className="px-3 py-2.5 text-right font-semibold">Qty</th>
                            <th className="px-3 py-2.5 text-right font-semibold">Rate</th>
                            <th className="px-3 py-2.5 text-right font-semibold">Amount</th>
                            <th className="w-10" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {fields.map((field, index) => {
                            const qty = Number(watchedItems?.[index]?.qty) || 0;
                            const rate = Number(watchedItems?.[index]?.rate) || 0;

                            return (
                              <tr key={field.id} className="group">
                                <td className="px-3 py-2 align-top">
                                  <FormFrappeSelect
                                    control={control}
                                    name={`items.${index}.item_code`}
                                    doctype="Item"
                                    hideLabel
                                    placeholder="Item..."
                                    extraFields={["standard_rate", "stock_uom", "item_name"]}
                                    onValueChange={(_val, doc) => {
                                      if (doc) {
                                        setValue(`items.${index}.rate`, Number(doc.standard_rate) || 0);
                                        setValue(`items.${index}.uom`, doc.stock_uom || "Nos");
                                        setValue(`items.${index}.item_name`, doc.item_name || "");
                                      }
                                    }}
                                  />
                                </td>
                                <td className="px-3 py-2 align-top">
                                  <FormField
                                    control={control}
                                    name={`items.${index}.qty`}
                                    render={({ field: f }) => (
                                      <FormItem>
                                        <FormControl>
                                          <Input
                                            {...f}
                                            type="number"
                                            className="h-10 rounded-lg border-0 bg-secondary/30 text-right"
                                            onChange={(e) => f.onChange(Number(e.target.value))}
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </td>
                                <td className="px-3 py-2 align-top">
                                  <FormField
                                    control={control}
                                    name={`items.${index}.rate`}
                                    render={({ field: f }) => (
                                      <FormItem>
                                        <FormControl>
                                          <Input
                                            {...f}
                                            type="number"
                                            className="h-10 rounded-lg border-0 bg-secondary/30 text-right"
                                            onChange={(e) => f.onChange(Number(e.target.value))}
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </td>
                                <td className="px-3 py-3 text-right align-middle font-semibold tabular-nums text-foreground">
                                  {ETB.format(qty * rate)}
                                </td>
                                <td className="px-2 py-2 text-center align-middle">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
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
                      <div className="flex items-center justify-between border-t border-border/60 bg-secondary/10 px-3 py-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-full border-dashed"
                          onClick={() => append({ ...EMPTY_ITEM })}
                        >
                          <Plus className="mr-1.5 h-4 w-4" /> Add Item
                        </Button>
                        <div className="text-right">
                          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            Subtotal
                          </p>
                          <p className="text-xl font-bold tabular-nums text-foreground">
                            {ETB.format(subtotal)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </InfoCard>
                </div>
              );
            }

            const v = getValues();
            return (
              <div className="space-y-6 animate-slide-up">
                <InfoCard title="Summary & Confirmation">
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Quotation To</p>
                      <p className="font-semibold text-foreground">{v.quotation_to}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Customer / Lead</p>
                      <p className="font-semibold text-foreground">{v.party_name}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Posting Date</p>
                      <p className="font-semibold text-foreground">{v.transaction_date}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Valid Till</p>
                      <p className="font-semibold text-foreground">{v.valid_till}</p>
                    </div>
                  </div>

                  <div className="border-t border-border/50 pt-4 flex items-center justify-between">
                    <span className="font-bold text-foreground">Estimated Total</span>
                    <span className="text-2xl font-bold text-primary tabular-nums">{ETB.format(subtotal)}</span>
                  </div>
                </InfoCard>
              </div>
            );
          }}
        />
      </Form>

      <GuidedErrorDialog resolution={resolution} onDismiss={dismiss} />
    </div>
  );
}
