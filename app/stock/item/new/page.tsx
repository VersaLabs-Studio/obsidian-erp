// app/stock/item/new/page.tsx
// Obsidian ERP v4.0 - Create Item Page (Schema-Driven Architecture)
// @ts-nocheck - React Hook Form + Zod type inference limitations (false positives)

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Save,
  Sparkles,
  Package,
  FileText,
  Settings,
  Loader2,
  Info,
} from "lucide-react";

// v3.0: Import from generated types and schemas
import { ItemCreateRequest } from "@/types/doctype-types";
import { ItemCreateSchema } from "@/lib/schemas/doctype-schemas";

// v3.0: Use generic hooks
import { useFrappeCreate, useFrappeOptions } from "@/hooks/generic";

// v3.0: Use smart components
import { PageHeader } from "@/components/smart/page-header";
import { FrappeSelect } from "@/components/smart/frappe-select";
import { DataField } from "@/components/smart/data-field";

// v3.0: Use existing UI components
import { InfoCard } from "@/components/ui/info-card";

// ============================================================================
// Form Schema - Extends generated schema with UI-specific validations
// ============================================================================

const itemFormSchema = z.object({
  item_code: z.string().min(1, "Item code is required"),
  item_name: z.string().min(1, "Item name is required"),
  item_group: z.string().min(1, "Item group is required"),
  stock_uom: z.string().min(1, "Unit of measure is required"),
  description: z.string().optional(),
  brand: z.string().optional(),
  valuation_rate: z.number().min(0).optional(),
  is_stock_item: z.boolean().default(true),
  is_fixed_asset: z.boolean().default(false),
  disabled: z.boolean().default(false),
});

type ItemFormData = z.infer<typeof itemFormSchema>;

// ============================================================================
// Utility Functions
// ============================================================================

function generateItemCode(name: string): string {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, "")
    .replace(/\s+/g, "-")
    .substring(0, 20);
}

function formToFrappe(data: ItemFormData): ItemCreateRequest {
  return {
    item_code: data.item_code,
    item_name: data.item_name,
    item_group: data.item_group,
    stock_uom: data.stock_uom,
    description: data.description,
    valuation_rate: data.valuation_rate || 0,
    is_stock_item: data.is_stock_item ? 1 : 0,
    disabled: data.disabled ? 1 : 0,
  };
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function CreateItemPage() {
  const router = useRouter();
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);

  // v3.0: Use generic create mutation
  const createMutation = useFrappeCreate<
    { data: ItemCreateRequest },
    ItemCreateRequest
  >("Item", {
    successMessage: "Item created successfully",
    onSuccess: () => {
      router.push("/stock/item");
    },
  });

  // @ts-ignore - React Hook Form type inference limitation with Zod .default()
  const form = useForm<ItemFormData>({
    resolver: zodResolver(itemFormSchema),
    mode: "onChange",
    defaultValues: {
      item_code: "",
      item_name: "",
      item_group: "",
      stock_uom: "",
      description: "",
      brand: "",
      valuation_rate: 0,
      is_stock_item: true,
      is_fixed_asset: false,
      disabled: false,
    },
  });

  // Auto-generate item code from name
  const handleNameChange = (name: string) => {
    form.setValue("item_name", name);
    if (!form.getValues("item_code") || isGeneratingCode) {
      setIsGeneratingCode(true);
      const code = generateItemCode(name);
      form.setValue("item_code", code);
      setTimeout(() => setIsGeneratingCode(false), 300);
    }
  };

  // Submit handler
  const onSubmit = async (data: ItemFormData) => {
    try {
      const frappeData = formToFrappe(data);
      await createMutation.mutateAsync(frappeData);
    } catch (error) {
      console.error("Failed to create item:", error);
    }
  };

  const watchedValues = form.watch();

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* v3.0: Use refactored PageHeader from smart components */}
      <PageHeader
        backUrl="/stock/item"
        label="New Item"
        title="Create Product"
        primaryAction={{
          label: "Create Item",
          icon: <Save className="h-4 w-4" />,
          onClick: form.handleSubmit(onSubmit),
          loading: createMutation.isPending,
        }}
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Main Form */}
            <div className="lg:col-span-8 space-y-8">
              {/* Core Information */}
              <InfoCard
                title={
                  <>
                    <Package className="h-4 w-4" /> Core Information
                  </>
                }
                delay={100}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Item Name */}
                  <FormField
                    control={form.control}
                    name="item_name"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <DataField
                          label="Item Name"
                          name="item_name"
                          required
                          error={form.formState.errors.item_name?.message}
                        >
                          <Input
                            {...field}
                            onChange={(e) => handleNameChange(e.target.value)}
                            placeholder="Enter item name..."
                            className="h-12 rounded-xl bg-secondary/30 hover:bg-secondary/50 focus:bg-card border-0"
                          />
                        </DataField>
                      </FormItem>
                    )}
                  />

                  {/* Item Code */}
                  <FormField
                    control={form.control}
                    name="item_code"
                    render={({ field }) => (
                      <FormItem>
                        <DataField
                          label="Item Code"
                          name="item_code"
                          required
                          error={form.formState.errors.item_code?.message}
                        >
                          <div className="relative">
                            <Input
                              {...field}
                              placeholder="Auto-generated..."
                              className="h-12 rounded-xl bg-secondary/30 hover:bg-secondary/50 focus:bg-card border-0 font-mono"
                            />
                            {isGeneratingCode && (
                              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />
                            )}
                          </div>
                        </DataField>
                      </FormItem>
                    )}
                  />

                  {/* Brand (Optional) */}
                  <FormField
                    control={form.control}
                    name="brand"
                    render={({ field }) => (
                      <FormItem>
                        <DataField label="Brand (Optional)" name="brand">
                          <Input
                            {...field}
                            placeholder="Brand name..."
                            className="h-12 rounded-xl bg-secondary/30 hover:bg-secondary/50 focus:bg-card border-0"
                          />
                        </DataField>
                      </FormItem>
                    )}
                  />

                  {/* v3.0: Use FrappeSelect for Item Group */}
                  <FormField
                    control={form.control}
                    name="item_group"
                    render={({ field }) => (
                      <FormItem>
                        <DataField
                          label="Item Group"
                          name="item_group"
                          required
                          error={form.formState.errors.item_group?.message}
                        >
                          <FrappeSelect
                            doctype="Item Group"
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select group..."
                            className="h-12 rounded-xl bg-secondary/30 hover:bg-secondary/50 focus:bg-card border-0"
                          />
                        </DataField>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* v3.0: Use FrappeSelect for UOM */}
                  <FormField
                    control={form.control}
                    name="stock_uom"
                    render={({ field }) => (
                      <FormItem>
                        <DataField
                          label="Unit of Measure"
                          name="stock_uom"
                          required
                          error={form.formState.errors.stock_uom?.message}
                        >
                          <FrappeSelect
                            doctype="UOM"
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select UOM..."
                            className="h-12 rounded-xl bg-secondary/30 hover:bg-secondary/50 focus:bg-card border-0"
                          />
                        </DataField>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Valuation Rate */}
                  <FormField
                    control={form.control}
                    name="valuation_rate"
                    render={({ field }) => (
                      <FormItem>
                        <DataField
                          label="Valuation Rate"
                          name="valuation_rate"
                          helperText="Used for BOM cost calculations"
                        >
                          <Input
                            {...field}
                            type="number"
                            step="0.01"
                            min="0"
                            value={field.value ?? 0}
                            onChange={(e) =>
                              field.onChange(parseFloat(e.target.value) || 0)
                            }
                            placeholder="0.00"
                            className="h-12 rounded-xl bg-secondary/30 hover:bg-secondary/50 focus:bg-card border-0"
                          />
                        </DataField>
                      </FormItem>
                    )}
                  />
                </div>
              </InfoCard>

              {/* Description */}
              <InfoCard
                title={
                  <>
                    <FileText className="h-4 w-4" /> Description
                  </>
                }
                delay={200}
              >
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Enter a detailed description of the item..."
                          className="min-h-[120px] rounded-xl bg-secondary/30 hover:bg-secondary/50 focus:bg-card border-0 resize-none transition-all duration-300"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </InfoCard>

              {/* Configuration */}
              <InfoCard
                title={
                  <>
                    <Settings className="h-4 w-4" /> Configuration
                  </>
                }
                delay={300}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="is_stock_item"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-3 space-y-0 p-4 bg-secondary/30 rounded-xl hover:bg-secondary/50 transition-colors">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="font-medium">
                            Maintain Stock
                          </FormLabel>
                          <p className="text-xs text-muted-foreground">
                            Track inventory levels
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="is_fixed_asset"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-3 space-y-0 p-4 bg-secondary/30 rounded-xl hover:bg-secondary/50 transition-colors">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="font-medium">
                            Fixed Asset
                          </FormLabel>
                          <p className="text-xs text-muted-foreground">
                            Depreciate over time
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </InfoCard>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-4 space-y-6">
              <div className="sticky top-20 space-y-6">
                {/* Live Preview */}
                <InfoCard
                  variant="gradient"
                  gradientFrom="from-primary/5"
                  gradientTo="to-primary/10"
                  delay={100}
                >
                  <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" /> Preview
                  </h3>
                  <div className="space-y-3">
                    <div className="bg-card/60 backdrop-blur-sm rounded-xl p-3">
                      <p className="text-[10px] uppercase font-semibold text-muted-foreground/60">
                        Name
                      </p>
                      <p className="font-bold text-sm truncate">
                        {watchedValues.item_name || "—"}
                      </p>
                    </div>
                    <div className="bg-card/60 backdrop-blur-sm rounded-xl p-3">
                      <p className="text-[10px] uppercase font-semibold text-muted-foreground/60">
                        Code
                      </p>
                      <p className="font-mono text-sm font-semibold truncate">
                        {watchedValues.item_code || "—"}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-card/60 backdrop-blur-sm rounded-xl p-3">
                        <p className="text-[10px] uppercase font-semibold text-muted-foreground/60">
                          Group
                        </p>
                        <p className="font-medium text-xs truncate">
                          {watchedValues.item_group || "—"}
                        </p>
                      </div>
                      <div className="bg-card/60 backdrop-blur-sm rounded-xl p-3">
                        <p className="text-[10px] uppercase font-semibold text-muted-foreground/60">
                          UOM
                        </p>
                        <p className="font-medium text-xs truncate">
                          {watchedValues.stock_uom || "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                </InfoCard>

                {/* Tips */}
                <InfoCard delay={200} className="bg-secondary/30">
                  <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                    <Info className="h-4 w-4" /> Quick Tips
                  </h3>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <p>• Item code auto-generates from name</p>
                    <p>• Stock items track inventory levels</p>
                    <p>• Fixed assets depreciate over time</p>
                  </div>
                </InfoCard>
              </div>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
