"use client";

// app/sales/sales-order/[name]/edit/page.tsx
// Obsidian ERP v4.0 — Sales Order Edit (V4 SmartForm Wizard, edit mode)
// Mirrors the create wizard (Part 2 §2) but loads an existing Draft order and
// persists via useFrappeUpdate. Only Draft (docstatus 0) orders are editable.

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import { GuidedErrorDialog, useGuidedError } from "@/components/errors/GuidedErrorDialog";
import { Plus, Trash2 } from "lucide-react";

import { PageHeader, LoadingState } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormInput, FormFrappeSelect, FormDatePicker } from "@/components/form";
import { Form, FormField, FormItem, FormControl } from "@/components/ui/form";
import { FlowWizard } from "@/components/flows/FlowWizard";
import { useFrappeDoc, useFrappeUpdate } from "@/hooks/generic";
import { validateWizardStep } from "@/lib/flows/flow-validation";
import type { StepValidationResult } from "@/lib/flows/flow-validation";
import type { WizardStep } from "@/types/flow-types";
import type { SalesOrder } from "@/types/doctype-types";

interface SOItem {
  item_code: string;
  item_name?: string;
  description?: string;
  qty: number;
  rate: number;
  amount?: number;
  uom?: string;
}

interface SOForm {
  customer: string;
  customer_name?: string;
  company: string;
  transaction_date: string;
  delivery_date: string;
  customer_address?: string;
  po_no?: string;
  items: SOItem[];
}

const EMPTY_ITEM: SOItem = { item_code: "", qty: 1, rate: 0, uom: "Nos" };

const WIZARD_STEPS: WizardStep[] = [
  { id: "step1", label: "Customer & Dates", schema: null, fields: [], icon: "UserRound" },
  { id: "step2", label: "Order Items", schema: null, fields: [], icon: "Package" },
  { id: "step3", label: "Review & Confirm", schema: null, fields: [], icon: "ClipboardCheck" },
];

const ETB = new Intl.NumberFormat("en-ET", { style: "currency", currency: "ETB" });

export default function EditSalesOrderPage() {
  const router = useRouter();
  const params = useParams();
  const name = decodeURIComponent(String(params.name));

  const [, setStep] = useState(0);
  const { resolution, showError, dismiss } = useGuidedError();
  const { data: order, isLoading, error } = useFrappeDoc<SalesOrder>("Sales Order", name);

  const form = useForm<SOForm>({
    defaultValues: {
      customer: "",
      transaction_date: "",
      delivery_date: "",
      items: [{ ...EMPTY_ITEM }],
    },
  });
  const { control, getValues, reset, setValue } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  // Watch the entire form reactively — drives validation gate
  const watchedAll = useWatch({ control });
  const watchedItems = watchedAll?.items ?? [];
  const watchedCustomer = watchedAll?.customer ?? "";

  // Prefill from the loaded order
  useEffect(() => {
    if (!order) return;
    reset({
      customer: order.customer ?? "",
      customer_name: order.customer_name,
      company: order.company ?? "",
      transaction_date: order.transaction_date ?? "",
      delivery_date: order.delivery_date ?? "",
      customer_address: order.customer_address,
      po_no: order.po_no,
      items: ((order.items ?? []) as unknown as SOItem[]).map((it) => ({
        item_code: it.item_code,
        item_name: it.item_name,
        description: it.description,
        qty: Number(it.qty) || 0,
        rate: Number(it.rate) || 0,
        uom: it.uom || "Nos",
      })),
    });
  }, [order, reset]);

  const subtotal = useMemo(
    () =>
      (watchedItems ?? []).reduce(
        (s, it) => s + (Number(it?.qty) || 0) * (Number(it?.rate) || 0),
        0,
      ),
    [watchedItems],
  );

  const validationResults = useMemo<Record<string, StepValidationResult>>(() => {
    const values = { ...getValues(), ...watchedAll, items: watchedAll?.items ?? [] };
    return {
      step1: validateWizardStep("Sales Order", "step1", values),
      step2: validateWizardStep("Sales Order", "step2", values),
      step3: { valid: true, errors: {} },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedAll]);

  const updateMutation = useFrappeUpdate<SalesOrder>("Sales Order", {
    showToast: false,
    successMessage: "Sales Order updated",
    onSuccess: () => router.push(`/sales/sales-order/${encodeURIComponent(name)}`),
    onError: (err) => showError(resolveFrappeError(err, { doctype: "Sales Order" })),
  });

  const handleSubmit = useCallback(() => {
    const values = getValues();
    const items = (values.items ?? []).filter((it) => it.item_code && Number(it.qty) > 0);
    if (items.length === 0) {
      toast.error("Add at least one valid item.");
      setStep(1);
      return;
    }
    updateMutation.mutate({
      name,
      data: {
        customer: values.customer,
        company: values.company,
        transaction_date: values.transaction_date,
        delivery_date: values.delivery_date,
        customer_address: values.customer_address,
        po_no: values.po_no,
        items: items.map((it) => ({
          ...it,
          amount: (Number(it.qty) || 0) * (Number(it.rate) || 0),
        })),
      },
    });
  }, [getValues, name, updateMutation]);

  if (isLoading) return <LoadingState />;
  if (error || !order) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
        <p className="text-sm text-destructive">{error?.message ?? "Order not found."}</p>
      </div>
    );
  }
  if (order.docstatus !== 0) {
    return (
      <div className="space-y-4">
        <PageHeader title={`Edit ${name}`} backHref={`/sales/sales-order/${encodeURIComponent(name)}`} />
        <div className="rounded-xl border border-border/60 bg-muted/30 p-6">
          <p className="text-sm text-muted-foreground">
            Only Draft orders can be edited. This order has been submitted.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={`Edit ${order.name}`}
        subtitle={order.customer_name || order.customer}
        backHref={`/sales/sales-order/${encodeURIComponent(name)}`}
      />
      <Form {...form}>
        <InfoCard>
          <FlowWizard
            steps={WIZARD_STEPS}
            formData={watchedAll as unknown as Record<string, unknown>}
            validationResults={validationResults}
            isSubmitting={updateMutation.isPending}
            onFormDataChange={() => {}}
            onStepChange={setStep}
            onSubmit={handleSubmit}
            onCancel={() => router.back()}
            submitLabel="Save Changes"
            submittingLabel="Saving..."
            renderStep={(s) => {
              if (s.id === "step1") {
                return (
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <FormFrappeSelect control={control} name="customer" label="Customer" required doctype="Customer" labelField="customer_name" />
                    <FormDatePicker control={control} name="transaction_date" label="Order Date" required />
                    <FormDatePicker control={control} name="delivery_date" label="Delivery Date" required />
                    <FormFrappeSelect
                      control={control}
                      name="customer_address"
                      label="Shipping Address"
                      doctype="Address"
                      labelField="address_title"
                      disabled={!watchedCustomer}
                      filters={
                        watchedCustomer
                          ? ([["Dynamic Link", "link_name", "=", watchedCustomer]] as unknown as [string, string, unknown][])
                          : []
                      }
                    />
                    <FormInput control={control} name="po_no" label="Customer PO No" />
                  </div>
                );
              }
              if (s.id === "step2") {
                return (
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
                                  onValueChange={(_v, doc) => {
                                    if (doc) {
                                      setValue(`items.${index}.rate`, Number(doc.standard_rate) || 0);
                                      setValue(`items.${index}.uom`, doc.stock_uom || "Nos");
                                      setValue(`items.${index}.item_name`, doc.item_name || "");
                                    }
                                  }}
                                />
                              </td>
                              <td className="px-3 py-2 align-top">
                                <NumberCell control={control} name={`items.${index}.qty`} />
                              </td>
                              <td className="px-3 py-2 align-top">
                                <NumberCell control={control} name={`items.${index}.rate`} />
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
                      <Button type="button" variant="outline" size="sm" className="rounded-full border-dashed" onClick={() => append({ ...EMPTY_ITEM })}>
                        <Plus className="mr-1.5 h-4 w-4" /> Add Item
                      </Button>
                      <p className="text-xl font-bold tabular-nums text-foreground">{ETB.format(subtotal)}</p>
                    </div>
                  </div>
                );
              }
              const v = getValues();
              return (
                <div className="rounded-xl border border-border/60 bg-card/40 p-5 backdrop-blur-sm">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <Summary label="Customer" value={v.customer_name || v.customer} />
                    <Summary label="Company" value={v.company} />
                    <Summary label="Order Date" value={v.transaction_date} />
                    <Summary label="Delivery Date" value={v.delivery_date} />
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-4">
                    <span className="text-sm text-muted-foreground">
                      {(watchedItems ?? []).filter((i) => i?.item_code).length} item(s)
                    </span>
                    <p className="text-2xl font-bold tabular-nums text-primary">{ETB.format(subtotal)}</p>
                  </div>
                </div>
              );
            }}
          />
        </InfoCard>
      </Form>
      <GuidedErrorDialog resolution={resolution} onDismiss={dismiss} />
    </div>
  );
}

function Summary({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground">{value || "—"}</p>
    </div>
  );
}

function NumberCell({
  control,
  name,
}: {
  control: ReturnType<typeof useForm<SOForm>>["control"];
  name: `items.${number}.qty` | `items.${number}.rate`;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormControl>
            <Input
              {...field}
              type="number"
              inputMode="decimal"
              className="h-10 rounded-lg border-0 bg-secondary/30 text-right tabular-nums"
              onChange={(e) => field.onChange(Number(e.target.value))}
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
}
