"use client";

// app/accounting/payment-entry/[name]/edit/page.tsx
// Obsidian ERP v4.0 — Payment Entry Edit (V4 FlowWizard, edit mode)
//
// 2M Part 3A: draft-only edit affordance for Payment Entry. Loads the
// existing Draft (docstatus === 0) doc, prefills the same 3-step wizard
// used in `new`, and persists via useFrappeUpdate. Submitted (docstatus
// === 1) entries redirect back to the detail page (financial immutability:
// "no hard delete on a posted payment" — correct).
//
// Mirrors the pattern at app/sales/sales-order/[name]/edit/page.tsx so
// the 9 sibling detail pages stay consistent. The "Edit" affordance on
// the PE detail page links here.

import { useEffect, useMemo, useState, useCallback, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
import { useFrappeDoc, useFrappeList, useFrappeUpdate } from "@/hooks/generic";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import { GuidedErrorDialog, useGuidedError } from "@/components/errors/GuidedErrorDialog";
import { getActiveCompany } from "@/lib/settings/company";
import { validateWizardStep } from "@/lib/flows/flow-validation";
import type { StepValidationResult } from "@/lib/flows/flow-validation";
import { distributeAllocations } from "@/lib/accounting/payment-allocation";
import type { WizardStep } from "@/types/flow-types";
import type { PaymentEntry } from "@/types/doctype-types";
import { cn } from "@/lib/utils";
import { FieldWrap } from "@/components/form/field-wrap";

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
    label: "Review & Save",
    description: "Review details and save the payment",
    schema: null,
    fields: [],
    icon: "ClipboardCheck",
  },
];

const ETB = new Intl.NumberFormat("en-ET", {
  style: "currency",
  currency: "ETB",
});

function EditPaymentEntryForm() {
  const router = useRouter();
  const params = useParams();
  const name = decodeURIComponent(String(params.name));
  const searchParams = useSearchParams();
  const salesInvoiceId = searchParams.get("sales_invoice");

  const [step, setStep] = useState(0);
  const [triedNextSteps, setTriedNextSteps] = useState<Set<number>>(new Set());
  const [prefillReady, setPrefillReady] = useState(false);
  const { resolution, showError, dismiss } = useGuidedError();

  const { data: entry, isLoading, error } = useFrappeDoc<PaymentEntry>("Payment Entry", name);

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

  const watchedAll = useWatch({ control });
  const watchedPartyType = watchedAll?.party_type ?? "Customer";
  const watchedParty = watchedAll?.party ?? "";
  const watchedPaymentType = watchedAll?.payment_type ?? "Receive";
  const watchedPaidAmount = watchedAll?.paid_amount ?? 0;
  const watchedReferences = watchedAll?.references ?? [];

  // Prefill the form from the loaded doc, once.
  useEffect(() => {
    if (!entry || prefillReady) return;
    reset({
      payment_type: entry.payment_type ?? "Receive",
      party_type: entry.party_type ?? "Customer",
      party: entry.party ?? "",
      party_name: entry.party_name ?? "",
      paid_amount: entry.paid_amount ?? 0,
      received_amount: entry.received_amount ?? entry.paid_amount ?? 0,
      mode_of_payment: entry.mode_of_payment ?? "Cash",
      posting_date: entry.posting_date ?? new Date().toISOString().split("T")[0],
      reference_no: entry.reference_no ?? "",
      reference_date: entry.reference_date ?? "",
      paid_from: entry.paid_from ?? "",
      paid_to: entry.paid_to ?? "",
      remarks: entry.remarks ?? "",
      references: Array.isArray(entry.references) ? (entry.references as PEReference[]) : [],
    });
    setPrefillReady(true);
  }, [entry, prefillReady, reset]);

  // Sync received_amount with paid_amount for ETB
  useEffect(() => {
    setValue("received_amount", watchedPaidAmount);
  }, [watchedPaidAmount, setValue]);

  // 2U §A3 — distribute the Paid Amount across allocations (capped at each
  // invoice outstanding) so the saved draft stays balanced and submit can't
  // fail with "Difference Amount must be zero". See lib/accounting/
  // payment-allocation.ts. Converges via the equality guard.
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

  const { data: outstandingInvoices } = useFrappeList<{
    name: string;
    grand_total: number;
    outstanding_amount: number;
    posting_date: string;
  }>(
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

  const validationResults = useMemo<Record<string, StepValidationResult>>(() => {
    const values = { ...getValues(), ...watchedAll, references: watchedAll?.references ?? [] };
    return {
      step1: validateWizardStep("Payment Entry", "step1", values),
      step2: validateWizardStep("Payment Entry", "step2", values),
      step3: validateWizardStep("Payment Entry", "step3", values),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedAll]);

  const totalAllocated = useMemo(
    () =>
      (watchedReferences ?? []).reduce(
        (sum, ref) => sum + (Number(ref?.allocated_amount) || 0),
        0,
      ),
    [watchedReferences],
  );

  const updateMutation = useFrappeUpdate<PaymentEntry>("Payment Entry", {
    showToast: false,
  });

  const handleSave = useCallback(() => {
    const values = getValues();
    // 2U §A3 — reconcile paid_amount with Σ allocated so the draft stays
    // submittable (ERPNext requires difference_amount == 0).
    const { references: distributedRefs, paidAmount: effectivePaid } =
      distributeAllocations(Number(values.paid_amount) || 0, values.references ?? []);
    updateMutation.mutate(
      {
        name,
        data: {
          ...values,
          paid_amount: effectivePaid,
          received_amount: effectivePaid,
          references: distributedRefs,
        },
      },
      {
        onSuccess: () => {
          toast.success(`Payment Entry ${name} updated`);
          router.push(`/accounting/payment-entry/${encodeURIComponent(name)}`);
        },
        onError: (err) => showError(resolveFrappeError(err, { doctype: "Payment Entry" })),
      },
    );
  }, [updateMutation, getValues, name, router, showError]);

  if (isLoading) return <LoadingState type="detail" />;
  if (error || !entry) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
        <p className="text-sm text-destructive">
          {error?.message ?? "Payment Entry not found."}
        </p>
        <Button
          variant="ghost"
          className="mt-3"
          onClick={() => router.push("/accounting/payment-entry")}
        >
          Back to Payment Entries
        </Button>
      </div>
    );
  }

  // 2M Part 3A: financial immutability — submitted PEs are not editable.
  // (Absence of delete on submitted PE is correct; absence of edit on
  // draft PE was the bug — fixed by routing through this page.)
  if (entry.docstatus !== 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={`Edit ${name}`}
          subtitle="Submitted payments are immutable"
          backHref={`/accounting/payment-entry/${encodeURIComponent(name)}`}
        />
        <InfoCard>
          <div className="rounded-xl border border-warning/30 bg-warning/5 p-6">
            <p className="text-sm font-medium text-foreground">
              This Payment Entry has been submitted and can no longer be edited.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              To make changes, cancel the entry first (or amend via a new Payment Entry).
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push(`/accounting/payment-entry/${encodeURIComponent(name)}`)}
            >
              Back to detail
            </Button>
          </div>
        </InfoCard>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={`Edit ${entry.name}`}
        subtitle={`Draft · ${entry.party_name || entry.party || "—"}`}
        backHref={`/accounting/payment-entry/${encodeURIComponent(name)}`}
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
            onTriedNextChange={setTriedNextSteps}
            onSubmit={handleSave}
            onCancel={() => router.push(`/accounting/payment-entry/${encodeURIComponent(name)}`)}
            submitLabel="Save Payment Entry"
            submittingLabel="Saving..."
            renderStep={(s) => {
              if (s.id === "step1") {
                return (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                        <Wallet className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-foreground">Payment Type & Party</h3>
                        <p className="text-sm text-muted-foreground">Edit the payment type, party, and amount.</p>
                      </div>
                    </div>
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
                        disabled={watchedPaymentType === "Internal Transfer"}
                      />
                      <FieldWrap
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
                          disabled={watchedPaymentType === "Internal Transfer"}
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
                                onChange={(e) => field.onChange(Number(e.target.value))}
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
              if (s.id === "step2") {
                return (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                          <ArrowDownLeft className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-foreground">Allocate to Invoices</h3>
                          <p className="text-sm text-muted-foreground">Edit the invoice allocations.</p>
                        </div>
                      </div>
                    </div>
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
                                    allocated_amount: inv.outstanding_amount ?? 0,
                                    total_amount: inv.grand_total ?? 0,
                                    outstanding_amount: inv.outstanding_amount ?? 0,
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
                                  <FormField
                                    control={control}
                                    name={`references.${index}.allocated_amount`}
                                    render={({ field: f }) => (
                                      <FormItem>
                                        <FormControl>
                                          <Input
                                            {...f}
                                            type="number"
                                            inputMode="decimal"
                                            className="h-10 rounded-lg border-0 bg-secondary/30 text-right tabular-nums"
                                            onChange={(e) => f.onChange(Number(e.target.value))}
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
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
              // Step 3
              const v = getValues();
              return (
                <div className="space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                      <ClipboardCheck className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">Review & Save</h3>
                      <p className="text-sm text-muted-foreground">Confirm the details and save the payment.</p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-card/40 p-5 backdrop-blur-sm">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <p className="text-muted-foreground">Payment Type</p><p className="font-medium">{v.payment_type}</p>
                      <p className="text-muted-foreground">Party Type</p><p className="font-medium">{v.party_type}</p>
                      <p className="text-muted-foreground">Party</p><p className="font-medium">{v.party_name || v.party}</p>
                      <p className="text-muted-foreground">Mode of Payment</p><p className="font-medium">{v.mode_of_payment}</p>
                      <p className="text-muted-foreground">Posting Date</p><p className="font-medium">{v.posting_date}</p>
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

export default function EditPaymentEntryPage() {
  return (
    <Suspense fallback={<LoadingState type="detail" />}>
      <EditPaymentEntryForm />
    </Suspense>
  );
}
