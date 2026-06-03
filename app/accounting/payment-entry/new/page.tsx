"use client";

import { useMemo, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  Briefcase,
  Landmark,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightCircle,
  AlertCircle,
  FileText,
} from "lucide-react";
import { useFrappeCreate, useFrappeDoc, useFrappeList } from "@/hooks/generic";
import { PageHeader, LoadingState } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import {
  FormSelect,
  FormFrappeSelect,
  FormDatePicker,
} from "@/components/form";
import { PaymentEntryCreateSchema } from "@/lib/schemas/doctype-schemas";
import type {
  PaymentEntry,
  Customer,
  Supplier,
  SalesInvoice,
  PurchaseInvoice,
} from "@/types/doctype-types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function CreatePaymentEntryForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initial values from URL
  const initialInvoice = searchParams.get("invoice");
  const initialPartyType = searchParams.get("party_type") as
    | "Customer"
    | "Supplier"
    | null;
  const initialParty = searchParams.get("party");
  const initialAmount = parseFloat(searchParams.get("amount") || "0");
  const initialPaymentType = searchParams.get("payment_type") as
    | "Receive"
    | "Pay"
    | "Internal Transfer"
    | null;

  const form = useForm({
    resolver: zodResolver(PaymentEntryCreateSchema),
    defaultValues: {
      naming_series: "ACC-PAY-.YYYY.-",
      payment_type:
        initialPaymentType ||
        (initialPartyType === "Supplier" ? "Pay" : "Receive"),
      posting_date: new Date().toISOString().split("T")[0],
      company: "",
      party_type: initialPartyType || "Customer",
      party: initialParty || "",
      paid_from: "",
      paid_to: "",
      paid_amount: initialAmount || 0,
      received_amount: initialAmount || 0,
      mode_of_payment: "Cash",
      references: initialInvoice
        ? [
            {
              reference_doctype:
                initialPartyType === "Supplier"
                  ? "Purchase Invoice"
                  : "Sales Invoice",
              reference_name: initialInvoice,
              allocated_amount: initialAmount,
            },
          ]
        : [],
      remarks: initialInvoice ? `Settlement for ${initialInvoice}` : "",
    },
  });

  const { control, handleSubmit, watch, setValue } = form;
  const { fields, append, remove } = useFieldArray({
    control,
    name: "references",
  });

  const watchedPaymentType = watch("payment_type");
  const watchedPartyType = watch("party_type");
  const watchedParty = watch("party");
  const watchedPaidAmount = watch("paid_amount");

  // Sync received amount with paid amount for standard ETB transactions
  useEffect(() => {
    setValue("received_amount", watchedPaidAmount);
  }, [watchedPaidAmount, setValue]);

  // Fetch Party Details for default account
  const { data: customerData } = useFrappeDoc<Customer>(
    "Customer",
    watchedParty || "",
    {
      enabled: watchedPartyType === "Customer" && !!watchedParty,
    },
  );
  const { data: supplierData } = useFrappeDoc<Supplier>(
    "Supplier",
    watchedParty || "",
    {
      enabled: watchedPartyType === "Supplier" && !!watchedParty,
    },
  );

  // Fetch Invoice Details if we have references but no accounts
  useEffect(() => {
    if (watchedPartyType === "Customer" && customerData) {
      if (watchedPaymentType === "Receive") {
        // setValue("paid_from", customerData.receivable_account || "");
      } else if (watchedPaymentType === "Pay") {
        // setValue("paid_to", customerData.receivable_account || "");
      }
    }
    if (watchedPartyType === "Supplier" && supplierData) {
      if (watchedPaymentType === "Pay") {
        // setValue("paid_to", supplierData.payable_account || "");
      }
    }
  }, [
    watchedPartyType,
    customerData,
    supplierData,
    watchedPaymentType,
    setValue,
  ]);

  const createMutation = useFrappeCreate<{ data: PaymentEntry }, any>(
    "Payment Entry",
    {
      onSuccess: (data) =>
        router.push(
          `/accounting/payment-entry/${encodeURIComponent(data.data.name)}`,
        ),
    },
  );

  const onSubmit = async (values: any) => {
    await createMutation.mutateAsync(values);
    toast.success("Payment recorded successfully");
  };

  return (
    <div className="space-y-8 pb-24 max-w-7xl mx-auto">
      <PageHeader
        title="New Payment Entry"
        subtitle="Record a financial transaction and allocate it to invoices"
        backUrl="/accounting/payment-entry"
      />

      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <InfoCard
            title="Transaction Type & Party"
            icon={<ArrowRightCircle className="h-4 w-4" />}
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
              <FormFrappeSelect
                control={control}
                name="party"
                label="Party Name"
                doctype={watchedPartyType ?? ""}
                labelField={
                  watchedPartyType === "Customer"
                    ? "customer_name"
                    : watchedPartyType === "Supplier"
                      ? "supplier_name"
                      : "name"
                }
                disabled={watchedPaymentType === "Internal Transfer"}
              />
            </div>
          </InfoCard>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <InfoCard
              title="Inflow/Outflow Accounts"
              icon={<Landmark className="h-4 w-4" />}
            >
              <div className="space-y-6">
                <FormFrappeSelect
                  control={control}
                  name="paid_from"
                  label="Account Paid From (Source)"
                  required
                  doctype="Account"
                  filters={[["is_group", "=", 0]]}
                  placeholder="Select source account..."
                />
                <FormFrappeSelect
                  control={control}
                  name="paid_to"
                  label="Account Paid To (Destination)"
                  required
                  doctype="Account"
                  filters={[["is_group", "=", 0]]}
                  placeholder="Select destination account..."
                />
              </div>
            </InfoCard>

            <InfoCard
              title="Amount & Mode"
              icon={<Wallet className="h-4 w-4" />}
            >
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={control}
                    name="paid_amount"
                    render={({ field }) => (
                      <FormItem>
                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-2">
                          Paid Amount
                        </p>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            className="h-12 rounded-2xl bg-secondary/30 border-0 text-right font-black text-xl"
                            onChange={(e) =>
                              field.onChange(Number(e.target.value))
                            }
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={control}
                    name="received_amount"
                    render={({ field }) => (
                      <FormItem>
                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-2">
                          Received Amount
                        </p>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            readOnly
                            className="h-12 rounded-2xl bg-secondary/10 border-0 text-right font-black text-xl opacity-50"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <FormFrappeSelect
                  control={control}
                  name="mode_of_payment"
                  label="Mode of Payment"
                  doctype="Mode of Payment"
                  placeholder="Select mode..."
                />
                <FormDatePicker
                  control={control}
                  name="posting_date"
                  label="Payment Date"
                  required
                />
              </div>
            </InfoCard>
          </div>

          <InfoCard
            title="Invoice Allocations"
            icon={<ArrowDownLeft className="h-4 w-4" />}
          >
            <div className="rounded-[2rem] border border-border bg-card/50 backdrop-blur-sm overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-secondary/20 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-black text-muted-foreground uppercase tracking-widest text-[10px] w-[30%]">
                      Invoice Type
                    </th>
                    <th className="px-6 py-4 font-black text-muted-foreground uppercase tracking-widest text-[10px] w-[40%]">
                      Invoice ID
                    </th>
                    <th className="px-6 py-4 font-black text-muted-foreground uppercase tracking-widest text-[10px] w-[20%] text-right">
                      Allocated
                    </th>
                    <th className="px-6 py-4 w-12 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {fields.map((field, index) => (
                    <tr
                      key={field.id}
                      className="group hover:bg-primary/5 transition-colors"
                    >
                      <td className="p-4">
                        <FormSelect
                          control={control as any}
                          name={`references.${index}.reference_doctype`}
                          options={[
                            { value: "Sales Invoice", label: "Sales Invoice" },
                            {
                              value: "Purchase Invoice",
                              label: "Purchase Invoice",
                            },
                          ]}
                          hideLabel
                          className="h-10 rounded-xl bg-secondary/30 border-0"
                        />
                      </td>
                      <td className="p-4 text-center">
                        <FormField
                          control={control}
                          name={`references.${index}.reference_name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="Invoice ID..."
                                  className="h-10 rounded-xl bg-secondary/30 border-0 text-center font-bold"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </td>
                      <td className="p-4">
                        <FormField
                          control={control}
                          name={`references.${index}.allocated_amount`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="number"
                                  className="h-10 rounded-xl bg-secondary/30 border-0 text-right font-bold"
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
                          className="h-10 w-10 rounded-xl text-destructive hover:bg-destructive/10"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-4 border-t border-border bg-secondary/5">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full px-6 border-dashed"
                  onClick={() =>
                    append({
                      reference_doctype:
                        watchedPartyType === "Supplier"
                          ? "Purchase Invoice"
                          : "Sales Invoice",
                      reference_name: "",
                      allocated_amount: 0,
                    })
                  }
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Reference
                </Button>
              </div>
            </div>
          </InfoCard>

          <InfoCard title="Remarks" icon={<FileText className="h-4 w-4" />}>
            <FormField
              control={control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Internal notes, bank ref, cheque details..."
                      className="min-h-[100px] rounded-[1.5rem] bg-secondary/30 border-0 text-sm resize-none focus:bg-card transition-all"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </InfoCard>

          <div className="flex justify-end gap-3 sticky bottom-6 z-10 glass-card p-4 rounded-[2rem] shadow-2xl">
            <Button
              type="button"
              variant="outline"
              className="rounded-full px-10"
              onClick={() => router.push("/accounting/payment-entry")}
            >
              Discard
            </Button>
            <Button
              type="submit"
              className="rounded-full px-12 shadow-lg shadow-primary/20"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Save Payment
            </Button>
          </div>
        </form>
      </Form>
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
