"use client";

import { useMemo, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
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
  BookOpen,
  Building2,
  Calendar,
  Wallet,
  ArrowRightCircle,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { useFrappeCreate } from "@/hooks/generic";
import { PageHeader } from "@/components/smart";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import { GuidedErrorDialog, useGuidedError } from "@/components/errors/GuidedErrorDialog";
import { getActiveCompany } from "@/lib/settings/company";
import { InfoCard } from "@/components/ui/info-card";
import { FlowWizard } from "@/components/flows/FlowWizard";
import { validateWizardStep } from "@/lib/flows/flow-validation";
import type { StepValidationResult } from "@/lib/flows/flow-validation";
import type { WizardStep } from "@/types/flow-types";
import {
  FormFrappeSelect,
  FormSelect,
  FormDatePicker,
  FormInput,
  FormTextarea,
} from "@/components/form";
import {
  JournalEntryCreateSchema,
  JournalEntryFormData,
} from "@/lib/schemas/doctype-schemas";
import type { JournalEntry } from "@/types/doctype-types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const WIZARD_STEPS: WizardStep[] = [
  {
    id: "step1",
    label: "General Info",
    description: "Set company, voucher type, and posting date",
    schema: null,
    fields: ["voucher_type", "posting_date"],
    icon: "BookOpen",
  },
  {
    id: "step2",
    label: "Entries & Remarks",
    description: "Add accounting lines and narration",
    schema: null,
    fields: ["accounts", "user_remark", "cheque_no", "cheque_date"],
    icon: "ArrowRightCircle",
  },
];

export default function CreateJournalEntryPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [triedNextSteps, setTriedNextSteps] = useState<Set<number>>(new Set());

  const form = useForm<JournalEntryFormData>({
    resolver: zodResolver(JournalEntryCreateSchema),
    defaultValues: {
      naming_series: "ACC-JV-.YYYY.-",
      voucher_type: "Journal Entry",
      posting_date: new Date().toISOString().split("T")[0],
      accounts: [
        { account: "", debit: 0, credit: 0, party_type: "", party: "" },
        { account: "", debit: 0, credit: 0, party_type: "", party: "" },
      ],
      user_remark: "",
      cheque_no: "",
      cheque_date: "",
    },
  });

  const { control, handleSubmit, watch, getValues } = form;
  const { fields, append, remove } = useFieldArray({
    control,
    name: "accounts",
  });

  const watchedAll = useWatch({ control });
  const watchedAccounts = watchedAll?.accounts ?? [];

  const totals = useMemo(() => {
    if (!watchedAccounts || !Array.isArray(watchedAccounts))
      return { debit: 0, credit: 0 };
    return watchedAccounts.reduce<{ debit: number; credit: number }>(
      (acc, curr) => ({
        debit: acc.debit + (Number(curr?.debit) || 0),
        credit: acc.credit + (Number(curr?.credit) || 0),
      }),
      { debit: 0, credit: 0 },
    );
  }, [watchedAccounts]);

  const difference = totals.debit - totals.credit;
  const isBalanced = Math.abs(difference) < 0.01 && totals.debit > 0;

  const validationResults = useMemo<Record<string, StepValidationResult>>(() => {
    const values = { ...getValues(), ...watchedAll };
    return {
      step1: validateWizardStep("Journal Entry", "step1", values),
      step2: validateWizardStep("Journal Entry", "step2", values),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedAll]);

  const { resolution, showError, dismiss } = useGuidedError();

  const createMutation = useFrappeCreate<{ data: JournalEntry }, any>(
    "Journal Entry",
    {
      onSuccess: (data) =>
        router.push(
          `/accounting/journal-entry/${encodeURIComponent(data.data.name)}`,
        ),
      onError: (err) => showError(resolveFrappeError(err, { doctype: "Journal Entry" })),
    },
  );

  const onSubmit = useCallback(async () => {
    if (!isBalanced) {
      toast.error("Voucher is not balanced. Debits must equal Credits.");
      return;
    }
    const values = getValues();
    await createMutation.mutateAsync({ ...values, company: getActiveCompany() });
  }, [isBalanced, getValues, createMutation]);

  return (
    <div className="space-y-8 pb-24 max-w-7xl mx-auto">
      <PageHeader
        title="New Journal Entry"
        subtitle="Record manual ledger adjustments and opening balances"
        backUrl="/accounting/journal-entry"
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
            onSubmit={onSubmit}
            onCancel={() => router.back()}
            submitLabel="Create Entry"
            submittingLabel="Creating..."
            renderStep={(s) => {
              if (s.id === "step1") {
                return (
                  <div className="space-y-6">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                        <BookOpen className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-foreground">General Information</h3>
                        <p className="text-sm text-muted-foreground">Set the company, voucher type, and posting date.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <FormSelect
                        control={control}
                        name="voucher_type"
                        label="Voucher Type"
                        required
                        options={[
                          { value: "Journal Entry", label: "Journal Entry" },
                          { value: "Bank Entry", label: "Bank Entry" },
                          { value: "Cash Entry", label: "Cash Entry" },
                          { value: "Opening Entry", label: "Opening Entry" },
                        ]}
                      />
                      <FormDatePicker
                        control={control}
                        name="posting_date"
                        label="Posting Date"
                        required
                      />
                    </div>
                  </div>
                );
              }

              return (
                <div className="space-y-6">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                      <ArrowRightCircle className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">Accounting Entries</h3>
                      <p className="text-sm text-muted-foreground">Add debit and credit lines with optional party allocation.</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-card/50 backdrop-blur-sm overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-secondary/20 border-b border-border">
                          <tr>
                            <th className="px-6 py-4 font-black text-muted-foreground uppercase tracking-widest text-[10px] w-[35%]">
                              Account
                            </th>
                            <th className="px-6 py-4 font-black text-muted-foreground uppercase tracking-widest text-[10px] w-[20%]">
                              Party (Optional)
                            </th>
                            <th className="px-6 py-4 font-black text-muted-foreground uppercase tracking-widest text-[10px] w-[15%] text-right">
                              Debit
                            </th>
                            <th className="px-6 py-4 font-black text-muted-foreground uppercase tracking-widest text-[10px] w-[15%] text-right">
                              Credit
                            </th>
                            <th className="px-6 py-4 w-12 text-right"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {fields.map((field, index) => (
                            <tr
                              key={field.id}
                              className="group hover:bg-primary/5 transition-colors"
                            >
                              <td className="p-4 align-top">
                                <FormFrappeSelect
                                  control={control}
                                  name={`accounts.${index}.account`}
                                  doctype="Account"
                                  placeholder="Select account..."
                                  hideLabel
                                  filters={[["is_group", "=", 0]]}
                                  className="h-10 rounded-xl bg-secondary/30 border-0"
                                />
                              </td>
                              <td className="p-4 align-top space-y-2">
                                <FormSelect
                                  control={control}
                                  name={`accounts.${index}.party_type`}
                                  options={[
                                    { value: "", label: "No Party" },
                                    { value: "Customer", label: "Customer" },
                                    { value: "Supplier", label: "Supplier" },
                                  ]}
                                  hideLabel
                                  className="h-9 rounded-xl bg-secondary/20 border-0 text-[10px]"
                                />
                                {watch(`accounts.${index}.party_type`) && (
                                  <FormFrappeSelect
                                    control={control}
                                    name={`accounts.${index}.party`}
                                    doctype={
                                      watch(`accounts.${index}.party_type`) || ""
                                    }
                                    placeholder="Select party..."
                                    hideLabel
                                    className="h-9 rounded-xl bg-secondary/20 border-0 text-[10px]"
                                  />
                                )}
                              </td>
                              <td className="p-4 align-top">
                                <FormField
                                  control={control}
                                  name={`accounts.${index}.debit`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input
                                          {...field}
                                          type="number"
                                          className="h-10 rounded-xl bg-secondary/30 border-0 text-right font-black"
                                          onChange={(e) =>
                                            field.onChange(Number(e.target.value))
                                          }
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </td>
                              <td className="p-4 align-top">
                                <FormField
                                  control={control}
                                  name={`accounts.${index}.credit`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input
                                          {...field}
                                          type="number"
                                          className="h-10 rounded-xl bg-secondary/30 border-0 text-right font-black"
                                          onChange={(e) =>
                                            field.onChange(Number(e.target.value))
                                          }
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </td>
                              <td className="p-4 align-top text-right">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-10 w-10 rounded-xl text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                                  onClick={() => remove(index)}
                                  disabled={fields.length <= 2}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="p-6 bg-secondary/5 border-t border-border flex justify-between items-center">
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-full px-6 border-dashed"
                        onClick={() =>
                          append({
                            account: "",
                            debit: 0,
                            credit: 0,
                            party_type: "",
                            party: "",
                          })
                        }
                      >
                        <Plus className="h-4 w-4 mr-2" /> Add Row
                      </Button>

                      <div className="flex gap-12 text-right">
                        <div>
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">
                            Total Debit
                          </p>
                          <p className="text-xl font-black text-success">
                            ETB {totals.debit.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">
                            Total Credit
                          </p>
                          <p className="text-xl font-black text-destructive">
                            ETB {totals.credit.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    className={cn(
                      "mt-6 p-6 rounded-2xl border border-border/40 flex items-center justify-between transition-all",
                      isBalanced
                        ? "bg-success/10 border-success/20 text-success"
                        : "bg-destructive/10 border-destructive/20 text-destructive",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {isBalanced ? (
                        <CheckCircle2 className="h-6 w-6" />
                      ) : (
                        <AlertTriangle className="h-6 w-6" />
                      )}
                      <div>
                        <p className="font-black uppercase tracking-widest text-xs">
                          {isBalanced ? "Balanced" : "Unbalanced"}
                        </p>
                        <p className="text-sm font-medium opacity-80">
                          {isBalanced
                            ? "This entry meets the double-entry standards."
                            : `Difference: ETB ${Math.abs(difference).toLocaleString()}`}
                        </p>
                      </div>
                    </div>
                    {!isBalanced && totals.debit > 0 && (
                      <Button
                        type="button"
                        variant="link"
                        className="text-destructive font-black p-0 h-auto"
                        onClick={() => {
                          const lastIdx = fields.length - 1;
                          if (difference > 0) {
                            form.setValue(
                              `accounts.${lastIdx}.credit`,
                              (watchedAccounts?.[lastIdx]?.credit ?? 0) + difference,
                            );
                          } else {
                            form.setValue(
                              `accounts.${lastIdx}.debit`,
                              (watchedAccounts?.[lastIdx]?.debit ?? 0) +
                                Math.abs(difference),
                            );
                          }
                        }}
                      >
                        Auto-Balance →
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border">
                    <FormTextarea
                      control={control}
                      name="user_remark"
                      label="Narration / Remarks"
                      placeholder="Describe the purpose of this entry..."
                      className="min-h-[120px]"
                    />
                    <div className="space-y-6">
                      <FormInput
                        control={control}
                        name="cheque_no"
                        label="Reference / Cheque #"
                        placeholder="Internal ref or check number..."
                      />
                      <FormDatePicker
                        control={control}
                        name="cheque_date"
                        label="Reference Date"
                      />
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
