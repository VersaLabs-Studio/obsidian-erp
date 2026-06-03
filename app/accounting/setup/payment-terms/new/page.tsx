"use client";

import { useMemo } from "react";
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
import {
  Plus,
  Trash2,
  Loader2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { useFrappeCreate } from "@/hooks/generic";
import { PageHeader } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import { FormSelect, FormSwitch, FormInput } from "@/components/form";
import { PaymentTermsTemplateCreateSchema } from "@/lib/schemas/doctype-schemas";
import type { PaymentTermsTemplate } from "@/types/doctype-types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function CreatePaymentTermsPage() {
  const router = useRouter();

  const form = useForm({
    resolver: zodResolver(PaymentTermsTemplateCreateSchema),
    defaultValues: {
      template_name: "",
      allocate_payment_based_on_payment_terms: 0,
      terms: [
        {
          payment_term: "",
          invoice_portion: 100,
          due_date_based_on: "Day(s) after invoice date",
          credit_days: 30,
        },
      ],
    },
  });

  const { control, handleSubmit } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "terms" });

  const watchedTerms = useWatch({ control, name: "terms" });

  const totalPortion = useMemo(() => {
    if (!watchedTerms) return 0;
    return watchedTerms.reduce(
      (sum, term) => sum + (Number(term?.invoice_portion) || 0),
      0,
    );
  }, [watchedTerms]);

  const isValidPortion = Math.abs(totalPortion - 100) < 0.01;

  const createMutation = useFrappeCreate<{ data: PaymentTermsTemplate }, any>(
    "Payment Terms Template",
    {
      onSuccess: () => {
        toast.success("Payment Terms Template created");
        router.push("/accounting/setup/payment-terms");
      },
    },
  );

  const onSubmit = async (values: any) => {
    if (!isValidPortion) {
      toast.error("Total invoice portion must equal 100%.");
      return;
    }
    await createMutation.mutateAsync(values);
  };

  return (
    <div className="space-y-8 pb-24 max-w-6xl mx-auto">
      <PageHeader
        title="New Payment Terms Template"
        subtitle="Define how payments should be scheduled for invoices"
        backUrl="/accounting/setup/payment-terms"
      />

      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <InfoCard
            title="Template Info"
            icon={<FileText className="h-4 w-4" />}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FormInput
                control={control}
                name="template_name"
                label="Template Name"
                required
                placeholder="e.g. Net 30 Days"
              />
              <div className="p-6 rounded-[2rem] bg-indigo-500/5 border border-indigo-500/10 flex items-center h-full">
                <FormSwitch
                  control={control}
                  name="allocate_payment_based_on_payment_terms"
                  label="Allocate Payment Based on Terms"
                  description="Automatically split payments matching these terms"
                />
              </div>
            </div>
          </InfoCard>

          <InfoCard
            title="Payment Schedule (Terms)"
            icon={<Clock className="h-4 w-4" />}
          >
            <div className="rounded-[2.5rem] border border-border bg-card/50 backdrop-blur-sm overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-secondary/20 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-black text-muted-foreground uppercase tracking-widest text-[10px] w-[20%]">
                      Payment Term
                    </th>
                    <th className="px-6 py-4 font-black text-muted-foreground uppercase tracking-widest text-[10px] w-[15%] text-right">
                      Portion (%)
                    </th>
                    <th className="px-6 py-4 font-black text-muted-foreground uppercase tracking-widest text-[10px] w-[35%]">
                      Due Date Based On
                    </th>
                    <th className="px-6 py-4 font-black text-muted-foreground uppercase tracking-widest text-[10px] w-[20%] text-right">
                      Credit Days
                    </th>
                    <th className="px-6 py-4 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {fields.map((term, index) => (
                    <tr
                      key={term.id}
                      className="group hover:bg-indigo-500/5 transition-colors"
                    >
                      <td className="p-4">
                        <FormInput
                          control={control as any}
                          name={`terms.${index}.payment_term`}
                          placeholder="Description..."
                          hideLabel
                          className="h-10 rounded-xl bg-secondary/30 border-0 font-bold"
                        />
                      </td>
                      <td className="p-4 text-right font-black">
                        <FormField
                          control={control}
                          name={`terms.${index}.invoice_portion`}
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
                      <td className="p-4">
                        <FormSelect
                          control={control as any}
                          name={`terms.${index}.due_date_based_on`}
                          options={[
                            {
                              value: "Day(s) after invoice date",
                              label: "Days after invoice date",
                            },
                            {
                              value:
                                "Day(s) after the end of the invoice month",
                              label: "Days after end of month",
                            },
                            {
                              value:
                                "Month(s) after the end of the invoice month",
                              label: "Months after end of month",
                            },
                          ]}
                          hideLabel
                          className="h-10 rounded-xl bg-secondary/30 border-0"
                        />
                      </td>
                      <td className="p-4 text-right">
                        <FormField
                          control={control}
                          name={`terms.${index}.credit_days`}
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
                      <td className="p-4 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 rounded-xl text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all font-black"
                          onClick={() => remove(index)}
                          disabled={fields.length <= 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-6 border-t border-border bg-secondary/5 flex justify-between items-center">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full px-6 border-dashed"
                  onClick={() =>
                    append({
                      payment_term: "",
                      invoice_portion: 0,
                      due_date_based_on: "Day(s) after invoice date",
                      credit_days: 0,
                    })
                  }
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Term
                </Button>

                <div
                  className={cn(
                    "flex items-center gap-3 px-6 py-3 rounded-2xl border-2 transition-all font-black",
                    isValidPortion
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700"
                      : "bg-rose-500/10 border-rose-500/20 text-rose-700 shadow-lg shadow-rose-500/10",
                  )}
                >
                  {isValidPortion ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <AlertTriangle className="h-5 w-5" />
                  )}
                  <span className="text-sm uppercase tracking-widest">
                    Total Portion: {totalPortion}%
                  </span>
                </div>
              </div>
            </div>
          </InfoCard>

          <div className="flex justify-end gap-3 sticky bottom-6 z-10 glass-card p-4 rounded-[2rem] shadow-2xl">
            <Button
              type="button"
              variant="outline"
              className="rounded-full px-10"
              onClick={() => router.push("/accounting/setup/payment-terms")}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-full px-12 shadow-lg shadow-primary/20 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[11px]"
              disabled={createMutation.isPending || !isValidPortion}
            >
              {createMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Create Template
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
