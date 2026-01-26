"use client";

import { useMemo, useCallback } from "react";
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
import { InfoCard } from "@/components/ui/info-card";
import {
  FormFrappeSelect,
  FormSelect,
  FormDatePicker,
} from "@/components/form";
import { JournalEntryCreateSchema } from "@/lib/schemas/doctype-schemas";
import type { JournalEntry } from "@/types/doctype-types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function CreateJournalEntryPage() {
  const router = useRouter();

  const form = useForm({
    resolver: zodResolver(JournalEntryCreateSchema),
    defaultValues: {
      naming_series: "ACC-JV-.YYYY.-",
      voucher_type: "Journal Entry",
      posting_date: new Date().toISOString().split("T")[0],
      company: "",
      accounts: [
        { account: "", debit: 0, credit: 0, party_type: "", party: "" },
        { account: "", debit: 0, credit: 0, party_type: "", party: "" },
      ],
      user_remark: "",
      cheque_no: "",
      cheque_date: "",
    },
  });

  const { control, handleSubmit, watch } = form;
  const { fields, append, remove } = useFieldArray({
    control,
    name: "accounts",
  });

  const watchedAccounts = useWatch({ control, name: "accounts" });

  const totals = useMemo(() => {
    if (!watchedAccounts || !Array.isArray(watchedAccounts))
      return { debit: 0, credit: 0 };
    return watchedAccounts.reduce(
      (acc, curr) => ({
        debit: acc.debit + (Number(curr?.debit) || 0),
        credit: acc.credit + (Number(curr?.credit) || 0),
      }),
      { debit: 0, credit: 0 },
    );
  }, [watchedAccounts]);

  const difference = totals.debit - totals.credit;
  const isBalanced = Math.abs(difference) < 0.01 && totals.debit > 0;

  const createMutation = useFrappeCreate<{ data: JournalEntry }, any>(
    "Journal Entry",
    {
      onSuccess: (data) =>
        router.push(
          `/accounting/journal-entry/${encodeURIComponent(data.data.name)}`,
        ),
    },
  );

  const onSubmit = async (values: any) => {
    if (!isBalanced) {
      toast.error("Voucher is not balanced. Debits must equal Credits.");
      return;
    }
    await createMutation.mutateAsync(values);
  };

  return (
    <div className="space-y-8 pb-24 max-w-7xl mx-auto">
      <PageHeader
        title="New Journal Entry"
        subtitle="Record manual ledger adjustments and opening balances"
        backUrl="/accounting/journal-entry"
      />

      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <InfoCard
            title="General Information"
            icon={<BookOpen className="h-4 w-4" />}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormFrappeSelect
                control={control}
                name="company"
                label="Company"
                required
                doctype="Company"
                labelField="company_name"
              />
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
          </InfoCard>

          <InfoCard
            title="Accounting Entries"
            icon={<ArrowRightCircle className="h-4 w-4" />}
          >
            <div className="rounded-[2.5rem] border border-border bg-card/50 backdrop-blur-sm overflow-hidden shadow-sm">
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
                        className="group hover:bg-blue-500/5 transition-colors"
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
                              doctype={watch(`accounts.${index}.party_type`)}
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
                    <p className="text-xl font-black text-emerald-600">
                      ETB {totals.debit.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">
                      Total Credit
                    </p>
                    <p className="text-xl font-black text-rose-600">
                      ETB {totals.credit.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div
              className={cn(
                "mt-6 p-6 rounded-[1.5rem] border-2 flex items-center justify-between transition-all",
                isBalanced
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700"
                  : "bg-rose-500/10 border-rose-500/20 text-rose-700",
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
                  className="text-rose-700 font-black p-0 h-auto"
                  onClick={() => {
                    const lastIdx = fields.length - 1;
                    if (difference > 0) {
                      form.setValue(
                        `accounts.${lastIdx}.credit`,
                        watchedAccounts[lastIdx].credit + difference,
                      );
                    } else {
                      form.setValue(
                        `accounts.${lastIdx}.debit`,
                        watchedAccounts[lastIdx].debit + Math.abs(difference),
                      );
                    }
                  }}
                >
                  Auto-Balance →
                </Button>
              )}
            </div>
          </InfoCard>

          <InfoCard
            title="Remarks & Reference"
            icon={<Wallet className="h-4 w-4" />}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          </InfoCard>

          <div className="flex justify-end gap-3 sticky bottom-6 z-10 glass-card p-4 rounded-[2rem] shadow-2xl">
            <Button
              type="button"
              variant="outline"
              className="rounded-full px-10"
              onClick={() => router.push("/accounting/journal-entry")}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-full px-12 shadow-lg shadow-primary/20 bg-blue-600 hover:bg-blue-700 text-white"
              disabled={createMutation.isPending || !isBalanced}
            >
              {createMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Create Entry
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
