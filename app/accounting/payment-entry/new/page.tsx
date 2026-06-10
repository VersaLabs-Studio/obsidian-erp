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
import type { WizardStep } from "@/types/flow-types";
import type { PaymentEntry, SalesInvoice } from "@/types/doctype-types";
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

  const [step, setStep] = useState(0);
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(
    new Set(),
  );
  const [triedNextSteps, setTriedNextSteps] = useState<Set<number>>(new Set());

  const form = useForm<PEForm>({
    defaultValues: {
      payment_type: "Receive",
      party_type: "Customer",
      party: "",
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

    reset({
      ...getValues(),
      ...(header as Partial<PEForm>),
      party_type: "Customer",
      payment_type: "Receive",
      references: [ref],
    });

    const filled = new Set<string>([
      ...mapping.headerMappings
        .filter((m) => m.isReadOnly)
        .map((m) => m.targetField),
      "references",
    ]);
    setAutoFilledFields(filled);

    toast.success(`Loaded from Sales Invoice ${salesInvoiceId}`, {
      description: "Set the payment amount and mode to continue.",
    });
  }, [salesInvoice, salesInvoiceId, reset, getValues]);

  // Sync received_amount with paid_amount for ETB
  useEffect(() => {
    setValue("received_amount", watchedPaidAmount);
  }, [watchedPaidAmount, setValue]);

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
    createMutation.mutate({
      ...values,
      company: getActiveCompany(),
      naming_series: "ACC-PAY-.YYYY.-",
      received_amount: values.paid_amount,
      source_exchange_rate: 1,
      target_exchange_rate: 1,
      base_paid_amount: values.paid_amount,
      base_received_amount: values.paid_amount,
      references: (values.references ?? []).filter(
        (ref) => ref.reference_name && ref.allocated_amount > 0,
      ),
    });
  }, [createMutation, getValues]);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="New Payment Entry"
        subtitle={
          salesInvoiceId
            ? `From Sales Invoice ${salesInvoiceId}`
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
                        loading={loadingInvoice}
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
                        loading={loadingInvoice}
                        error={triedNextSteps.has(step) ? validationResults?.step1?.errors?.party : undefined}
                      >
                        <FormFrappeSelect
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
