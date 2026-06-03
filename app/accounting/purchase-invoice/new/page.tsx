"use client";

import { useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Trash2,
  Loader2,
  Briefcase,
  Package,
  CreditCard,
  Truck,
} from "lucide-react";
import { useFrappeCreate } from "@/hooks/generic";
import { PageHeader } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import { FormFrappeSelect, FormDatePicker } from "@/components/form";
import { PurchaseInvoiceCreateSchema } from "@/lib/schemas/doctype-schemas";
import type { PurchaseInvoice } from "@/types/doctype-types";

export default function CreatePurchaseInvoicePage() {
  const router = useRouter();

  const form = useForm({
    resolver: zodResolver(PurchaseInvoiceCreateSchema),
    defaultValues: {
      naming_series: "ACC-PINV-.YYYY.-",
      supplier: "",
      posting_date: new Date().toISOString().split("T")[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      company: "",
      currency: "ETB",
      conversion_rate: 1,
      credit_to: "", // Accounts Payable
      cost_center: "",
      items: [{ item_code: "", description: "", qty: 1, rate: 0 }],
      taxes_and_charges: "",
      payment_terms_template: "",
    },
  });

  const { control, handleSubmit } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const watchedItems = useWatch({ control, name: "items" });

  const subtotal = useMemo(() => {
    if (!watchedItems || !Array.isArray(watchedItems)) return 0;
    return watchedItems.reduce((acc, item) => {
      const qty = Number(item?.qty) || 0;
      const rate = Number(item?.rate) || 0;
      return acc + qty * rate;
    }, 0);
  }, [watchedItems]);

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat("en-ET", {
      style: "currency",
      currency: "ETB",
    }).format(amount || 0);
  }, []);

  const createMutation = useFrappeCreate<{ data: PurchaseInvoice }, any>(
    "Purchase Invoice",
    {
      onSuccess: (data) =>
        router.push(
          `/accounting/purchase-invoice/${encodeURIComponent(data.data.name)}`,
        ),
    },
  );

  const onSubmit = async (values: any) => {
    const validItems = (values.items || []).filter(
      (item: any) => item.item_code && item.qty > 0,
    );

    if (validItems.length === 0) {
      form.setError("items", {
        type: "manual",
        message: "At least one item is required",
      });
      return;
    }

    await createMutation.mutateAsync({ ...values, items: validItems });
  };

  return (
    <div className="space-y-8 pb-24 max-w-7xl mx-auto">
      <PageHeader
        title="New Vendor Bill"
        subtitle="Record a new purchase invoice and track your liabilities"
        backUrl="/accounting/purchase-invoice"
      />

      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <InfoCard
            title="Supplier & Timeline"
            icon={<Truck className="h-4 w-4" />}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormFrappeSelect
                control={control}
                name="company"
                label="Company"
                required
                doctype="Company"
                labelField="company_name"
                placeholder="Select company..."
              />
              <FormFrappeSelect
                control={control}
                name="supplier"
                label="Supplier"
                required
                doctype="Supplier"
                labelField="supplier_name"
                placeholder="Search suppliers..."
              />
              <FormDatePicker
                control={control}
                name="posting_date"
                label="Bill Date"
                required
              />
              <FormDatePicker
                control={control}
                name="due_date"
                label="Payment Due Date"
                required
              />
            </div>
          </InfoCard>

          <InfoCard
            title="Financial Controls"
            icon={<CreditCard className="h-4 w-4" />}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormFrappeSelect
                control={control}
                name="credit_to"
                label="Payable Account (Credit To)"
                required
                doctype="Account"
                filters={[
                  ["account_type", "=", "Payable"],
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
          </InfoCard>

          <InfoCard title="Bill Items" icon={<Package className="h-4 w-4" />}>
            <div className="rounded-[2rem] border border-border bg-card/50 backdrop-blur-sm overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-secondary/20 border-b border-border">
                    <tr>
                      <th className="px-6 py-4 font-black text-muted-foreground uppercase tracking-widest text-[10px] w-[30%]">
                        Item / Expense
                      </th>
                      <th className="px-6 py-4 font-black text-muted-foreground uppercase tracking-widest text-[10px] w-[40%]">
                        Description
                      </th>
                      <th className="px-4 py-4 font-black text-muted-foreground uppercase tracking-widest text-[10px] w-[10%] text-right">
                        Qty
                      </th>
                      <th className="px-4 py-4 font-black text-muted-foreground uppercase tracking-widest text-[10px] w-[15%] text-right">
                        Rate (ETB)
                      </th>
                      <th className="px-6 py-4 w-12 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {fields.map((field, index) => (
                      <tr
                        key={field.id}
                        className="group hover:bg-rose-500/5 transition-colors"
                      >
                        <td className="p-4 align-top">
                          <FormFrappeSelect
                            control={control}
                            name={`items.${index}.item_code`}
                            doctype="Item"
                            placeholder="Search item..."
                            hideLabel
                            className="h-10 rounded-xl bg-secondary/30 border-0"
                          />
                        </td>
                        <td className="p-4 align-top">
                          <FormField
                            control={control}
                            name={`items.${index}.description`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Textarea
                                    {...field}
                                    className="min-h-[80px] rounded-xl bg-secondary/30 border-0 text-sm resize-none focus:bg-card transition-all"
                                    placeholder="Details..."
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </td>
                        <td className="p-4 align-top">
                          <FormField
                            control={control}
                            name={`items.${index}.qty`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="number"
                                    min="0"
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
                        <td className="p-4 align-top">
                          <FormField
                            control={control}
                            name={`items.${index}.rate`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="number"
                                    min="0"
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
                        <td className="p-4 align-top text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 rounded-xl text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                            onClick={() => remove(index)}
                            disabled={fields.length === 1}
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
                    append({ item_code: "", description: "", qty: 1, rate: 0 })
                  }
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Line
                </Button>

                <div className="text-right">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">
                    Total (Net)
                  </p>
                  <p className="text-3xl font-black text-rose-600">
                    {formatCurrency(subtotal)}
                  </p>
                </div>
              </div>
            </div>
          </InfoCard>

          <div className="flex justify-end gap-3 sticky bottom-6 z-10 glass-card p-4 rounded-[2rem] shadow-2xl">
            <Button
              type="button"
              variant="outline"
              className="rounded-full px-10"
              onClick={() => router.push("/accounting/purchase-invoice")}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-full px-12 shadow-lg shadow-primary/20 bg-rose-600 hover:bg-rose-700 text-white"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Save Bill
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
