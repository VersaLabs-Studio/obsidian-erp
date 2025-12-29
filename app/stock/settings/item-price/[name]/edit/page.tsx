// app/stock/settings/item-price/[name]/edit/page.tsx
// Pana ERP v1.3 - Edit Item Price (Premium Borderless Design)
"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  useItemPriceQuery,
  useUpdateItemPriceMutation,
  useItemPriceOptionsQuery,
} from "@/hooks/data/useItemPriceQuery";
import {
  ArrowLeft,
  Save,
  DollarSign,
  Package,
  Calendar,
  Loader2,
  Layers,
  Users,
  Clock,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const itemPriceSchema = z.object({
  item_code: z.string().min(1, "Item is required"),
  price_list: z.string().min(1, "Price list is required"),
  price_list_rate: z.coerce.number().min(0, "Rate must be positive"),
  uom: z.string().optional(),
  min_qty: z.coerce.number().optional(),
  packing_unit: z.coerce.number().optional(),
  customer: z.string().optional(),
  supplier: z.string().optional(),
  batch_no: z.string().optional(),
  valid_from: z.string().optional(),
  valid_upto: z.string().optional(),
  lead_time_in_days: z.coerce.number().optional(),
  note: z.string().optional(),
});

type ItemPriceFormData = z.infer<typeof itemPriceSchema>;

function DataField({
  label,
  children,
  error,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {children}
      {hint && (
        <p className="text-xs text-muted-foreground/70 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {hint}
        </p>
      )}
      {error && (
        <p className="text-xs text-destructive animate-in slide-in-from-top-1 duration-200">
          {error}
        </p>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-pulse">
      <div className="h-16 bg-muted/60 rounded-full" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <div className="h-80 bg-muted/50 rounded-[2rem]" />
          <div className="h-40 bg-muted/50 rounded-[2rem]" />
        </div>
        <div className="lg:col-span-4 h-60 bg-muted/40 rounded-[2rem]" />
      </div>
    </div>
  );
}

function EditItemPriceContent({ priceName }: { priceName: string }) {
  const router = useRouter();

  const { data: priceData, isLoading } = useItemPriceQuery(priceName);
  const { data: optionsData } = useItemPriceOptionsQuery();
  const updateMutation = useUpdateItemPriceMutation();

  const price = priceData?.data?.item_price;
  const options = optionsData?.data;
  const priceLists = options?.price_lists || [];
  const customers = options?.customers || [];
  const suppliers = options?.suppliers || [];
  const uoms = options?.uoms || [];

  const [selectedPriceList, setSelectedPriceList] = useState<{
    name: string;
    currency: string;
    buying: number;
    selling: number;
  } | null>(null);

  const form = useForm<ItemPriceFormData>({
    resolver: zodResolver(itemPriceSchema),
  });

  useEffect(() => {
    if (price) {
      form.reset({
        item_code: price.item_code,
        price_list: price.price_list,
        price_list_rate: price.price_list_rate,
        uom: price.uom || "",
        min_qty: price.min_qty,
        packing_unit: price.packing_unit,
        customer: price.customer || "",
        supplier: price.supplier || "",
        batch_no: price.batch_no || "",
        valid_from: price.valid_from || "",
        valid_upto: price.valid_upto || "",
        lead_time_in_days: price.lead_time_in_days,
        note: price.note || "",
      });

      const pl = priceLists.find((p) => p.name === price.price_list);
      setSelectedPriceList(pl || null);
    }
  }, [price, priceLists, form]);

  const onSubmit = async (data: ItemPriceFormData) => {
    try {
      await updateMutation.mutateAsync({ name: priceName, data });
      router.push(
        `/stock/settings/item-price/${encodeURIComponent(priceName)}`
      );
    } catch (error) {
      console.error("Failed to update item price:", error);
    }
  };

  const watchedValues = form.watch();
  const originalData = price
    ? {
        item_code: price.item_code,
        price_list: price.price_list,
        price_list_rate: price.price_list_rate,
        uom: price.uom || "",
        min_qty: price.min_qty,
        packing_unit: price.packing_unit,
        customer: price.customer || "",
        supplier: price.supplier || "",
        batch_no: price.batch_no || "",
        valid_from: price.valid_from || "",
        valid_upto: price.valid_upto || "",
        lead_time_in_days: price.lead_time_in_days,
        note: price.note || "",
      }
    : null;

  const hasChanges =
    originalData &&
    JSON.stringify(watchedValues) !== JSON.stringify(originalData);

  if (isLoading || !price) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between sticky top-4 z-20 bg-white/80 backdrop-blur-xl p-2 pr-4 rounded-full shadow-sm animate-in fade-in slide-in-from-top-2 duration-500">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              router.push(
                `/stock/settings/item-price/${encodeURIComponent(priceName)}`
              )
            }
            className="rounded-full h-10 w-10 hover:bg-white"
          >
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </Button>
          <div className="h-8 w-[1px] bg-border/50" />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Editing
            </span>
            <h1 className="text-lg font-bold leading-none truncate max-w-[200px]">
              {price.item_code}
            </h1>
          </div>

          {hasChanges && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 rounded-full animate-in fade-in slide-in-from-left-2 duration-300">
              <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs font-semibold text-amber-600">
                Unsaved
              </span>
            </div>
          )}
        </div>

        <Button
          onClick={form.handleSubmit(onSubmit)}
          disabled={updateMutation.isPending || !hasChanges}
          className="rounded-full px-6 shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50"
        >
          {updateMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Main Form */}
            <div className="lg:col-span-8 space-y-8">
              {/* Core Pricing */}
              <div className="bg-card rounded-[2rem] p-8 shadow-sm animate-in fade-in slide-in-from-left-4 duration-500">
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/70 mb-6 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" /> Pricing
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="item_code"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <DataField label="Item" hint="Cannot be changed">
                          <div className="h-12 px-4 flex items-center rounded-xl bg-secondary/20 text-muted-foreground">
                            {field.value}
                          </div>
                        </DataField>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="price_list"
                    render={({ field }) => (
                      <FormItem>
                        <DataField label="Price List" hint="Cannot be changed">
                          <div className="h-12 px-4 flex items-center rounded-xl bg-secondary/20 text-muted-foreground">
                            {field.value} ({selectedPriceList?.currency})
                          </div>
                        </DataField>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="price_list_rate"
                    render={({ field }) => (
                      <FormItem>
                        <DataField
                          label="Rate *"
                          error={form.formState.errors.price_list_rate?.message}
                        >
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                              {selectedPriceList?.currency ||
                                price.currency ||
                                "$"}
                            </span>
                            <input
                              {...field}
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              className="w-full h-12 pl-12 pr-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 focus:bg-white focus:shadow-lg outline-none transition-all duration-300 font-mono text-lg"
                            />
                          </div>
                        </DataField>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="uom"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          UOM
                        </FormLabel>
                        <FormControl>
                          <SearchableSelect
                            options={uoms.map((uom) => ({
                              value: uom,
                              label: uom,
                            }))}
                            value={field.value}
                            onValueChange={field.onChange}
                            placeholder="Default UOM"
                            searchPlaceholder="Search UOMs..."
                            emptyText="No UOMs found."
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="min_qty"
                    render={({ field }) => (
                      <FormItem>
                        <DataField label="Minimum Quantity">
                          <input
                            {...field}
                            type="number"
                            placeholder="No minimum"
                            className="w-full h-12 px-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 focus:bg-white focus:shadow-lg outline-none transition-all duration-300"
                          />
                        </DataField>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Customer/Supplier */}
              {selectedPriceList && (
                <div className="bg-card rounded-[2rem] p-8 shadow-sm animate-in fade-in slide-in-from-left-4 duration-500">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/70 mb-6 flex items-center gap-2">
                    <Users className="h-4 w-4" /> Customer / Supplier Specific
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {(selectedPriceList.selling ||
                      (!selectedPriceList.selling &&
                        !selectedPriceList.buying)) && (
                      <FormField
                        control={form.control}
                        name="customer"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Customer
                            </FormLabel>
                            <FormControl>
                              <SearchableSelect
                                options={[
                                  { value: "", label: "All customers" },
                                  ...customers.map((c) => ({
                                    value: c,
                                    label: c,
                                  })),
                                ]}
                                value={field.value}
                                onValueChange={field.onChange}
                                placeholder="All customers"
                                searchPlaceholder="Search customers..."
                                emptyText="No customers found."
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    )}

                    {(selectedPriceList.buying ||
                      (!selectedPriceList.selling &&
                        !selectedPriceList.buying)) && (
                      <FormField
                        control={form.control}
                        name="supplier"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Supplier
                            </FormLabel>
                            <FormControl>
                              <SearchableSelect
                                options={[
                                  { value: "", label: "All suppliers" },
                                  ...suppliers.map((s) => ({
                                    value: s,
                                    label: s,
                                  })),
                                ]}
                                value={field.value}
                                onValueChange={field.onChange}
                                placeholder="All suppliers"
                                searchPlaceholder="Search suppliers..."
                                emptyText="No suppliers found."
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Validity & Advanced */}
              <div className="bg-card rounded-[2rem] p-8 shadow-sm animate-in fade-in slide-in-from-left-4 duration-500 delay-100">
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/70 mb-6 flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> Validity & Advanced
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="valid_from"
                    render={({ field }) => (
                      <FormItem>
                        <DataField label="Valid From">
                          <input
                            {...field}
                            type="date"
                            className="w-full h-12 px-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 focus:bg-white outline-none transition-all duration-300"
                          />
                        </DataField>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="valid_upto"
                    render={({ field }) => (
                      <FormItem>
                        <DataField label="Valid Until">
                          <input
                            {...field}
                            type="date"
                            className="w-full h-12 px-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 focus:bg-white outline-none transition-all duration-300"
                          />
                        </DataField>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lead_time_in_days"
                    render={({ field }) => (
                      <FormItem>
                        <DataField label="Lead Time (Days)">
                          <input
                            {...field}
                            type="number"
                            placeholder="0"
                            className="w-full h-12 px-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 focus:bg-white outline-none transition-all duration-300"
                          />
                        </DataField>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="packing_unit"
                    render={({ field }) => (
                      <FormItem>
                        <DataField label="Packing Unit">
                          <input
                            {...field}
                            type="number"
                            step="0.01"
                            placeholder="0"
                            className="w-full h-12 px-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 focus:bg-white outline-none transition-all duration-300"
                          />
                        </DataField>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="batch_no"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <DataField label="Batch No">
                          <input
                            {...field}
                            placeholder="Leave empty for all batches"
                            className="w-full h-12 px-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 focus:bg-white outline-none transition-all duration-300"
                          />
                        </DataField>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Note */}
              <div className="bg-card rounded-[2rem] p-8 shadow-sm animate-in fade-in slide-in-from-left-4 duration-500 delay-200">
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/70 mb-6 flex items-center gap-2">
                  <Layers className="h-4 w-4" /> Notes
                </h3>

                <FormField
                  control={form.control}
                  name="note"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Add any notes about this price..."
                          className="min-h-[100px] rounded-xl bg-secondary/30 hover:bg-secondary/50 focus:bg-white border-0 resize-none transition-all duration-300"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-4 space-y-6">
              <div className="sticky top-24 space-y-6">
                {/* Status */}
                <div
                  className={cn(
                    "rounded-[2rem] p-6 animate-in fade-in slide-in-from-right-4 duration-500",
                    hasChanges
                      ? "bg-gradient-to-br from-amber-50 to-amber-100/50"
                      : "bg-gradient-to-br from-emerald-50 to-emerald-100/50"
                  )}
                >
                  <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Status
                  </h3>
                  {hasChanges ? (
                    <div className="space-y-2">
                      <p className="text-amber-700 font-semibold text-sm">
                        Unsaved changes
                      </p>
                      <p className="text-xs text-amber-600/80">
                        Click "Save Changes" to apply
                      </p>
                    </div>
                  ) : (
                    <p className="text-emerald-700 font-semibold text-sm">
                      All changes saved
                    </p>
                  )}
                </div>

                {/* Current Price Display */}
                {/* <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-[2rem] p-6 animate-in fade-in slide-in-from-right-4 duration-500 delay-100">
                  <h3 className="font-bold text-sm mb-4">Current Price</h3>
                  <div className="text-center py-4">
                    <p className="text-3xl font-bold text-primary tabular-nums">
                      {price.currency} {watchedValues.rate || price.rate}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {price.price_list}
                    </p>
                  </div>
                </div> */}

                {/* Metadata */}
                <div className="bg-secondary/30 rounded-[2rem] p-6 animate-in fade-in slide-in-from-right-4 duration-500 delay-200">
                  <h3 className="font-bold text-sm mb-4">System Info</h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-muted-foreground/60">
                        Created
                      </p>
                      <p className="font-mono text-xs">
                        {new Date(price.creation || "").toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-muted-foreground/60">
                        Last Modified
                      </p>
                      <p className="font-mono text-xs">
                        {new Date(price.modified || "").toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}

export default function EditItemPricePage() {
  const params = useParams<{ name: string }>();
  const priceName = decodeURIComponent(params.name);

  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <EditItemPriceContent priceName={priceName} />
    </Suspense>
  );
}
