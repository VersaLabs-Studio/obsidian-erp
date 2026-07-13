// app/accounting/purchase-invoice/[name]/edit/page.tsx
// Obsidian ERP v4.0 — Edit Purchase Invoice (V4 pattern, 2Y-R3).
// Mirrors the Sales Invoice edit page: Form provider + InfoCard + fields.
// Includes the pana_fs_number (FS No) custom field for editing.

"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { toast } from "sonner";
import {
  UserRound,
  Package,
  ClipboardCheck,
  Plus,
  Trash2,
  Loader2,
} from "lucide-react";

import { PageHeader, LoadingState } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FormInput,
  FormFrappeSelect,
  FormDatePicker,
} from "@/components/form";
import { Form, FormField, FormItem, FormControl } from "@/components/ui/form";
import { useFrappeDoc, useFrappeUpdate } from "@/hooks/generic";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import { GuidedErrorDialog, useGuidedError } from "@/components/errors/GuidedErrorDialog";
import { getActiveCompany } from "@/lib/settings/company";
import type { PurchaseInvoice } from "@/types/doctype-types";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Form model — matches the PI new page's PIForm interface (key fields).
// ---------------------------------------------------------------------------
interface PIItem {
  item_code: string;
  item_name?: string;
  description?: string;
  qty: number;
  rate: number;
  amount?: number;
  uom?: string;
  purchase_order?: string;
  purchase_receipt?: string;
}

interface PIForm {
  naming_series: string;
  supplier: string;
  supplier_name?: string;
  company: string;
  posting_date: string;
  due_date: string;
  bill_no?: string;
  bill_date?: string;
  pana_fs_number?: string; // 2Y-R3 — FS No (custom field)
  currency: string;
  conversion_rate: number;
  credit_to: string;
  cost_center?: string;
  items: PIItem[];
}

const ETB = new Intl.NumberFormat("en-ET", {
  style: "currency",
  currency: "ETB",
});

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function EditPurchaseInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(String(params.name));
  const { resolution, showError, dismiss } = useGuidedError();

  const { data: invoice, isLoading, error } = useFrappeDoc<PurchaseInvoice>(
    "Purchase Invoice",
    name,
  );

  const form = useForm<PIForm>({
    defaultValues: {
      naming_series: "ACC-PINV-.YYYY.-",
      supplier: "",
      posting_date: "",
      due_date: "",
      bill_no: "",
      bill_date: "",
      pana_fs_number: "",
      currency: "ETB",
      conversion_rate: 1,
      credit_to: "",
      cost_center: "",
      items: [],
    },
  });

  const { control, getValues, reset } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedAll = useWatch({ control });
  const watchedItems = watchedAll?.items ?? [];

  // Hydrate form from the loaded invoice
  useEffect(() => {
    if (!invoice) return;
    const invoiceItems = (invoice.items ?? []) as Array<{
      item_code?: string;
      item_name?: string;
      description?: string;
      qty?: number;
      rate?: number;
      amount?: number;
      uom?: string;
      purchase_order?: string;
      purchase_receipt?: string;
    }>;
    reset({
      naming_series: invoice.naming_series || "ACC-PINV-.YYYY.-",
      supplier: invoice.supplier || "",
      supplier_name: invoice.supplier_name || "",
      company: invoice.company || "",
      posting_date: invoice.posting_date || "",
      due_date: invoice.due_date || "",
      bill_no: invoice.bill_no || "",
      bill_date: invoice.bill_date || "",
      pana_fs_number: (invoice as { pana_fs_number?: string }).pana_fs_number || "",
      currency: invoice.currency || "ETB",
      conversion_rate: invoice.conversion_rate || 1,
      credit_to: invoice.credit_to || "",
      cost_center: invoice.cost_center || "",
      items: invoiceItems.map((it) => ({
        item_code: it.item_code || "",
        item_name: it.item_name || "",
        description: it.description || "",
        qty: it.qty || 0,
        rate: it.rate || 0,
        amount: it.amount || 0,
        uom: it.uom || "Nos",
        purchase_order: it.purchase_order || "",
        purchase_receipt: it.purchase_receipt || "",
      })),
    });
  }, [invoice, reset]);

  // Live subtotal
  const subtotal = useMemo(
    () =>
      (watchedItems ?? []).reduce(
        (sum, it) => sum + (Number(it?.qty) || 0) * (Number(it?.rate) || 0),
        0,
      ),
    [watchedItems],
  );

  // Persistence
  const updateMutation = useFrappeUpdate<{ data: PurchaseInvoice }, { name: string; data: Partial<PurchaseInvoice> }>(
    "Purchase Invoice",
    {
      onSuccess: () => {
        router.push(`/accounting/purchase-invoice/${encodeURIComponent(name)}`);
      },
      successMessage: "Purchase Invoice updated successfully",
      onError: (err) => {
        showError(resolveFrappeError(err, { doctype: "Purchase Invoice" }));
      },
    },
  );

  const handleSubmit = useCallback(() => {
    const values = getValues();
    const items = (values.items ?? []).filter(
      (it) => it.item_code && Number(it.qty) > 0,
    );
    if (items.length === 0) {
      toast.error("Add at least one valid item before saving.");
      return;
    }
    updateMutation.mutate({
      name,
      data: {
        supplier: values.supplier,
        posting_date: values.posting_date,
        due_date: values.due_date,
        bill_no: values.bill_no || undefined,
        bill_date: values.bill_date || undefined,
        pana_fs_number: values.pana_fs_number || undefined,
        currency: values.currency,
        conversion_rate: values.conversion_rate,
        credit_to: values.credit_to || undefined,
        cost_center: values.cost_center || undefined,
        items: items.map((it) => ({
          item_code: it.item_code,
          item_name: it.item_name,
          description: it.description,
          qty: it.qty,
          rate: it.rate,
          amount: (Number(it.qty) || 0) * (Number(it.rate) || 0),
          uom: it.uom,
          purchase_order: it.purchase_order || undefined,
          purchase_receipt: it.purchase_receipt || undefined,
        })),
      } as Partial<PurchaseInvoice>,
    });
  }, [updateMutation, getValues, name]);

  if (isLoading) return <LoadingState type="detail" />;
  if (error || !invoice) {
    return (
      <div className="flex items-center justify-center h-64 bg-destructive/5 rounded-xl border border-destructive/20 p-6">
        <p className="text-destructive">Purchase Invoice not found</p>
      </div>
    );
  }

  const isDraft = invoice.docstatus === 0;

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={`Edit: ${invoice.name}`}
        subtitle={invoice.supplier_name || invoice.supplier}
        backHref={`/accounting/purchase-invoice/${encodeURIComponent(name)}`}
      />

      {!isDraft && (
        <div className="flex items-center gap-3 p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20">
          <Loader2 className="h-5 w-5 text-amber-500" />
          <div>
            <p className="font-medium text-amber-600 dark:text-amber-400">Submitted Invoice</p>
            <p className="text-sm text-muted-foreground">
              This invoice has been submitted. Only limited fields can be edited.
            </p>
          </div>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Header fields */}
              <InfoCard title="Invoice Details" icon={<UserRound className="h-4 w-4 text-primary" />}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <FormFrappeSelect
                      control={control}
                      name="supplier"
                      label="Supplier"
                      required
                      doctype="Supplier"
                      labelField="supplier_name"
                      placeholder="Supplier name..."
                      disabled={isDraft === false}
                    />
                  </div>
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
                  <FormInput
                    control={control}
                    name="bill_no"
                    label="Supplier Bill No"
                    placeholder="Vendor's invoice number"
                  />
                  <FormDatePicker
                    control={control}
                    name="bill_date"
                    label="Supplier Bill Date"
                  />
                  {/* 2Y-R3 — FS No (custom field) editable in edit form */}
                  <FormInput
                    control={control}
                    name="pana_fs_number"
                    label="FS No"
                    placeholder="Fiscal serial number"
                  />
                  <FormFrappeSelect
                    control={control}
                    name="credit_to"
                    label="Credit To (Payable Account)"
                    required
                    doctype="Account"
                    labelField="account_name"
                    filters={[
                      ["account_type", "=", "Payable"],
                      ["company", "=", getActiveCompany()],
                      ["is_group", "=", 0],
                    ]}
                  />
                </div>
              </InfoCard>

              {/* Items table */}
              <InfoCard title="Invoice Items" icon={<Package className="h-4 w-4 text-primary" />}>
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
                              <FormFrappeSelect
                                control={control}
                                name={`items.${index}.item_code`}
                                hideLabel
                                doctype="Item"
                                labelField="item_name"
                                placeholder="Item..."
                                filters={[["is_purchase_item", "=", 1]]}
                                onValueChange={(val, doc) => {
                                  if (doc) {
                                    form.setValue(
                                      `items.${index}.item_name`,
                                      doc.item_name ?? val,
                                    );
                                    if (doc.stock_uom)
                                      form.setValue(`items.${index}.uom`, doc.stock_uom);
                                  }
                                }}
                              />
                            </td>
                            <td className="px-3 py-2 align-top">
                              <FormField
                                control={control}
                                name={`items.${index}.qty`}
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
                            <td className="px-3 py-2 align-top">
                              <FormField
                                control={control}
                                name={`items.${index}.rate`}
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
                      onClick={() => append({ item_code: "", qty: 1, rate: 0, uom: "Nos" })}
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
              </InfoCard>
            </div>

            {/* Sidebar - Actions */}
            <div className="space-y-6">
              <InfoCard title="Actions" variant="gradient">
                <div className="space-y-3">
                  <Button
                    type="submit"
                    className="w-full rounded-xl"
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-xl"
                    onClick={() => router.push(`/accounting/purchase-invoice/${encodeURIComponent(name)}`)}
                  >
                    Cancel
                  </Button>
                </div>
              </InfoCard>

              {/* Summary */}
              <InfoCard title="Summary">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <span className="font-medium">{invoice.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Grand Total</span>
                    <span className="font-medium tabular-nums">{ETB.format(invoice.grand_total ?? 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Outstanding</span>
                    <span className={cn(
                      "font-medium tabular-nums",
                      (invoice.outstanding_amount ?? 0) > 0 ? "text-amber-500" : "text-emerald-500"
                    )}>
                      {ETB.format(invoice.outstanding_amount ?? 0)}
                    </span>
                  </div>
                </div>
              </InfoCard>
            </div>
          </div>
        </form>
      </Form>

      <GuidedErrorDialog resolution={resolution} onDismiss={dismiss} />
    </div>
  );
}
