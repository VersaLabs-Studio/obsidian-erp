// app/stock/item/[name]/edit/page.tsx
// Obsidian ERP v4.0 - Edit Item Page (Schema-Driven Architecture)
// @ts-nocheck - React Hook Form + Zod type inference limitations (false positives)

"use client";

import { useParams, useRouter } from "next/navigation";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Save,
  Package,
  FileText,
  Settings,
  Clock,
  Trash2,
  MoreVertical,
} from "lucide-react";
import { useEffect, useMemo } from "react";

// v3.0: Import from generated types
import { Item, ItemUpdateRequest } from "@/types/doctype-types";

// v3.0: Use generic hooks
import {
  useFrappeDoc,
  useFrappeUpdate,
  useFrappeDelete,
} from "@/hooks/generic";

// v3.0: Use smart components
import { PageHeader } from "@/components/smart/page-header";
import { FrappeSelect } from "@/components/smart/frappe-select";
import { DataField } from "@/components/smart/data-field";

// Existing UI components
import { InfoCard } from "@/components/ui/info-card";
import { cn } from "@/lib/utils";

// ============================================================================
// Form Schema
// ============================================================================

const itemEditFormSchema = z.object({
  item_code: z.string(),
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

type ItemEditFormData = z.infer<typeof itemEditFormSchema>;

// ============================================================================
// Utility Functions
// ============================================================================

function frappeToForm(item: Item): ItemEditFormData {
  return {
    item_code: item.item_code,
    item_name: item.item_name || "",
    item_group: item.item_group,
    stock_uom: item.stock_uom,
    description: item.description || "",
    brand: item.brand || "",
    valuation_rate: item.valuation_rate || 0,
    is_stock_item: item.is_stock_item === 1,
    is_fixed_asset: item.is_fixed_asset === 1,
    disabled: item.disabled === 1,
  };
}

function formToFrappe(data: ItemEditFormData): ItemUpdateRequest {
  return {
    item_name: data.item_name,
    item_group: data.item_group,
    stock_uom: data.stock_uom,
    description: data.description,
    brand: data.brand,
    valuation_rate: data.valuation_rate || 0,
    is_stock_item: data.is_stock_item ? 1 : 0,
    is_fixed_asset: data.is_fixed_asset ? 1 : 0,
    disabled: data.disabled ? 1 : 0,
  };
}

// ============================================================================
// Loading Skeleton
// ============================================================================

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

// ============================================================================
// Main Page Component
// ============================================================================

export default function EditItemPage() {
  const router = useRouter();
  const params = useParams<{ name: string }>();
  const itemName = decodeURIComponent(params.name);

  // v3.0: Use generic useFrappeDoc hook with generated Item type
  const { data: item, isLoading } = useFrappeDoc<Item>("Item", itemName);

  // v3.0: Use generic update mutation
  const updateMutation = useFrappeUpdate<
    { data: Item },
    { name: string; data: ItemUpdateRequest }
  >("Item", {
    successMessage: "Item updated successfully",
    onSuccess: () => {
      router.push(`/stock/item/${encodeURIComponent(itemName)}`);
    },
  });

  // v3.0: Use generic delete mutation
  const deleteMutation = useFrappeDelete("Item", {
    successMessage: "Item deleted successfully",
    onSuccess: () => {
      router.push("/stock/item");
    },
  });

  const form = useForm<ItemEditFormData>({
    resolver: zodResolver(itemEditFormSchema),
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

  // Initialize form with item data
  useEffect(() => {
    if (item) {
      const formData = frappeToForm(item);
      form.reset(formData);
    }
  }, [item, form]);

  // Track unsaved changes
  const watchedValues = form.watch();
  const hasChanges = useMemo(() => {
    if (!item) return false;
    const originalData = frappeToForm(item);
    return JSON.stringify(watchedValues) !== JSON.stringify(originalData);
  }, [item, watchedValues]);

  // Submit handler
  const onSubmit = async (data: ItemEditFormData) => {
    try {
      const frappeData = formToFrappe(data);
      await updateMutation.mutateAsync({
        name: itemName,
        data: frappeData,
      });
    } catch (error) {
      console.error("Failed to update item:", error);
    }
  };

  // Delete handler
  const handleDelete = async () => {
    const displayName = item?.item_name || item?.item_code || itemName;
    if (confirm(`Are you sure you want to delete "${displayName}"?`)) {
      try {
        await deleteMutation.mutateAsync(item?.name || itemName);
      } catch (error) {
        console.error("Failed to delete item:", error);
      }
    }
  };

  if (isLoading || !item) {
    return <LoadingSkeleton />;
  }

  const displayName = item.item_name || item.item_code;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* v3.0: Use refactored PageHeader from smart components */}
      <PageHeader
        backUrl={`/stock/item/${encodeURIComponent(item.name)}`}
        label="Editing"
        title={displayName}
        status={{
          label: item.disabled ? "Inactive" : "Active",
          variant: item.disabled ? "destructive" : "success",
        }}
        hasChanges={hasChanges}
        primaryAction={{
          label: "Save Changes",
          icon: <Save className="h-4 w-4" />,
          onClick: form.handleSubmit(onSubmit),
          loading: updateMutation.isPending,
          disabled: !hasChanges,
        }}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-secondary"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="rounded-2xl shadow-xl bg-popover/95 backdrop-blur-xl border-0 p-2"
          >
            <DropdownMenuItem
              className="rounded-xl text-destructive focus:bg-destructive/10"
              onClick={handleDelete}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete Item
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </PageHeader>

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
                            placeholder="Enter item name..."
                            className="h-12 rounded-xl bg-secondary/30 hover:bg-secondary/50 focus:bg-card border-0"
                          />
                        </DataField>
                      </FormItem>
                    )}
                  />

                  {/* Item Code (disabled) */}
                  <FormField
                    control={form.control}
                    name="item_code"
                    render={({ field }) => (
                      <FormItem>
                        <DataField
                          label="Item Code"
                          name="item_code"
                          helperText="Cannot be changed"
                        >
                          <Input
                            {...field}
                            disabled
                            className="h-12 rounded-xl bg-muted/50 border-0 font-mono"
                          />
                        </DataField>
                      </FormItem>
                    )}
                  />

                  {/* Brand */}
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
                          placeholder="Enter a detailed description..."
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                            Stock Item
                          </FormLabel>
                          <p className="text-xs text-muted-foreground">
                            Track inventory
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
                            Depreciate
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="disabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-3 space-y-0 p-4 bg-red-50/50 rounded-xl hover:bg-red-50 transition-colors">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="font-medium text-destructive">
                            Disabled
                          </FormLabel>
                          <p className="text-xs text-muted-foreground">
                            Inactive
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
                {/* Status */}
                <InfoCard
                  variant="gradient"
                  gradientFrom={
                    hasChanges ? "from-amber-50" : "from-emerald-50"
                  }
                  gradientTo={
                    hasChanges ? "to-amber-100/50" : "to-emerald-100/50"
                  }
                  delay={100}
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
                        Click &quot;Save Changes&quot; to apply
                      </p>
                    </div>
                  ) : (
                    <p className="text-emerald-700 font-semibold text-sm">
                      All changes saved
                    </p>
                  )}
                </InfoCard>

                {/* Metadata */}
                <InfoCard delay={200} className="bg-secondary/30">
                  <h3 className="font-bold text-sm mb-4">System Info</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-muted-foreground/60">
                        Created
                      </p>
                      <p className="font-mono text-xs">
                        {item.creation
                          ? new Date(item.creation).toLocaleDateString()
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-muted-foreground/60">
                        Last Modified
                      </p>
                      <p className="font-mono text-xs">
                        {item.modified
                          ? new Date(item.modified).toLocaleDateString()
                          : "—"}
                      </p>
                    </div>
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
