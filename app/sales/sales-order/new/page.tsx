"use client";

// app/sales/sales-order/new/page.tsx
// Obsidian ERP v4.0 — Sales Order Create (V4 SmartForm Wizard)
// GOLDEN TEMPLATE — every transactional create page copies this pattern.
// Per Architecture V4 Part 2 §2 (SmartForm Wizard) + §3.3 (Create Template).
// Flow engine: FlowWizard (Zod step gating) + AUTO_FILL_REGISTRY (Quotation→Sales Order).
// Premium UI: OKLCH semantic tokens only, glassmorphism, Framer Motion via FlowWizard.

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { toast } from "sonner";
import {
  UserRound,
  Package,
  ClipboardCheck,
  Plus,
  Trash2,
  Lock,
  Boxes,
} from "lucide-react";

import { PageHeader } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import { GuidedErrorDialog, useGuidedError } from "@/components/errors/GuidedErrorDialog";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import { getActiveCompany } from "@/lib/settings/company";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FormInput,
  FormFrappeSelect,
  FormDatePicker,
} from "@/components/form";
import { QuickAddField } from "@/components/quick-add/QuickAddField";
import { ItemRateAutoFill } from "@/lib/flows/item-price-lookup";
import { useItemPriceRate } from "@/lib/flows/item-price-lookup";
import { Form, FormField, FormItem, FormControl } from "@/components/ui/form";
import { FlowWizard } from "@/components/flows/FlowWizard";
import { useFrappeCreate, useFrappeDoc } from "@/hooks/generic";
import { useMakeFrom } from "@/hooks/flows/use-make-from";
import {
  getAutoFillMapping,
  applyAutoFill,
  applyItemAutoFill,
} from "@/lib/flows/flow-auto-fill";
import { validateWizardStep } from "@/lib/flows/flow-validation";
import type { StepValidationResult } from "@/lib/flows/flow-validation";
import type { WizardStep } from "@/types/flow-types";
import type { Quotation } from "@/types/doctype-types";
import { cn } from "@/lib/utils";
import { FieldWrap } from "@/components/form/field-wrap";
import { StockLevelModal } from "@/components/stock/StockLevelModal";

// ---------------------------------------------------------------------------
// Form model — concrete item shape so the field array is fully typed
// (avoids the z.array(z.unknown()) inference pain; the factory route's Zod
// schema remains the authoritative server-side gate).
// ---------------------------------------------------------------------------
interface SOItem {
  item_code: string;
  item_name?: string;
  description?: string;
  qty: number;
  rate: number;
  amount?: number;
  uom?: string;
  warehouse?: string;
}

interface SOForm {
  naming_series: string;
  customer: string;
  customer_name?: string;
  company: string;
  transaction_date: string;
  delivery_date: string;
  order_type: string;
  currency: string;
  selling_price_list: string;
  price_list_currency: string;
  conversion_rate: number;
  plc_conversion_rate: number;
  customer_address?: string;
  contact_person?: string;
  taxes_and_charges?: string;
  tc_name?: string;
  terms?: string;
  po_no?: string;
  po_date?: string;
  payment_terms_template?: string;
  status: string;
  items: SOItem[];
}

const EMPTY_ITEM: SOItem = {
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
    label: "Customer & Dates",
    description: "Confirm the customer and set the delivery timeline",
    schema: null,
    fields: ["customer", "transaction_date", "delivery_date"],
    icon: "UserRound",
  },
  {
    id: "step2",
    label: "Order Items",
    description: "Review and adjust the items on this order",
    schema: null,
    fields: ["items"],
    icon: "Package",
  },
  {
    id: "step3",
    label: "Review & Confirm",
    description: "Review the order before creating it",
    schema: null,
    fields: [],
    icon: "ClipboardCheck",
  },
];

const ETB = new Intl.NumberFormat("en-ET", {
  style: "currency",
  currency: "ETB",
});

export default function NewSalesOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quotationId = searchParams.get("quotation");
  // R5: Customer-360 quick-action passes ?customer=<name>. Prefill + lock
  // the customer field so the resulting SO is for the source customer.
  const customerId = searchParams.get("customer");

  const [step, setStep] = useState(0);
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(
    new Set(),
  );
  const [triedNextSteps, setTriedNextSteps] = useState<Set<number>>(new Set());
  // 2T §3 — StockLevelModal state: opens with the items currently on the form
  const [stockModalOpen, setStockModalOpen] = useState(false);

  const form = useForm<SOForm>({
    defaultValues: {
      naming_series: "SAL-ORD-.YYYY.-",
      customer: customerId ?? "",
      transaction_date: new Date().toISOString().split("T")[0],
      delivery_date: "",
      order_type: "Sales",
      currency: "ETB",
      selling_price_list: "Standard Selling",
      price_list_currency: "ETB",
      conversion_rate: 1,
      plc_conversion_rate: 1,
      payment_terms_template: "",
      status: "Draft",
      items: [{ ...EMPTY_ITEM }],
    },
  });

  const { control, getValues, reset, setValue } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  // R5: when Customer-360 hands us ?customer=<name>, lock the field.
  useEffect(() => {
    if (!customerId) return;
    setAutoFilledFields((prev) => {
      const next = new Set(prev);
      next.add("customer");
      return next;
    });
  }, [customerId]);

  // Watch the entire form reactively — drives validation gate + FlowWizard formData
  const watchedAll = useWatch({ control });
  const watchedItems = watchedAll?.items ?? [];
  const watchedCustomer = watchedAll?.customer ?? "";

  // -- Auto-fill from upstream Quotation via the registry --------------------
  const { data: quotation, isLoading: loadingQuotation } =
    useFrappeDoc<Quotation>("Quotation", quotationId ?? "", {
      enabled: !!quotationId,
    });

  // 2R Part 2 — canonical make-from (Quotation → Sales Order). Takes
  // priority over the hand-mapping registry below; the registry remains
  // as a silent fallback for the route-error case.
  const { draft: soDraft } = useMakeFrom({
    sourceDoctype: "Quotation",
    sourceName: quotationId,
    targetDoctype: "Sales Order",
    enabled: !!quotationId,
  });

  // 2R Part 2 — hydrate from the canonical draft. The mapped doc carries
  // the customer, all item lines with `prevdoc_docname`/`prevdoc_doctype`
  // back-links, and any pricing-rule applied amounts ERPNext's mapper
  // computed (those links are what light up the SO→Quotation rail stage
  // on the new SO's detail page).
  useEffect(() => {
    if (!soDraft) return;
    const d = soDraft.doc as Partial<SOForm> & { items?: SOItem[] };
    reset({
      ...getValues(),
      ...d,
      items: Array.isArray(d.items) && d.items.length > 0 ? d.items : [{ ...EMPTY_ITEM }],
      delivery_date: "",
    });
    const filled = new Set<string>(
      Object.keys(d).filter((k) => k !== "items" && k !== "delivery_date"),
    );
    filled.add("items");
    setAutoFilledFields(filled);
    toast.success(`Loaded from Quotation ${quotationId}`, {
      description: "Set the delivery date to continue.",
    });
  }, [soDraft, quotationId, reset, getValues]);

  useEffect(() => {
    // 2R Part 2 — skip the hand-mapping fallback when the canonical
    // draft already hydrated the form.
    if (soDraft) return;
    if (!quotation) return;
    const mapping = getAutoFillMapping("Quotation", "Sales Order");
    if (!mapping) return;

    const header = applyAutoFill(
      quotation as unknown as Record<string, unknown>,
      mapping,
    );
    const items = applyItemAutoFill(
      (quotation as { items?: Record<string, unknown>[] }).items ?? [],
      mapping,
    ) as unknown as SOItem[];

    reset({
      ...getValues(),
      ...(header as Partial<SOForm>),
      items: items.length ? items : [{ ...EMPTY_ITEM }],
      // Auto-fill never carries the delivery date — the user must set it.
      delivery_date: "",
    });

    const filled = new Set<string>([
      ...mapping.headerMappings
        .filter((m) => m.isReadOnly)
        .map((m) => m.targetField),
      "items",
    ]);
    setAutoFilledFields(filled);

    toast.success(`Loaded from Quotation ${quotationId}`, {
      description: "Set the delivery date to continue.",
    });
  }, [soDraft, quotation, quotationId, reset, getValues]);

  const isAuto = useCallback(
    (field: string) => autoFilledFields.has(field),
    [autoFilledFields],
  );

  // -- Live subtotal ----------------------------------------------------------
  const subtotal = useMemo(
    () =>
      (watchedItems ?? []).reduce(
        (sum, it) => sum + (Number(it?.qty) || 0) * (Number(it?.rate) || 0),
        0,
      ),
    [watchedItems],
  );

  // -- Per-step validation (gates the wizard's Next button) ------------------
  // Drive off watchedAll (reactive) so any field change re-runs validation.
  const validationResults = useMemo<Record<string, StepValidationResult>>(() => {
    const values = { ...getValues(), ...watchedAll, items: watchedAll?.items ?? [] };
    return {
      step1: validateWizardStep("Sales Order", "step1", values),
      step2: validateWizardStep("Sales Order", "step2", values),
      step3: { valid: true, errors: {} },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedAll]);

  // -- Persistence ------------------------------------------------------------
  const { resolution, showError, dismiss } = useGuidedError();

  const createMutation = useFrappeCreate<
    { data: { name: string } },
    Record<string, unknown>
  >("Sales Order", {
    successMessage: "Sales Order created",
    onSuccess: (res) => {
      const name = res?.data?.name;
      if (name) {
        router.push(`/sales/sales-order/${encodeURIComponent(name)}`);
      }
    },
    onError: (err) => {
      const r = resolveFrappeError(err, { doctype: "Sales Order", values: getValues() });
      showError(r);
    },
  });

  const handleSubmit = useCallback(() => {
    const values = getValues();
    const items = (values.items ?? []).filter(
      (it) => it.item_code && Number(it.qty) > 0,
    );
    if (items.length === 0) {
      toast.error("Add at least one valid item before creating the order.");
      setStep(1);
      return;
    }
    createMutation.mutate({
      ...values,
      company: getActiveCompany(),
      // 2T §1A.3 — Send the user-selected payment_terms_template to ERPNext.
      // ERPNext's set_payment_schedule() rebuilds fresh dates from the template
      // against the SO's transaction_date during validate. We NEVER POST a stale
      // payment_schedule — just the template reference.
      payment_terms_template: values.payment_terms_template || "",
      items: items.map((it) => ({
        ...it,
        amount: (Number(it.qty) || 0) * (Number(it.rate) || 0),
      })),
      conversion_rate: 1,
      plc_conversion_rate: 1,
      currency: "ETB",
      price_list_currency: "ETB",
    });
  }, [createMutation, getValues]);

  return (
    // 2R Part 9 — RequirePermission wrapper removed. The cosmetic gate
    // is fully advisory/inert for v4; the server enforces. (A
    // permission rejection on submit now renders the calm PERMISSION
    // guided message via resolveFrappeError → GuidedErrorDialog.)
    <div className="space-y-6 pb-12">
      <PageHeader
        title="New Sales Order"
        subtitle={
          quotationId
            ? `From Quotation ${quotationId}`
            : customerId
              ? `From Customer ${customerId}`
              : "Create a sales order in three steps"
        }
        backHref="/sales/sales-order"
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
            submitLabel="Create Sales Order"
            submittingLabel="Creating..."
            renderStep={(s) => {
              // ---- STEP 1 — Customer & Dates ----------------------------
              if (s.id === "step1") {
                return (
                  <div className="space-y-6">
                    <StepHeading
                      icon={<UserRound className="h-5 w-5 text-primary" />}
                      title="Customer & Dates"
                      description="Confirm who this order is for and when it's due."
                    />
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <FieldWrap
                        auto={isAuto("customer")}
                        loading={loadingQuotation}
                        error={triedNextSteps.has(step) ? validationResults?.step1?.errors?.customer : undefined}
                      >
                        {/* 2L 1A: Quick-Add enabled master field — Customer */}
                        <QuickAddField
                          control={control}
                          name="customer"
                          label="Customer"
                          required
                          doctype="Customer"
                          labelField="customer_name"
                          placeholder="Search customer..."
                          disabled={isAuto("customer")}
                        />
                      </FieldWrap>
                      <FormDatePicker
                        control={control}
                        name="transaction_date"
                        label="Order Date"
                        required
                      />
                      <FormDatePicker
                        control={control}
                        name="delivery_date"
                        label="Delivery Date"
                        required
                      />
                      <FormFrappeSelect
                        control={control}
                        name="customer_address"
                        label="Shipping Address"
                        doctype="Address"
                        labelField="address_title"
                        disabled={!watchedCustomer}
                        // R6: filter on the Dynamic Link child table
                        // (`link_doctype` + `link_name`).
                        filters={
                          watchedCustomer
                            ? ([
                                ["Dynamic Link", "link_doctype", "=", "Customer"],
                                ["Dynamic Link", "link_name", "=", watchedCustomer],
                              ] as unknown as [string, string, unknown][])
                            : []
                        }
                        placeholder={
                          watchedCustomer
                            ? "Select address..."
                            : "Select a customer first"
                        }
                      />
                      <FormInput
                        control={control}
                        name="po_no"
                        label="Customer PO No"
                        placeholder="Optional reference"
                      />
                      {/* 2T §1A.3 — Payment Terms Template selector.
                          Lets the user set installment-based payment schedules.
                          ERPNext applies the template's payment_schedule entries
                          to auto-populate due dates and amounts against the doc date. */}
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

              // ---- STEP 2 — Items ---------------------------------------
              if (s.id === "step2") {
                return (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <StepHeading
                        icon={<Package className="h-5 w-5 text-primary" />}
                        title="Order Items"
                        description="Adjust quantities and rates as needed."
                      />
                      {isAuto("items") && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          <Lock className="h-3 w-3" />
                          Auto-filled
                        </span>
                      )}
                    </div>

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
                                  {/* 2L 1A: Quick-Add enabled per-row Item */}
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
                                      "description",
                                    ]}
                                    onValueChange={(_val, doc) => {
                                      if (doc) {
                                        // Set uom/item_name immediately (always).
                                        setValue(
                                          `items.${index}.uom`,
                                          doc.stock_uom || "Nos",
                                        );
                                        setValue(
                                          `items.${index}.item_name`,
                                          doc.item_name || "",
                                        );
                                        // 2L Part 2: rate is now set by the
                                        // ItemRateAutoFill below via the
                                        // Item Price lookup (more specific
                                        // than standard_rate). Don't set
                                        // from standard_rate here — let the
                                        // auto-fill run; if no Item Price
                                        // exists, the user types manually.
                                      }
                                    }}
                                  />
                                  {/* 2L Part 2: Auto-rate via Item Price lookup.
                                      Headless component — watches item_code,
                                      looks up Item Price, writes the rate. */}
                                  <ItemRateAutoFill<SOForm>
                                    itemCodePath={`items.${index}.item_code`}
                                    ratePath={`items.${index}.rate`}
                                    priceList={watchedAll?.selling_price_list || ""}
                                    currency={watchedAll?.currency || "ETB"}
                                    side="selling"
                                    setValue={setValue as any}
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
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-full border-dashed"
                            onClick={() => append({ ...EMPTY_ITEM })}
                          >
                            <Plus className="mr-1.5 h-4 w-4" /> Add Item
                          </Button>
                          {/* 2T §3 — Stock check: opens the StockLevelModal
                              with the current form items so the user can
                              see per-warehouse stock while building the order. */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="rounded-full text-muted-foreground"
                            onClick={() => setStockModalOpen(true)}
                          >
                            <Boxes className="mr-1.5 h-4 w-4" /> Check Stock
                          </Button>
                        </div>
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

              // ---- STEP 3 — Review & Confirm --------------------------------
              const v = getValues();
              return (
                <div className="space-y-6">
                  <StepHeading
                    icon={<ClipboardCheck className="h-5 w-5 text-primary" />}
                    title="Review & Confirm"
                    description="Review everything below, then create — you can still go back to edit."
                  />

                  {/* Header fields */}
                  <div className="bg-card/40 rounded-2xl p-6 space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <Summary label="Customer" value={v.customer_name || v.customer} />
                      <Summary label="Company" value={v.company} />
                      <Summary label="Order Date" value={v.transaction_date} />
                      <Summary label="Delivery Date" value={v.delivery_date} />
                      <Summary label="Order Type" value={v.order_type} />
                      <Summary label="Currency" value={v.currency} />
                      <Summary label="Price List" value={v.selling_price_list} />
                      <Summary label="Customer Address" value={v.customer_address} />
                      <Summary label="Customer PO No" value={v.po_no} />
                    </div>
                  </div>

                  {/* Items table */}
                  <div className="bg-card/40 rounded-2xl overflow-hidden">
                    <div className="px-6 py-3 bg-muted/30">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Items ({(watchedItems ?? []).filter(i => i?.item_code).length})
                      </p>
                    </div>
                    <table className="w-full text-sm">
                      <thead className="border-b border-border/40">
                        <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          <th className="px-6 py-2.5 text-left font-semibold">Item</th>
                          <th className="px-6 py-2.5 text-right font-semibold">Qty</th>
                          <th className="px-6 py-2.5 text-right font-semibold">Rate</th>
                          <th className="px-6 py-2.5 text-right font-semibold">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {(watchedItems ?? []).filter(i => i?.item_code).map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-6 py-3 font-medium">{item.item_name || item.item_code}</td>
                            <td className="px-6 py-3 text-right tabular-nums">{item.qty} {item.uom}</td>
                            <td className="px-6 py-3 text-right tabular-nums">{ETB.format(item.rate ?? 0)}</td>
                            <td className="px-6 py-3 text-right font-medium tabular-nums">{ETB.format((item.qty || 0) * (item.rate || 0))}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-muted/20">
                          <td colSpan={3} className="px-6 py-3 text-right font-bold uppercase text-xs">Grand Total</td>
                          <td className="px-6 py-3 text-right font-bold text-lg text-primary tabular-nums">{ETB.format(subtotal)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              );
            }}
          />
        </InfoCard>
      </Form>

      <GuidedErrorDialog resolution={resolution} onDismiss={dismiss} />

      {/* 2T §3 — Stock-level modal: shows per-warehouse stock for items
          currently on the form. Closing it does not disturb the line being
          edited (the modal is display-only; no form state mutations). */}
      <StockLevelModal
        open={stockModalOpen}
        onOpenChange={setStockModalOpen}
        items={(watchedItems ?? [])
          .filter((it): it is SOItem & { item_code: string } => Boolean(it?.item_code))
          .map((it) => ({
            item_code: it.item_code,
            item_name: it.item_name,
          }))}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Local presentational helpers
// ---------------------------------------------------------------------------
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

// Typed numeric cell for the items table (no @ts-nocheck needed).
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
