"use client";

// app/accounting/payment-entry/new/page.tsx
// Obsidian ERP v4.0 — Payment Entry Create (FlowWizard, 3-step)
// Zod gating via validateWizardStep, reactive validation via useWatch.
// OKLCH semantic tokens only, real persistence.

import { useEffect, useMemo, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { toast } from "sonner";
import {
  Wallet,
  FileText,
  ClipboardCheck,
  Plus,
  Trash2,
  Lock,
  ArrowDownLeft,
} from "lucide-react";

import { PageHeader, LoadingState } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FormInput,
  FormFrappeSelect,
  FormDatePicker,
  FormSelect,
} from "@/components/form";
import { QuickAddField } from "@/components/quick-add/QuickAddField";
import { Form, FormField, FormItem, FormControl } from "@/components/ui/form";
import { FlowWizard } from "@/components/flows/FlowWizard";
import { useFrappeCreate, useFrappeDoc, useFrappeList } from "@/hooks/generic";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import { GuidedErrorDialog, useGuidedError } from "@/components/errors/GuidedErrorDialog";
import { getActiveCompany } from "@/lib/settings/company";
import {
  getAutoFillMapping,
  applyAutoFill,
} from "@/lib/flows/flow-auto-fill";
import { validateWizardStep } from "@/lib/flows/flow-validation";
import type { StepValidationResult } from "@/lib/flows/flow-validation";
import { distributeAllocations } from "@/lib/accounting/payment-allocation";
import type { WizardStep } from "@/types/flow-types";
import type { PaymentEntry, SalesInvoice, PurchaseInvoice } from "@/types/doctype-types";
import { cn } from "@/lib/utils";
import { FieldWrap } from "@/components/form/field-wrap";

// ---------------------------------------------------------------------------
// Form model
// ---------------------------------------------------------------------------
interface PEReference {
  reference_doctype: string;
  reference_name: string;
  allocated_amount: number;
  total_amount?: number;
  outstanding_amount?: number;
}

interface PEForm {
  payment_type: string;
  party_type: string;
  party: string;
  party_name?: string;
  paid_amount: number;
  received_amount: number;
  mode_of_payment: string;
  company: string;
  posting_date: string;
  reference_no?: string;
  reference_date?: string;
  paid_from: string;
  paid_to: string;
  remarks?: string;
  references: PEReference[];
}

const WIZARD_STEPS: WizardStep[] = [
  {
    id: "step1",
    label: "Payment Type",
    description: "Set the payment type, party, and amount",
    schema: null,
    fields: ["payment_type", "party_type", "party", "paid_amount", "mode_of_payment"],
    icon: "Wallet",
  },
  {
    id: "step2",
    label: "Allocate to Invoices",
    description: "Allocate payment to outstanding invoices",
    schema: null,
    fields: ["references"],
    icon: "FileText",
  },
  {
    id: "step3",
    label: "Review & Post",
    description: "Review details and post the payment",
    schema: null,
    fields: [],
    icon: "ClipboardCheck",
  },
];

const ETB = new Intl.NumberFormat("en-ET", {
  style: "currency",
  currency: "ETB",
});

function CreatePaymentEntryForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const salesInvoiceId = searchParams.get("sales_invoice");
  const purchaseInvoiceId = searchParams.get("purchase_invoice");
  const invoiceParam = searchParams.get("invoice");
  const partyTypeParam = searchParams.get("party_type");
  const partyParam = searchParams.get("party");
  const amountParam = searchParams.get("amount");
  const paymentTypeParam = searchParams.get("payment_type");

  // 2S Part 3 — resolve the invoice source: explicit sales_invoice param,
  // explicit purchase_invoice param, or generic "invoice" param from the PI
  // detail page's WhatsNext card (which sends ?invoice=PINV-xxx).
  const resolvedPIId = purchaseInvoiceId ?? (invoiceParam && partyTypeParam === "Supplier" ? invoiceParam : null);

  const [step, setStep] = useState(0);
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(
    new Set(),
  );
  const [triedNextSteps, setTriedNextSteps] = useState<Set<number>>(new Set());

  const form = useForm<PEForm>({
    defaultValues: {
      payment_type: "Receive",
      party_type: partyTypeParam || "Customer",
      party: partyParam || "",
      party_name: "",
      paid_amount: 0,
      received_amount: 0,
      mode_of_payment: "Cash",
      posting_date: new Date().toISOString().split("T")[0],
      reference_no: "",
      reference_date: "",
      paid_from: "",
      paid_to: "",
      remarks: "",
      references: [],
    },
  });

  const { control, getValues, reset, setValue } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "references" });

  // Watch the entire form reactively — drives validation gate + FlowWizard formData
  const watchedAll = useWatch({ control });
  const watchedPartyType = watchedAll?.party_type ?? "Customer";
  const watchedParty = watchedAll?.party ?? "";
  const watchedPaymentType = watchedAll?.payment_type ?? "Receive";
  const watchedPaidAmount = watchedAll?.paid_amount ?? 0;
  const watchedReferences = watchedAll?.references ?? [];

  // -- Auto-fill from upstream Sales Invoice via the registry ----------------
  const { data: salesInvoice, isLoading: loadingInvoice } =
    useFrappeDoc<SalesInvoice>("Sales Invoice", salesInvoiceId ?? "", {
      enabled: !!salesInvoiceId,
    });

  useEffect(() => {
    if (!salesInvoice) return;
    const mapping = getAutoFillMapping("Sales Invoice", "Payment Entry");
    if (!mapping) return;

    const header = applyAutoFill(
      salesInvoice as unknown as Record<string, unknown>,
      mapping,
    );

    // Build a reference from the invoice
    const ref: PEReference = {
      reference_doctype: "Sales Invoice",
      reference_name: salesInvoice.name,
      allocated_amount: salesInvoice.outstanding_amount ?? salesInvoice.grand_total ?? 0,
      total_amount: salesInvoice.grand_total ?? 0,
      outstanding_amount: salesInvoice.outstanding_amount ?? 0,
    };

    // 2M Part 1B: set `paid_amount = Σ allocated_amount` so Frappe doesn't
    // reject the POST with "Difference Amount must be zero" (paid_amount(0)
    // − allocated(X) ≠ 0). The received_amount sync effect below mirrors it
    // for ETB. Also mark paid_from/paid_to as auto-filled so the UI shows
    // the auto badge.
    const allocatedTotal = ref.allocated_amount;

    reset({
      ...getValues(),
      ...(header as Partial<PEForm>),
      party_type: "Customer",
      payment_type: "Receive",
      paid_amount: allocatedTotal,
      received_amount: allocatedTotal,
      references: [ref],
    });

    const filled = new Set<string>([
      ...mapping.headerMappings
        .filter((m) => m.isReadOnly)
        .map((m) => m.targetField),
      "references",
      "paid_amount",
    ]);
    setAutoFilledFields(filled);

    toast.success(`Loaded from Sales Invoice ${salesInvoiceId}`, {
      description: "Set the payment amount and mode to continue.",
    });
  }, [salesInvoice, salesInvoiceId, reset, getValues]);

  // -- 2S Part 3 — Auto-fill from upstream Purchase Invoice via the registry -
  const { data: purchaseInvoice, isLoading: loadingPI } =
    useFrappeDoc<PurchaseInvoice>("Purchase Invoice", resolvedPIId ?? "", {
      enabled: !!resolvedPIId,
    });

  useEffect(() => {
    if (!purchaseInvoice) return;
    const mapping = getAutoFillMapping("Purchase Invoice", "Payment Entry");
    if (!mapping) return;

    const header = applyAutoFill(
      purchaseInvoice as unknown as Record<string, unknown>,
      mapping,
    );

    // Build a reference from the invoice
    const outstandingAmt = purchaseInvoice.outstanding_amount ?? purchaseInvoice.grand_total ?? 0;
    const ref: PEReference = {
      reference_doctype: "Purchase Invoice",
      reference_name: purchaseInvoice.name,
      allocated_amount: outstandingAmt,
      total_amount: purchaseInvoice.grand_total ?? 0,
      outstanding_amount: purchaseInvoice.outstanding_amount ?? 0,
    };

    reset({
      ...getValues(),
      ...(header as Partial<PEForm>),
      party_type: "Supplier",
      payment_type: "Pay",
      paid_amount: outstandingAmt,
      received_amount: outstandingAmt,
      references: [ref],
    });

    const filled = new Set<string>([
      ...mapping.headerMappings
        .filter((m) => m.isReadOnly)
        .map((m) => m.targetField),
      "references",
      "paid_amount",
      "party_type",
      "payment_type",
    ]);
    setAutoFilledFields(filled);

    toast.success(`Loaded from Purchase Invoice ${resolvedPIId}`, {
      description: "Review the payment details to continue.",
    });
  }, [purchaseInvoice, resolvedPIId, reset, getValues]);

  // Sync received_amount with paid_amount for ETB
  useEffect(() => {
    setValue("received_amount", watchedPaidAmount);
  }, [watchedPaidAmount, setValue]);

  // 2U §A3 — keep each invoice allocation distributed from the (authoritative)
  // Paid Amount, capped at the invoice outstanding. This keeps the live
  // Difference indicator at zero and guarantees ERPNext's
  // `difference_amount == 0` submit guard passes — the bug that blocked
  // partial payments ("Difference Amount must be zero"). The equality guard
  // makes the effect converge (no setValue once allocations already match).
  useEffect(() => {
    const refs = watchedReferences ?? [];
    if (refs.length === 0) return;
    let remaining = Number(watchedPaidAmount) || 0;
    refs.forEach((r, i) => {
      const outstanding = Number(r?.outstanding_amount) || 0;
      const cap = outstanding > 0 ? outstanding : remaining;
      const alloc = Math.max(0, Math.min(remaining, cap));
      remaining -= alloc;
      if (Number(r?.allocated_amount) !== alloc) {
        setValue(`references.${i}.allocated_amount`, alloc);
      }
    });
  }, [watchedPaidAmount, watchedReferences, setValue]);

  // Fetch outstanding invoices for the selected party
  const invoiceDoctype = watchedPartyType === "Supplier" ? "Purchase Invoice" : "Sales Invoice";
  const partyField = watchedPartyType === "Supplier" ? "supplier" : "customer";

  const { data: outstandingInvoices } = useFrappeList<SalesInvoice>(
    invoiceDoctype,
    {
      fields: ["name", "grand_total", "outstanding_amount", "posting_date"],
      filters: [
        [partyField, "=", watchedParty],
        ["docstatus", "=", 1],
        ["outstanding_amount", ">", 0],
      ],
      orderBy: { field: "posting_date", order: "desc" },
      limit: 20,
    },
    { enabled: !!watchedParty && watchedPaymentType !== "Internal Transfer" },
  );

  // 2L P1: Auto-resolve default accounts for paid_from / paid_to.
  // - For "Receive" (Customer) → paid_to = default bank/cash, paid_from = party receivable
  // - For "Pay" (Supplier)      → paid_from = default bank/cash, paid_to = party payable
  // The Company default bank/cash account is fetched once on mount; the
  // party's default receivable/payable is fetched on party selection.
  const { data: defaultCashAccount } = useFrappeList<{ name: string }>(
    "Account",
    {
      fields: ["name"],
      filters: [
        ["account_type", "=", "Cash"],
        ["is_group", "=", 0],
        ["company", "=", getActiveCompany()],
      ],
      limit: 1,
    },
    { enabled: watchedPaymentType !== "Internal Transfer" },
  );
  const { data: defaultBankAccount } = useFrappeList<{ name: string }>(
    "Account",
    {
      fields: ["name"],
      filters: [
        ["account_type", "=", "Bank"],
        ["is_group", "=", 0],
        ["company", "=", getActiveCompany()],
      ],
      limit: 1,
    },
    { enabled: watchedPaymentType !== "Internal Transfer" },
  );
  const partyAccountType = watchedPartyType === "Supplier" ? "Payable" : "Receivable";
  const { data: partyDefaultAccount } = useFrappeList<{ name: string }>(
    "Account",
    {
      fields: ["name"],
      filters: [
        ["account_type", "=", partyAccountType],
        ["is_group", "=", 0],
        ["company", "=", getActiveCompany()],
      ],
      limit: 1,
    },
    { enabled: !!watchedParty && watchedPaymentType !== "Internal Transfer" },
  );

  // Auto-populate paid_from / paid_to as soon as we have a party + accounts
  useEffect(() => {
    if (watchedPaymentType === "Internal Transfer") return;
    const cashOrBank = defaultBankAccount?.[0]?.name || defaultCashAccount?.[0]?.name || "";
    const partyAccount = partyDefaultAccount?.[0]?.name || "";
    if (!cashOrBank || !partyAccount) return;
    if (watchedPaymentType === "Receive") {
      // Customer pays us: money comes from customer's Receivable, goes to our bank
      const current = getValues("paid_from");
      if (!current) setValue("paid_from", partyAccount);
      const currentTo = getValues("paid_to");
      if (!currentTo) setValue("paid_to", cashOrBank);
    } else if (watchedPaymentType === "Pay") {
      // We pay a supplier: money leaves our bank, reduces supplier's Payable
      const current = getValues("paid_from");
      if (!current) setValue("paid_from", cashOrBank);
      const currentTo = getValues("paid_to");
      if (!currentTo) setValue("paid_to", partyAccount);
    }
  }, [
    watchedPaymentType,
    defaultBankAccount,
    defaultCashAccount,
    partyDefaultAccount,
    setValue,
    getValues,
  ]);

  const isAuto = useCallback(
    (field: string) => autoFilledFields.has(field),
    [autoFilledFields],
  );

  // -- Per-step validation (gates the wizard's Next button) ------------------
  const validationResults = useMemo<Record<string, StepValidationResult>>(() => {
    const values = { ...getValues(), ...watchedAll, references: watchedAll?.references ?? [] };
    return {
      step1: validateWizardStep("Payment Entry", "step1", values),
      step2: validateWizardStep("Payment Entry", "step2", values),
      step3: validateWizardStep("Payment Entry", "step3", values),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedAll]);

  // -- Live total allocated --------------------------------------------------
  const totalAllocated = useMemo(
    () =>
      (watchedReferences ?? []).reduce(
        (sum, ref) => sum + (Number(ref?.allocated_amount) || 0),
        0,
      ),
    [watchedReferences],
  );

  // -- Persistence ------------------------------------------------------------
  const { resolution, showError, dismiss } = useGuidedError();
  const createMutation = useFrappeCreate<
    { data: { name: string } },
    Record<string, unknown>
  >("Payment Entry", {
    successMessage: "Payment Entry created",
    onSuccess: (res) => {
      const name = res?.data?.name;
      if (name) {
        router.push(`/accounting/payment-entry/${encodeURIComponent(name)}`);
      }
    },
    onError: (err) => showError(resolveFrappeError(err, { doctype: "Payment Entry" })),
  });

  const handleSubmit = useCallback(() => {
    const values = getValues();
    // 2U §A3 — distribute the typed Paid Amount across the referenced
    // invoices so paid_amount === Σ allocated_amount. This is authoritative
    // at submit (independent of whatever the live effect did), so the PE can
    // never post with a non-zero difference_amount.
    const { references: distributedRefs, paidAmount: effectivePaid } =
      distributeAllocations(Number(values.paid_amount) || 0, values.references ?? []);
    createMutation.mutate({
      ...values,
      company: getActiveCompany(),
      naming_series: "ACC-PAY-.YYYY.-",
      paid_amount: effectivePaid,
      received_amount: effectivePaid,
      source_exchange_rate: 1,
      target_exchange_rate: 1,
      base_paid_amount: effectivePaid,
      base_received_amount: effectivePaid,
      references: distributedRefs,
    });
  }, [createMutation, getValues]);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="New Payment Entry"
        subtitle={
          salesInvoiceId
            ? `From Sales Invoice ${salesInvoiceId}`
            : resolvedPIId
              ? `From Purchase Invoice ${resolvedPIId}`
              : "Record a payment in three steps"
        }
        backHref="/accounting/payment-entry"
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
            submitLabel="Create Payment Entry"
            submittingLabel="Creating..."
            renderStep={(s) => {
              // ---- STEP 1 — Payment Type --------------------------------
              if (s.id === "step1") {
                return (
                  <div className="space-y-6">
                    <StepHeading
                      icon={<Wallet className="h-5 w-5 text-primary" />}
                      title="Payment Type & Party"
                      description="Set the payment type, party, and amount."
                    />
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <FormSelect
                        control={control}
                        name="payment_type"
                        label="Payment Type"
                        required
                        options={[
                          { value: "Receive", label: "Receive (Receipt)" },
                          { value: "Pay", label: "Pay (Payment)" },
                          { value: "Internal Transfer", label: "Internal Transfer" },
                        ]}
                      />
                      <FieldWrap
                        auto={isAuto("party_type")}
                        loading={loadingInvoice || loadingPI}
                        error={triedNextSteps.has(step) ? validationResults?.step1?.errors?.party_type : undefined}
                      >
                        <FormSelect
                          control={control}
                          name="party_type"
                          label="Party Type"
                          options={[
                            { value: "Customer", label: "Customer" },
                            { value: "Supplier", label: "Supplier" },
                            { value: "Employee", label: "Employee" },
                            { value: "Shareholder", label: "Shareholder" },
                          ]}
                          disabled={
                            watchedPaymentType === "Internal Transfer" ||
                            isAuto("party_type")
                          }
                        />
                      </FieldWrap>
                      <FieldWrap
                        auto={isAuto("party")}
                        loading={loadingInvoice || loadingPI}
                        error={triedNextSteps.has(step) ? validationResults?.step1?.errors?.party : undefined}
                      >
                        {/* 2M Part 4B: Quick-Add enabled Party. Doctype is
                            Customer/Supplier/Employee/Shareholder per
                            watchedPartyType; QuickAddField only renders the
                            "Create new" footer for doctypes in the
                            QUICK_ADD_REGISTRY (Customer, Supplier). The
                            Employee/Shareholder cases gracefully fall
                            through to a plain select. */}
                        <QuickAddField
                          control={control}
                          name="party"
                          label="Party"
                          required
                          doctype={watchedPartyType ?? ""}
                          labelField={
                            watchedPartyType === "Customer"
                              ? "customer_name"
                              : watchedPartyType === "Supplier"
                                ? "supplier_name"
                                : "name"
                          }
                          placeholder="Search party..."
                          disabled={
                            watchedPaymentType === "Internal Transfer" ||
                            isAuto("party")
                          }
                        />
                      </FieldWrap>
                      <FormField
                        control={control}
                        name="paid_amount"
                        render={({ field }) => (
                          <FormItem>
                            <p className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider mb-2">
                              Paid Amount
                            </p>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                inputMode="decimal"
                                className="h-12 rounded-2xl bg-secondary/30 border-0 text-right font-black text-xl"
                                onChange={(e) =>
                                  field.onChange(Number(e.target.value))
                                }
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormFrappeSelect
                        control={control}
                        name="mode_of_payment"
                        label="Mode of Payment"
                        doctype="Mode of Payment"
                        placeholder="Select mode..."
                      />
                    </div>
                  </div>
                );
              }

              // ---- STEP 2 — Allocate to Invoices ------------------------
              if (s.id === "step2") {
                return (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <StepHeading
                        icon={<ArrowDownLeft className="h-5 w-5 text-primary" />}
                        title="Allocate to Invoices"
                        description="Allocate payment to outstanding invoices."
                      />
                      {isAuto("references") && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          <Lock className="h-3 w-3" />
                          Auto-filled
                        </span>
                      )}
                    </div>

                    {/* Outstanding invoices quick-add */}
                    {outstandingInvoices && outstandingInvoices.length > 0 && (
                      <div className="rounded-xl border border-border/60 bg-secondary/10 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
                          Outstanding Invoices — click to add
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {outstandingInvoices.map((inv) => {
                            const alreadyAdded = watchedReferences.some(
                              (r) => r?.reference_name === inv.name,
                            );
                            return (
                              <Button
                                key={inv.name}
                                type="button"
                                variant="outline"
                                size="sm"
                                className="rounded-full text-xs"
                                disabled={alreadyAdded}
                                onClick={() =>
                                  append({
                                    reference_doctype: invoiceDoctype,
                                    reference_name: inv.name,
                                    allocated_amount:
                                      inv.outstanding_amount ?? 0,
                                    total_amount: inv.grand_total ?? 0,
                                    outstanding_amount:
                                      inv.outstanding_amount ?? 0,
                                  })
                                }
                              >
                                {inv.name} — {ETB.format(inv.outstanding_amount ?? 0)}
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="overflow-hidden rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm">
                      <table className="w-full text-sm">
                        <thead className="border-b border-border/60 bg-secondary/20">
                          <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            <th className="px-3 py-2.5 text-left font-semibold">Invoice</th>
                            <th className="px-3 py-2.5 text-right font-semibold">Outstanding</th>
                            <th className="px-3 py-2.5 text-right font-semibold">Allocate</th>
                            <th className="w-10" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {fields.map((field, index) => {
                            const outstanding = watchedReferences?.[index]?.outstanding_amount ?? 0;
                            return (
                              <tr key={field.id} className="group">
                                <td className="px-3 py-2 align-top">
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium text-foreground">
                                      {watchedReferences?.[index]?.reference_name || "—"}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                      {watchedReferences?.[index]?.reference_doctype}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 text-right tabular-nums font-medium text-muted-foreground">
                                  {ETB.format(outstanding)}
                                </td>
                                <td className="px-3 py-2 align-top">
                                  <NumberCell
                                    control={control}
                                    name={`references.${index}.allocated_amount`}
                                  />
                                </td>
                                <td className="px-2 py-2 text-center align-middle">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                                    onClick={() => remove(index)}
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
                          onClick={() =>
                            append({
                              reference_doctype: invoiceDoctype,
                              reference_name: "",
                              allocated_amount: 0,
                            })
                          }
                        >
                          <Plus className="mr-1.5 h-4 w-4" /> Add Reference
                        </Button>
                        <div className="text-right">
                          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            Total Allocated
                          </p>
                          <p className="text-xl font-bold tabular-nums text-foreground">
                            {ETB.format(totalAllocated)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 2M Part 1B: Difference indicator — paid_amount − Σ allocated.
                        Success (zero) when paid matches the allocation; warning
                        (non-zero) tells the user the payment won't be balanced. */}
                    {(() => {
                      const diff = Number(watchedPaidAmount || 0) - Number(totalAllocated || 0);
                      const isZero = Math.abs(diff) < 0.005;
                      return (
                        <div
                          className={cn(
                            "flex items-center justify-between rounded-xl border px-4 py-3",
                            isZero
                              ? "border-success/30 bg-success/5"
                              : "border-warning/30 bg-warning/5",
                          )}
                          aria-live="polite"
                          data-testid="pe-difference-indicator"
                        >
                          <span
                            className={cn(
                              "text-xs font-semibold uppercase tracking-wider",
                              isZero ? "text-success" : "text-warning",
                            )}
                          >
                            {isZero ? "Balanced" : "Difference"}
                          </span>
                          <span
                            className={cn(
                              "text-lg font-bold tabular-nums",
                              isZero ? "text-success" : "text-warning",
                            )}
                          >
                            {ETB.format(diff)}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                );
              }

              // ---- STEP 3 — Review & Post --------------------------------
              const v = getValues();
              return (
                <div className="space-y-5">
                  <StepHeading
                    icon={<ClipboardCheck className="h-5 w-5 text-primary" />}
                    title="Review & Post"
                    description="Confirm the details below to create the payment."
                  />
                  <div className="rounded-xl border border-border/60 bg-card/40 p-5 backdrop-blur-sm">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <Summary label="Payment Type" value={v.payment_type} />
                      <Summary label="Party Type" value={v.party_type} />
                      <Summary label="Party" value={v.party_name || v.party} />
                      <Summary label="Company" value={v.company} />
                      <Summary label="Mode of Payment" value={v.mode_of_payment} />
                      <Summary label="Posting Date" value={v.posting_date} />
                    </div>

                    {/* 2L P1: paid_from / paid_to — RENDERED + auto-resolved.
                        These are Frappe-required for the POST; previously the
                        wizard never showed them, so the user couldn't satisfy
                        the validation. The auto-resolve useEffect above fills
                        them with sensible defaults. The user can override. */}
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <FormFrappeSelect
                        control={control}
                        name="paid_from"
                        label={v.payment_type === "Receive" ? "Paid From (Customer Receivable)" : "Paid From (Bank/Cash)"}
                        required
                        doctype="Account"
                        filters={
                          v.payment_type === "Receive"
                            ? [
                                ["account_type", "=", "Receivable"],
                                ["is_group", "=", 0],
                              ]
                            : [
                                ["account_type", "in", ["Bank", "Cash"]],
                                ["is_group", "=", 0],
                              ]
                        }
                        placeholder="Select account..."
                      />
                      <FormFrappeSelect
                        control={control}
                        name="paid_to"
                        label={v.payment_type === "Receive" ? "Paid To (Bank/Cash)" : "Paid To (Supplier Payable)"}
                        required
                        doctype="Account"
                        filters={
                          v.payment_type === "Receive"
                            ? [
                                ["account_type", "in", ["Bank", "Cash"]],
                                ["is_group", "=", 0],
                              ]
                            : [
                                ["account_type", "=", "Payable"],
                                ["is_group", "=", 0],
                              ]
                        }
                        placeholder="Select account..."
                      />
                    </div>

                    {/* Reference no/date */}
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <FormInput
                        control={control}
                        name="reference_no"
                        label="Reference No"
                        placeholder="Cheque / transaction ref"
                      />
                      <FormDatePicker
                        control={control}
                        name="reference_date"
                        label="Reference Date"
                      />
                    </div>

                    <div className="mt-4 border-t border-border/60 pt-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {(watchedReferences ?? []).filter((r) => r?.reference_name).length}{" "}
                          invoice(s) allocated
                        </span>
                        <div className="text-right">
                          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            Grand Total
                          </span>
                          <p className="text-2xl font-bold tabular-nums text-primary">
                            {ETB.format(v.paid_amount)}
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

export default function NewPaymentEntryPage() {
  return (
    <Suspense fallback={<LoadingState type="detail" />}>
      <CreatePaymentEntryForm />
    </Suspense>
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

function NumberCell({
  control,
  name,
}: {
  control: ReturnType<typeof useForm<PEForm>>["control"];
  name: `references.${number}.allocated_amount`;
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
