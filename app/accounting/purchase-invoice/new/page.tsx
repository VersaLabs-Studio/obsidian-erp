"use client";

// app/accounting/purchase-invoice/new/page.tsx
// Obsidian ERP v4.0 — Purchase Invoice Create (FlowWizard, 3-step)
// GOLDEN TEMPLATE: FlowWizard + Zod step gating via validateWizardStep.
// Reactive validation gate: useWatch({ control }) → [watchedAll].
// OKLCH semantic tokens only. No @ts-nocheck, no any.

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { toast } from "sonner";
import {
  Truck,
  Package,
  ClipboardCheck,
  Plus,
  Trash2,
} from "lucide-react";

import { PageHeader } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FormInput,
  FormFrappeSelect,
  FormDatePicker,
} from "@/components/form";
import { QuickAddField } from "@/components/quick-add/QuickAddField";
import { Form, FormField, FormItem, FormControl } from "@/components/ui/form";
import { FlowWizard } from "@/components/flows/FlowWizard";
import { useFrappeCreate, useFrappeDoc } from "@/hooks/generic";
import { useMakeFrom } from "@/hooks/flows/use-make-from";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import { GuidedErrorDialog, useGuidedError } from "@/components/errors/GuidedErrorDialog";
import { getActiveCompany } from "@/lib/settings/company";
import { validateWizardStep } from "@/lib/flows/flow-validation";
import type { StepValidationResult } from "@/lib/flows/flow-validation";
import type { WizardStep } from "@/types/flow-types";
import type { PurchaseInvoice } from "@/types/doctype-types";
import { cn } from "@/lib/utils";

interface PIItem {
  item_code: string;
  item_name?: string;
  description?: string;
  qty: number;
  rate: number;
  amount?: number;
  uom?: string;
}

interface PIForm {
  naming_series: string;
  supplier: string;
  supplier_name?: string;
  company: string;
  posting_date: string;
  due_date: string;
  bill_no: string;
  bill_date: string;
  currency: string;
  conversion_rate: number;
  credit_to: string;
  cost_center: string;
  taxes_and_charges: string;
  payment_terms_template: string;
  status: string;
  items: PIItem[];
}

const EMPTY_ITEM: PIItem = {
  item_code: "",
  description: "",
  qty: 1,
  rate: 0,
};

const WIZARD_STEPS: WizardStep[] = [
  {
    id: "step1",
    label: "Supplier & Source",
    description: "Set the supplier and billing details",
    schema: null,
    fields: ["supplier", "posting_date", "bill_no", "bill_date", "credit_to", "payment_terms_template"],
    icon: "Truck",
  },
  {
    id: "step2",
    label: "Items & Taxes",
    description: "Add line items for this bill",
    schema: null,
    fields: ["items"],
    icon: "Package",
  },
  {
    id: "step3",
    label: "Review & Confirm",
    description: "Review the bill before creating it",
    schema: null,
    fields: [],
    icon: "ClipboardCheck",
  },
];

const ETB = new Intl.NumberFormat("en-ET", {
  style: "currency",
  currency: "ETB",
});

export default function NewPurchaseInvoicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const purchaseOrderId = searchParams.get("purchase_order");
  const purchaseReceiptId = searchParams.get("purchase_receipt");

  const [step, setStep] = useState(0);
  const [triedNextSteps, setTriedNextSteps] = useState<Set<number>>(new Set());

  // 2R Part 3 — default credit_to from the active company's
  // default_payable_account so the common path is zero-click. We still
  // render the field as an editable Payable-Account select (scoped to the
  // active company) — operator can override before submit.
  const activeCompany = getActiveCompany();
  const { data: companyDoc } = useFrappeDoc<{ default_payable_account?: string }>(
    "Company",
    activeCompany,
    { enabled: !!activeCompany },
  );
  const defaultPayableAccount = companyDoc?.default_payable_account ?? "";

  const form = useForm<PIForm>({
    defaultValues: {
      naming_series: "ACC-PINV-.YYYY.-",
      supplier: "",
      posting_date: new Date().toISOString().split("T")[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      bill_no: "",
      bill_date: "",
      currency: "ETB",
      conversion_rate: 1,
      credit_to: "",
      cost_center: "",
      taxes_and_charges: "",
      payment_terms_template: "",
      status: "Draft",
      items: [{ ...EMPTY_ITEM }],
    },
  });

  // Once the company doc resolves, hydrate credit_to with the default if
  // the operator hasn't touched it. We only set on first resolution so a
  // manual override is never overwritten.
  useEffect(() => {
    if (!defaultPayableAccount) return;
    const current = form.getValues("credit_to");
    if (!current) {
      form.setValue("credit_to", defaultPayableAccount, { shouldDirty: false });
    }
  }, [defaultPayableAccount, form]);

  // 2R Part 2 — canonical make-from for PO→PI and PR→PI. The server
  // mapper returns a fully-mapped draft (supplier, items with
  // purchase_order/purchase_receipt back-links, taxes, etc.); we
  // hydrate the form from it. PO takes priority over PR (a PR-sourced
  // bill is rare; if both are set, PO wins).
  const { draft: piDraftPO } = useMakeFrom({
    sourceDoctype: "Purchase Order",
    sourceName: purchaseOrderId,
    targetDoctype: "Purchase Invoice",
    enabled: !!purchaseOrderId,
  });
  const { draft: piDraftPR } = useMakeFrom({
    sourceDoctype: "Purchase Receipt",
    sourceName: purchaseReceiptId,
    targetDoctype: "Purchase Invoice",
    enabled: !!purchaseReceiptId,
  });
  const canonicalPiDraft = piDraftPO ?? piDraftPR;
  const canonicalPiSource = purchaseOrderId
    ? `Purchase Order ${purchaseOrderId}`
    : purchaseReceiptId
      ? `Purchase Receipt ${purchaseReceiptId}`
      : null;

  // 2R Part 2 — hydrate from the canonical draft. The mapped doc carries
  // the supplier, all item lines with `purchase_order` /
  // `purchase_order_item` / `purchase_receipt` / `pr_detail` back-links
  // that ERPNext's mapper computes (those links are what propagate the
  // status to the upstream PO/PR on submit).
  useEffect(() => {
    if (!canonicalPiDraft || !canonicalPiSource) return;
    const d = canonicalPiDraft.doc as Partial<PIForm> & { items?: PIItem[] };
    form.reset({
      ...form.getValues(),
      ...d,
      items: Array.isArray(d.items) && d.items.length > 0 ? d.items : [{ ...EMPTY_ITEM }],
    });
    toast.success(`Loaded from ${canonicalPiSource}`, {
      description: "Review items and the credit_to default to continue.",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canonicalPiDraft, canonicalPiSource]);

  const { control, getValues, setValue } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const watchedAll = useWatch({ control });
  const watchedItems = watchedAll?.items ?? [];

  const subtotal = useMemo(
    () =>
      (watchedItems ?? []).reduce(
        (sum, it) => sum + (Number(it?.qty) || 0) * (Number(it?.rate) || 0),
        0,
      ),
    [watchedItems],
  );

  const validationResults = useMemo<Record<string, StepValidationResult>>(
    () => {
      const values = {
        ...getValues(),
        ...watchedAll,
        items: watchedAll?.items ?? [],
      };
      return {
        step1: validateWizardStep("Purchase Invoice", "step1", values),
        step2: validateWizardStep("Purchase Invoice", "step2", values),
        step3: { valid: true, errors: {} },
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [watchedAll],
  );

  const { resolution, showError, dismiss } = useGuidedError();

  const createMutation = useFrappeCreate<
    { data: { name: string } },
    Record<string, unknown>
  >("Purchase Invoice", {
    successMessage: "Purchase Invoice created",
    onSuccess: (res) => {
      const name = res?.data?.name;
      if (name) {
        router.push(
          `/accounting/purchase-invoice/${encodeURIComponent(name)}`,
        );
      }
    },
    onError: (err) => showError(resolveFrappeError(err, { doctype: "Purchase Invoice" })),
  });

  const handleSubmit = useCallback(() => {
    const values = getValues();
    const items = (values.items ?? []).filter(
      (it) => it.item_code && Number(it.qty) > 0,
    );
    if (items.length === 0) {
      toast.error("Add at least one valid item before creating the bill.");
      setStep(1);
      return;
    }
    createMutation.mutate({
      ...values,
      company: getActiveCompany(),
      items: items.map((it) => ({
        ...it,
        amount: (Number(it.qty) || 0) * (Number(it.rate) || 0),
      })),
      conversion_rate: 1,
      currency: "ETB",
    });
  }, [createMutation, getValues]);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="New Purchase Invoice"
        subtitle="Record a vendor bill in three steps"
        backHref="/accounting/purchase-invoice"
      />

      <Form {...form}>
        <InfoCard>
          <FlowWizard
            steps={WIZARD_STEPS}
            formData={watchedAll as unknown as Record<string, unknown>}
            validationResults={validationResults}
            isSubmitting={createMutation.isPending}
            onFormDataChange={() => {}}
            onStepChange={setStep}
            onTriedNextChange={setTriedNextSteps}
            onSubmit={handleSubmit}
            onCancel={() => router.back()}
            submitLabel="Create Purchase Invoice"
            submittingLabel="Creating..."
            renderStep={(s) => {
              // ---- STEP 1 — Supplier & Source ----------------------------
              if (s.id === "step1") {
                return (
                  <div className="space-y-6">
                    <StepHeading
                      icon={<Truck className="h-5 w-5 text-primary" />}
                      title="Supplier & Source"
                      description="Set the supplier and billing details for this invoice."
                    />
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <QuickAddField
                        control={control}
                        name="supplier"
                        label="Supplier"
                        required
                        doctype="Supplier"
                        labelField="supplier_name"
                        placeholder="Search supplier..."
                      />
                      <FormDatePicker
                        control={control}
                        name="posting_date"
                        label="Posting Date"
                        required
                      />
                      <FormDatePicker
                        control={control}
                        name="due_date"
                        label="Due Date"
                      />
                      <FormInput
                        control={control}
                        name="bill_no"
                        label="Supplier Bill No"
                        placeholder="Vendor's invoice number"
                      />
                      <FormDatePicker
                        control={control}
                        name="bill_date"
                        label="Supplier Bill Date"
                      />
                      {/* 2R Part 3 — credit_to was declared in the form model but never
                          rendered (step1.fields omitted it), so submit raised
                          "credit_to — Credit To (Payable Account) is required" with
                          no UI to set it. Now it is a Payable-Account select
                          scoped to the active company, defaulted from
                          Company.default_payable_account. */}
                      <FormFrappeSelect
                        control={control}
                        name="credit_to"
                        label="Credit To (Payable Account)"
                        required
                        doctype="Account"
                        labelField="account_name"
                        placeholder="Select payable account..."
                        filters={[
                          ["account_type", "=", "Payable"],
                          ["company", "=", getActiveCompany()],
                          ["is_group", "=", 0],
                        ]}
                      />
                      {/* 2S Part 4 — Payment Terms Template. Allows setting
                          installment-based payment schedules on the invoice.
                          ERPNext applies the template's payment_schedule entries
                          to auto-populate due dates and amounts. */}
                      <FormFrappeSelect
                        control={control}
                        name="payment_terms_template"
                        label="Payment Terms"
                        doctype="Payment Terms Template"
                        placeholder="Select payment terms..."
                      />
                    </div>
                  </div>
                );
              }

              // ---- STEP 2 — Items & Taxes --------------------------------
              if (s.id === "step2") {
                return (
                  <div className="space-y-5">
                    <StepHeading
                      icon={<Package className="h-5 w-5 text-primary" />}
                      title="Items & Taxes"
                      description="Add the line items for this vendor bill."
                    />

                    <div className="overflow-hidden rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm">
                      <table className="w-full text-sm">
                        <thead className="border-b border-border/60 bg-secondary/20">
                          <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            <th className="px-3 py-2.5 text-left font-semibold">
                              Item
                            </th>
                            <th className="px-3 py-2.5 text-right font-semibold">
                              Qty
                            </th>
                            <th className="px-3 py-2.5 text-right font-semibold">
                              Rate
                            </th>
                            <th className="px-3 py-2.5 text-right font-semibold">
                              Amount
                            </th>
                            <th className="w-10" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {fields.map((field, index) => {
                            const qty =
                              Number(watchedItems?.[index]?.qty) || 0;
                            const rate =
                              Number(watchedItems?.[index]?.rate) || 0;
                            return (
                              <tr key={field.id} className="group">
                                <td className="px-3 py-2 align-top">
                                  <QuickAddField
                                    control={control}
                                    name={`items.${index}.item_code`}
                                    doctype="Item"
                                    hideLabel
                                    placeholder="Item..."
                                    extraFields={[
                                      "standard_rate",
                                      "stock_uom",
                                      "item_name",
                                    ]}
                                    onValueChange={(_val, doc) => {
                                      if (doc) {
                                        setValue(
                                          `items.${index}.rate`,
                                          Number(doc.standard_rate) || 0,
                                        );
                                        setValue(
                                          `items.${index}.uom`,
                                          doc.stock_uom || "Nos",
                                        );
                                        setValue(
                                          `items.${index}.item_name`,
                                          doc.item_name || "",
                                        );
                                      }
                                    }}
                                  />
                                </td>
                                <td className="px-3 py-2 align-top">
                                  <NumberCell
                                    control={control}
                                    name={`items.${index}.qty`}
                                  />
                                </td>
                                <td className="px-3 py-2 align-top">
                                  <NumberCell
                                    control={control}
                                    name={`items.${index}.rate`}
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
                  </div>
                );
              }

              // ---- STEP 3 — Review ----------------------------------------
              const v = getValues();
              return (
                <div className="space-y-5">
                  <StepHeading
                    icon={<ClipboardCheck className="h-5 w-5 text-primary" />}
                    title="Review & Confirm"
                    description="Confirm the details below to create the invoice."
                  />
                  <div className="rounded-xl border border-border/60 bg-card/40 p-5 backdrop-blur-sm">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <Summary
                        label="Supplier"
                        value={v.supplier_name || v.supplier}
                      />
                      <Summary label="Company" value={v.company} />
                      <Summary label="Posting Date" value={v.posting_date} />
                      <Summary label="Due Date" value={v.due_date} />
                      <Summary label="Bill No" value={v.bill_no} />
                      <Summary label="Credit To" value={v.credit_to} />
                    </div>
                    <div className="mt-4 border-t border-border/60 pt-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {(watchedItems ?? []).filter((i) => i?.item_code)
                            .length}{" "}
                          item(s)
                        </span>
                        <div className="text-right">
                          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            Grand Total
                          </span>
                          <p className="text-2xl font-bold tabular-nums text-primary">
                            {ETB.format(subtotal)}
                          </p>
                        </div>
                      </div>
                    </div>
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

function StepHeading({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
        {icon}
      </div>
      <div>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="font-medium text-foreground">{value || "—"}</p>
    </div>
  );
}

function NumberCell({
  control,
  name,
}: {
  control: ReturnType<typeof useForm<PIForm>>["control"];
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
