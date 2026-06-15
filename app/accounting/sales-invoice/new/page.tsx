"use client";

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
import { ItemRateAutoFill } from "@/lib/flows/item-price-lookup";
import { Form, FormField, FormItem, FormControl } from "@/components/ui/form";
import { FlowWizard } from "@/components/flows/FlowWizard";
import { useFrappeCreate, useFrappeDoc } from "@/hooks/generic";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import { GuidedErrorDialog, useGuidedError } from "@/components/errors/GuidedErrorDialog";
import { getActiveCompany } from "@/lib/settings/company";
import {
  getAutoFillMapping,
  applyAutoFill,
  applyItemAutoFill,
} from "@/lib/flows/flow-auto-fill";
import { validateWizardStep } from "@/lib/flows/flow-validation";
import type { StepValidationResult } from "@/lib/flows/flow-validation";
import type { WizardStep } from "@/types/flow-types";
import type { DeliveryNote } from "@/types/doctype-types";
import { cn } from "@/lib/utils";
import { FieldWrap } from "@/components/form/field-wrap";

// 2P-FINAL Part C — Map a `from` query-string value to the source
// doctype label that `/api/erpnext/make-from` expects. We accept the
// ERPNext-style human label ("Sales Order", "Delivery Note") and
// the short slug ("SO", "DN") for back-compat with the 2M/2P
// cross-flow WhatsNext links.
type MakeFromSource = "Sales Order" | "Delivery Note";
function resolveMakeFromSource(raw: string | null): MakeFromSource | null {
  if (!raw) return null;
  const k = raw.trim();
  if (k === "Sales Order" || k === "SO") return "Sales Order";
  if (k === "Delivery Note" || k === "DN") return "Delivery Note";
  return null;
}

interface SIItem {
  item_code: string;
  item_name?: string;
  description?: string;
  qty: number;
  rate: number;
  amount?: number;
  uom?: string;
  // 2P Part 1.3 — per-item source-link fields. Set by the SO/DN prefill
  // effect so the new SI is wired into the flow rail's back-link map.
  sales_order?: string;
  so_detail?: string;
  delivery_note?: string;
  dn_detail?: string;
}

interface SIForm {
  naming_series: string;
  customer: string;
  customer_name?: string;
  company: string;
  posting_date: string;
  due_date: string;
  delivery_note?: string;
  currency: string;
  conversion_rate: number;
  selling_price_list?: string;
  debit_to: string;
  cost_center?: string;
  items: SIItem[];
}

const EMPTY_ITEM: SIItem = {
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
    label: "Customer & Source",
    description: "Confirm the customer and invoice dates",
    schema: null,
    fields: ["customer", "posting_date", "due_date", "delivery_note"],
    icon: "UserRound",
  },
  {
    id: "step2",
    label: "Items & Taxes",
    description: "Review and adjust the invoice items",
    schema: null,
    fields: ["items"],
    icon: "Package",
  },
  {
    id: "step3",
    label: "Review & Submit",
    description: "Review the invoice before creating it",
    schema: null,
    fields: [],
    icon: "ClipboardCheck",
  },
];

const ETB = new Intl.NumberFormat("en-ET", {
  style: "currency",
  currency: "ETB",
});

export default function NewSalesInvoicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deliveryNoteId = searchParams.get("delivery_note");
  const salesOrderId = searchParams.get("sales_order"); // 2M Part 1A
  const customerId = searchParams.get("customer");
  // 2P-FINAL Part C — the canonical make-from path. When the page
  // is opened with `?from=Sales Order&name=…` (or
  // `?from=Delivery Note&name=…`), we call /api/erpnext/make-from
  // FIRST and hydrate the wizard from the returned draft. The old
  // `?sales_order=` / `?delivery_note=` URLs (2M/2P) still work —
  // they trigger the hand-mapping fallback.
  const makeFromSource = resolveMakeFromSource(searchParams.get("from"));
  const makeFromName = searchParams.get("name");
  // Convenience alias: any source identified by `from=...&name=...`
  // is also the "auto-prefill" signal that gates the make-from
  // effect. We compute it once so the effect deps are stable.
  const makeFromKey = makeFromSource && makeFromName
    ? `${makeFromSource}::${makeFromName}`
    : null;

  const [step, setStep] = useState(0);
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(
    new Set(),
  );
  const [triedNextSteps, setTriedNextSteps] = useState<Set<number>>(new Set());

  const form = useForm<SIForm>({
    defaultValues: {
      naming_series: "ACC-SINV-.YYYY.-",
      customer: customerId || "",
      posting_date: new Date().toISOString().split("T")[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      currency: "ETB",
      conversion_rate: 1,
      selling_price_list: "Standard Selling",
      debit_to: "",
      items: [{ ...EMPTY_ITEM }],
    },
  });

  const { control, getValues, reset, setValue } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const watchedAll = useWatch({ control });
  const watchedItems = watchedAll?.items ?? [];
  const watchedCustomer = watchedAll?.customer ?? "";

  const { data: deliveryNote, isLoading: loadingDN } =
    useFrappeDoc<DeliveryNote>("Delivery Note", deliveryNoteId ?? "", {
      enabled: !!deliveryNoteId,
    });

  // 2M Part 1A: SO→SI prefill. ERPNext carries `sales_order` as a top-level
  // field on Sales Invoice; the cross-flow / WhatsNext href is
  // `?sales_order=SO-…`. Mirror the DN→SI effect below for that path so the
  // SO-driven cross-flow actually fills customer + currency + items.
  const { data: salesOrder, isLoading: loadingSO } = useFrappeDoc<Record<string, unknown>>(
    "Sales Order",
    salesOrderId ?? "",
    { enabled: !!salesOrderId },
  );

  useEffect(() => {
    if (!deliveryNote) return;
    const mapping = getAutoFillMapping("Delivery Note", "Sales Invoice");
    if (!mapping) return;

    const header = applyAutoFill(
      deliveryNote as unknown as Record<string, unknown>,
      mapping,
    );
    const items = applyItemAutoFill(
      (deliveryNote as { items?: Record<string, unknown>[] }).items ?? [],
      mapping,
    ) as unknown as SIItem[];

    // 2P Part 1.3 — per-item DN link (mirrors the SO→SI fix above).
    const dnName = String(deliveryNote.name ?? "");
    const sourceItems =
      ((deliveryNote as { items?: Record<string, unknown>[] }).items) ?? [];
    const itemsWithLink = items.map((it, i) => ({
      ...it,
      delivery_note: dnName,
      dn_detail: String(sourceItems[i]?.name ?? ""),
    }));

    reset({
      ...getValues(),
      ...(header as Partial<SIForm>),
      items: itemsWithLink.length ? itemsWithLink : [{ ...EMPTY_ITEM }],
      due_date: "",
    });

    const filled = new Set<string>([
      ...mapping.headerMappings
        .filter((m) => m.isReadOnly)
        .map((m) => m.targetField),
      "items",
    ]);
    setAutoFilledFields(filled);

    toast.success(`Loaded from Delivery Note ${deliveryNoteId}`, {
      description: "Set the due date to continue.",
    });
  }, [deliveryNote, deliveryNoteId, reset, getValues]);

  // 2M Part 1A: SO→SI prefill effect — mirrors the DN→SI effect.
  useEffect(() => {
    if (!salesOrder) return;
    const mapping = getAutoFillMapping("Sales Order", "Sales Invoice");
    if (!mapping) return;

    const header = applyAutoFill(
      salesOrder as Record<string, unknown>,
      mapping,
    );
    const items = applyItemAutoFill(
      (salesOrder as { items?: Record<string, unknown>[] }).items ?? [],
      mapping,
    ) as unknown as SIItem[];

    // 2P Part 1.3 — CRITICAL: per-item `sales_order` + `so_detail` link.
    // The auto-fill registry's item mapping runs over each *source item row*,
    // so `sourceField: "name"` would resolve to the SO Item row's own name
    // (e.g. "Sales Order Item-1"), not the parent SO's name. ERPNext
    // resolves the back-link from the SI side via `sales_order` ON THE
    // ITEM ROW (the same field on the child table); without it the flow
    // rail's "SO → SI" back-link never lights up. Post-fill here.
    const soName = String(salesOrder.name ?? "");
    const sourceItems =
      ((salesOrder as { items?: Record<string, unknown>[] }).items) ?? [];
    const itemsWithLink = items.map((it, i) => ({
      ...it,
      sales_order: soName,
      so_detail: String(sourceItems[i]?.name ?? ""),
    }));

    reset({
      ...getValues(),
      ...(header as Partial<SIForm>),
      items: itemsWithLink.length ? itemsWithLink : [{ ...EMPTY_ITEM }],
      due_date: "",
    });

    const filled = new Set<string>([
      ...mapping.headerMappings
        .filter((m) => m.isReadOnly)
        .map((m) => m.targetField),
      "items",
    ]);
    setAutoFilledFields(filled);

    toast.success(`Loaded from Sales Order ${salesOrderId}`, {
      description: "Set the due date to continue.",
    });
  }, [salesOrder, salesOrderId, reset, getValues]);

  // 2P-FINAL Part C — CANONICAL MAKE-FROM PATH. When the URL has
  // `?from=<Sales Order|Delivery Note>&name=<source-doc>` we call
  // `/api/erpnext/make-from` (the server-side ERPNext mapper) and
  // hydrate the wizard from the returned draft. ERPNext's mapper
  // knows every per-item back-link, tax row, and pricing rule —
  // more correct than the 2P Part 1 hand-mapping.
  //
  // The 2M/2P hand-mapping prefill is preserved as a SILENT
  // FALLBACK. The make-from call is wrapped in try/catch; on any
  // error (network, 5xx, empty draft, unsupported transition), the
  // code logs to the console + falls through to the existing
  // `salesOrder` / `deliveryNote` useFrappeDoc + hand-mapping
  // effect below. The user sees the same UX either way.
  useEffect(() => {
    if (!makeFromSource || !makeFromName) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/erpnext/make-from", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceDoctype: makeFromSource,
            sourceName: makeFromName,
            targetDoctype: "Sales Invoice",
          }),
        });
        if (!res.ok) {
          throw new Error(`make-from returned ${res.status}`);
        }
        const json = (await res.json()) as {
          success?: boolean;
          data?: { doctype?: string; doc?: Record<string, unknown> };
          error?: string;
          details?: string;
        };
        if (!json.success || !json.data?.doc) {
          throw new Error(json.error ?? "make-from returned no doc");
        }
        if (cancelled) return;
        const draft = json.data.doc as Record<string, unknown>;
        const draftItems = Array.isArray(draft.items)
          ? (draft.items as Array<Record<string, unknown>>)
          : [];

        // 2P-FINAL Part C — when the source is a SO, fill the
        // per-item `sales_order` / `so_detail` from the draft (the
        // server mapper sets them; we just normalize the key names
        // for the wizard's SIItem shape). When the source is a DN,
        // the mapper sets `delivery_note` / `dn_detail` directly on
        // the items. Either way, the wizard's child-table slot
        // receives the full back-link set.
        const itemsWithLink: SIItem[] = draftItems.map((it) => {
          const base: SIItem = {
            item_code: String(it.item_code ?? ""),
            item_name: it.item_name as string | undefined,
            description: it.description as string | undefined,
            qty: Number(it.qty ?? 1) || 1,
            rate: Number(it.rate ?? 0) || 0,
            amount:
              Number(it.amount ?? 0) ||
              (Number(it.qty ?? 1) || 1) * (Number(it.rate ?? 0) || 0),
            uom: (it.uom as string | undefined) ?? "Nos",
          };
          if (makeFromSource === "Sales Order") {
            base.sales_order = makeFromName;
            base.so_detail = String(it.name ?? "");
          } else {
            base.delivery_note = makeFromName;
            base.dn_detail = String(it.name ?? "");
          }
          return base;
        });

        // Header fields: copy any keys the draft has, mapped to the
        // SIForm shape. Unknown / non-string fields are ignored.
        const header: Partial<SIForm> = {};
        const fieldMap: Array<[keyof SIForm, string]> = [
          ["customer", "customer"],
          ["customer_name", "customer_name"],
          ["company", "company"],
          ["posting_date", "posting_date"],
          ["due_date", "due_date"],
          ["currency", "currency"],
          ["conversion_rate", "conversion_rate"],
          ["selling_price_list", "selling_price_list"],
          ["debit_to", "debit_to"],
          ["cost_center", "cost_center"],
        ];
        for (const [formKey, draftKey] of fieldMap) {
          const v = draft[draftKey];
          if (v === undefined || v === null || v === "") continue;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (header as any)[formKey] = v;
        }

        reset({
          ...getValues(),
          ...header,
          items: itemsWithLink.length ? itemsWithLink : [{ ...EMPTY_ITEM }],
          // The mapper often leaves due_date blank — surface a
          // sensible default so the wizard can advance.
          due_date:
            header.due_date ||
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0] ||
            "",
        });

        setAutoFilledFields(
          new Set<string>([
            ...Object.keys(header),
            "items",
          ]),
        );

        toast.success(`Loaded from ${makeFromSource} ${makeFromName}`, {
          description: "Review the items, set the due date, then create.",
        });
      } catch (err) {
        // Silent fallback per the handoff: do NOT surface a scary
        // error to the user. The hand-mapping prefill effect below
        // will run on the same `salesOrder` / `deliveryNote` query
        // result when the corresponding `?sales_order=` / `?delivery_note=`
        // is present. If neither is set, the user lands on a blank
        // wizard — which is the same behavior as before 2P-FINAL.
        // eslint-disable-next-line no-console
        console.warn(
          "[2P-FINAL Part C] make-from failed; falling back to hand-mapping:",
          err,
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [makeFromKey, makeFromSource, makeFromName, reset, getValues]);

  const isAuto = useCallback(
    (field: string) => autoFilledFields.has(field),
    [autoFilledFields],
  );

  const subtotal = useMemo(
    () =>
      (watchedItems ?? []).reduce(
        (sum, it) => sum + (Number(it?.qty) || 0) * (Number(it?.rate) || 0),
        0,
      ),
    [watchedItems],
  );

  const validationResults = useMemo<Record<string, StepValidationResult>>(() => {
    const values = { ...getValues(), ...watchedAll, items: watchedAll?.items ?? [] };
    return {
      step1: validateWizardStep("Sales Invoice", "step1", values),
      step2: validateWizardStep("Sales Invoice", "step2", values),
      step3: { valid: true, errors: {} },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedAll]);

  const { resolution, showError, dismiss } = useGuidedError();

  const createMutation = useFrappeCreate<
    { data: { name: string } },
    Record<string, unknown>
  >("Sales Invoice", {
    successMessage: "Sales Invoice created",
    onSuccess: (res) => {
      const name = res?.data?.name;
      if (name) {
        router.push(`/accounting/sales-invoice/${encodeURIComponent(name)}`);
      }
    },
    onError: (err) => showError(resolveFrappeError(err, { doctype: "Sales Invoice" })),
  });

  const handleSubmit = useCallback(() => {
    const values = getValues();
    const items = (values.items ?? []).filter(
      (it) => it.item_code && Number(it.qty) > 0,
    );
    if (items.length === 0) {
      toast.error("Add at least one valid item before creating the invoice.");
      setStep(1);
      return;
    }
    createMutation.mutate({
      ...values,
      company: getActiveCompany(),
      set_posting_time: 1,
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
        title="New Sales Invoice"
        subtitle={
          salesOrderId
            ? `From Sales Order ${salesOrderId}`
            : deliveryNoteId
              ? `From Delivery Note ${deliveryNoteId}`
              : "Create a sales invoice in three steps"
        }
        backHref="/accounting/sales-invoice"
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
            submitLabel="Create Sales Invoice"
            submittingLabel="Creating..."
            renderStep={(s) => {
              if (s.id === "step1") {
                return (
                  <div className="space-y-6">
                    <StepHeading
                      icon={<UserRound className="h-5 w-5 text-primary" />}
                      title="Customer & Source"
                      description="Confirm who this invoice is for and set the dates."
                    />
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <FieldWrap
                        auto={isAuto("customer")}
                        loading={loadingDN || loadingSO}
                        error={triedNextSteps.has(step) ? validationResults?.step1?.errors?.customer : undefined}
                      >
                        {/* 2L 1A: Quick-Add enabled Customer */}
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
                        name="posting_date"
                        label="Posting Date"
                        required
                      />
                      <FormDatePicker
                        control={control}
                        name="due_date"
                        label="Due Date"
                        required
                      />
                      <FormFrappeSelect
                        control={control}
                        name="debit_to"
                        label="Receivable Account"
                        required
                        doctype="Account"
                        filters={[
                          ["account_type", "=", "Receivable"],
                          ["is_group", "=", 0],
                        ]}
                        placeholder="Select account..."
                      />
                      <FormFrappeSelect
                        control={control}
                        name="cost_center"
                        label="Cost Center"
                        doctype="Cost Center"
                        filters={[["is_group", "=", 0]]}
                        placeholder="Select cost center..."
                      />
                    </div>
                  </div>
                );
              }

              if (s.id === "step2") {
                return (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <StepHeading
                        icon={<Package className="h-5 w-5 text-primary" />}
                        title="Invoice Items"
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
                                        setValue(
                                          `items.${index}.uom`,
                                          doc.stock_uom || "Nos",
                                        );
                                        setValue(
                                          `items.${index}.item_name`,
                                          doc.item_name || "",
                                        );
                                        // 2L Part 2: rate is auto-filled by ItemRateAutoFill
                                      }
                                    }}
                                  />
                                  {/* 2L Part 2: Auto-rate via Item Price (selling) */}
                                  <ItemRateAutoFill<SIForm>
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
                      <Summary label="Posting Date" value={v.posting_date} />
                      <Summary label="Due Date" value={v.due_date} />
                      <Summary label="Receivable Account" value={v.debit_to} />
                      <Summary label="Cost Center" value={v.cost_center} />
                      <Summary label="Currency" value={v.currency} />
                      <Summary label="Price List" value={v.selling_price_list} />
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
      <p className="font-medium text-foreground">{value || "\u2014"}</p>
    </div>
  );
}

function NumberCell({
  control,
  name,
}: {
  control: ReturnType<typeof useForm<SIForm>>["control"];
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
