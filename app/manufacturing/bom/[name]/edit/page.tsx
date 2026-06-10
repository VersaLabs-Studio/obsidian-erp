// @ts-nocheck
"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Save,
  Loader2,
  Layers as BOMIcon,
  Plus,
  Trash2,
  Package,
  Cog,
  DollarSign,
  Calculator,
  AlertTriangle,
  Clock,
  X,
} from "lucide-react";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useFrappeUpdate, useFrappeDoc, useFrappeList } from "@/hooks/generic";
import { PageHeader, LoadingState } from "@/components/smart";
import { FormInput, FormFrappeSelect, FormSwitch } from "@/components/form";
import {
  BOMUpdateSchema,
  type BOMFormData,
} from "@/lib/schemas/doctype-schemas";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Bom, Workstation } from "@/types/doctype-types";

function EditBOMForm() {
  const router = useRouter();
  const { name } = useParams();
  const bomName = decodeURIComponent(name as string);

  const [withOperations, setWithOperations] = useState(false);

  // Fetch workstations for rate lookup
  const { data: workstations } = useFrappeList<Workstation>("Workstation", {
    fields: ["name", "workstation_name", "hour_rate"],
    limit: 100,
  });

  // Fetch document data
  const { data: bom, isLoading } = useFrappeDoc<Bom>("BOM", bomName);

  const form = useForm<BOMFormData>({
    resolver: zodResolver(BOMUpdateSchema),
    defaultValues: {
      item: "",
      quantity: 1,
      uom: "Nos",
      currency: "ETB",
      conversion_rate: 1,
      is_active: 1,
      is_default: 0,
      with_operations: 0,
      rm_cost_as_per: "Valuation Rate",
      items: [],
      operations: [],
      scrap_items: [],
    },
  });

  useEffect(() => {
    if (bom) {
      if (bom.docstatus === 1) {
        toast.error("Submitted BOMs cannot be edited");
        router.push(`/manufacturing/bom/${encodeURIComponent(bomName)}`);
        return;
      }
      form.reset({
        item: bom.item,
        company: bom.company,
        quantity: bom.quantity,
        uom: bom.uom || "Nos",
        is_active: bom.is_active,
        is_default: bom.is_default,
        with_operations: bom.with_operations,
        rm_cost_as_per: bom.rm_cost_as_per || "Valuation Rate",
        items:
          bom.items?.map((i) => ({
            item_code: i.item_code,
            qty: i.qty,
            uom: i.uom,
            rate: i.rate,
            amount: i.amount,
          })) || [],
        operations:
          bom.operations?.map((o) => ({
            operation: o.operation,
            workstation: o.workstation,
            time_in_mins: o.time_in_mins,
            hour_rate: o.hour_rate,
            operating_cost: o.operating_cost,
          })) || [],
        scrap_items:
          bom.scrap_items?.map((s) => ({
            item_code: s.item_code,
            qty: s.qty,
            uom: s.uom,
            rate: s.rate,
            amount: s.amount,
          })) || [],
      });
      setWithOperations(bom.with_operations === 1);
    }
  }, [bom, form, bomName, router]);

  // Material items array
  const {
    fields: materialFields,
    append: appendMaterial,
    remove: removeMaterial,
  } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Scrap items array
  const {
    fields: scrapFields,
    append: appendScrap,
    remove: removeScrap,
  } = useFieldArray({
    control: form.control,
    name: "scrap_items",
  });

  // Operation items array
  const {
    fields: operationFields,
    append: appendOperation,
    remove: removeOperation,
  } = useFieldArray({
    control: form.control,
    name: "operations",
  });

  // Calculate costs - use JSON.stringify for proper reactivity on nested array changes
  const materials = form.watch("items") || [];
  const operations = form.watch("operations") || [];
  const quantity = form.watch("quantity") || 1;

  // Serialize for dependency tracking (nested arrays need this)
  const materialsSerialized = JSON.stringify(materials);
  const operationsSerialized = JSON.stringify(operations);

  const rawMaterialCost = useMemo(() => {
    const items = JSON.parse(materialsSerialized) as typeof materials;
    return items.reduce((sum, m) => sum + (m.qty || 0) * (m.rate || 0), 0);
  }, [materialsSerialized]);

  const operatingCost = useMemo(() => {
    const ops = JSON.parse(operationsSerialized) as typeof operations;
    return ops.reduce((sum, op) => {
      const ws = workstations?.find((w) => w.name === op.workstation);
      const hourRate = ws ? ws.hour_rate : op.hour_rate || 0;
      return sum + ((op.time_in_mins || 0) / 60) * hourRate;
    }, 0);
  }, [operationsSerialized, workstations]);

  const totalCost = rawMaterialCost + operatingCost;
  const costPerUnit = quantity > 0 ? totalCost / quantity : 0;

  // Handle item selection to auto-fill UOM and Rate
  const handleItemChange = (index: number, itemCode: string, itemDoc?: any) => {
    if (itemDoc) {
      form.setValue(`items.${index}.uom`, itemDoc.stock_uom);
      form.setValue(
        `items.${index}.rate`,
        itemDoc.valuation_rate || itemDoc.last_purchase_rate || 0,
      );
    }
  };

  // Handle workstation selection to auto-fill rate
  const handleWorkstationChange = (index: number, workstationName: string) => {
    const ws = workstations?.find((w) => w.name === workstationName);
    if (ws) {
      form.setValue(`operations.${index}.hour_rate`, ws.hour_rate);
    } else {
      form.setValue(`operations.${index}.hour_rate`, 0);
    }
  };

  // Update mutation
  const updateMutation = useFrappeUpdate("BOM", {
    onSuccess: () => {
      toast.success("BOM updated successfully");
      router.push(`/manufacturing/bom/${encodeURIComponent(bomName)}`);
    },
    onError: (err: any) =>
      toast.error("Update failed", { description: err.message }),
  });

  const onSubmit = (data: BOMFormData) => {
    if (bom?.docstatus === 1) {
      toast.error("Cannot edit a submitted BOM", {
        description: "You must cancel it first.",
      });
      return;
    }

    data.with_operations = withOperations ? 1 : 0;

    // Format data according to Frappe expectations
    const payload = {
      ...data,
      currency: "ETB",
      conversion_rate: 1,
      items: data.items.map((item) => {
        const rate = item.rate || 0;
        const qty = item.qty || 0;
        return {
          ...item,
          rate: rate,
          amount: qty * rate, // Calculate amount explicitly
          doctype: "BOM Item",
        };
      }),
      operations: withOperations
        ? data.operations?.map((op) => ({
            ...op,
            hour_rate: op.hour_rate || 0,
            doctype: "BOM Operation",
          }))
        : [],
      scrap_items:
        data.scrap_items?.map((scrap) => ({
          ...scrap,
          amount: (scrap.qty || 0) * (scrap.rate || 0),
          doctype: "BOM Scrap Item",
        })) || [],
    };

    updateMutation.mutate({ name: bomName, data: payload });
  };

  if (isLoading) return <LoadingState message="Fetching BOM details..." />;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form - 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Section */}
            <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 font-semibold text-lg">
                <Package className="h-5 w-5 text-primary" />
                Product Details
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormFrappeSelect
                  control={form.control}
                  name="item"
                  label="Product to Manufacture"
                  doctype="Item"
                  placeholder="Select finished good..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <FormInput
                  control={form.control}
                  name="quantity"
                  label="Batch Quantity"
                  type="number"
                  required
                />
                <FormFrappeSelect
                  control={form.control}
                  name="uom"
                  label="UOM"
                  doctype="UOM"
                />
                <div className="flex items-end pb-2 gap-4">
                  <FormSwitch
                    control={form.control}
                    name="is_default"
                    label="Default BOM"
                  />
                </div>
              </div>

              {/* Operations Toggle */}
              <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl border border-border/50">
                <div>
                  <p className="font-medium">Include Operations Costing</p>
                  <p className="text-sm text-muted-foreground">
                    Add machine time costs to BOM
                  </p>
                </div>
                <Switch
                  checked={withOperations}
                  onCheckedChange={(checked) => {
                    setWithOperations(checked);
                    form.setValue("with_operations", checked ? 1 : 0);
                  }}
                />
              </div>
            </div>

            {/* Materials Section */}
            <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-lg">
                  <Package className="h-5 w-5 text-emerald-500" />
                  Raw Materials
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full h-8"
                  onClick={() =>
                    appendMaterial({
                      item_code: "",
                      qty: 1,
                      uom: "Nos",
                      rate: 0,
                    })
                  }
                >
                  <Plus className="h-3 w-3 mr-1" /> Add Material
                </Button>
              </div>

              {materialFields.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-border/50 rounded-2xl">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="text-muted-foreground">
                    No materials added yet
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {materialFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="grid grid-cols-12 gap-2 items-start p-4 bg-secondary/20 rounded-xl relative group"
                    >
                      <div className="col-span-12 md:col-span-4">
                        <FormFrappeSelect
                          control={form.control}
                          name={`items.${index}.item_code`}
                          label="Item"
                          doctype="Item"
                          placeholder="Select..."
                          extraFields={[
                            "valuation_rate",
                            "last_purchase_rate",
                            "stock_uom",
                          ]}
                          onValueChange={(val, doc) =>
                            handleItemChange(index, val, doc)
                          }
                        />
                      </div>
                      <div className="col-span-4 md:col-span-2">
                        <FormInput
                          control={form.control}
                          name={`items.${index}.qty`}
                          label="Qty"
                          type="number"
                        />
                      </div>
                      <div className="col-span-4 md:col-span-2">
                        <FormFrappeSelect
                          control={form.control}
                          name={`items.${index}.uom`}
                          label="UOM"
                          doctype="UOM"
                        />
                      </div>
                      <div className="col-span-4 md:col-span-2">
                        <FormInput
                          control={form.control}
                          name={`items.${index}.rate`}
                          label="Rate"
                          type="number"
                        />
                      </div>
                      <div className="col-span-10 md:col-span-1 flex flex-col justify-end h-full py-2">
                        {index === 0 && (
                          <span className="text-[10px] uppercase text-muted-foreground mb-1">
                            Amount
                          </span>
                        )}
                        <span className="font-medium text-sm">
                          {(
                            (form.watch(`items.${index}.qty`) || 0) *
                            (form.watch(`items.${index}.rate`) || 0)
                          ).toFixed(2)}
                        </span>
                      </div>
                      <div className="col-span-2 md:col-span-1 flex items-end justify-end h-full">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-destructive hover:bg-destructive/10 rounded-full"
                          onClick={() => removeMaterial(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Operations Section */}
            {withOperations && (
              <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-lg">
                    <Cog className="h-5 w-5 text-blue-500" />
                    Operations
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full h-8"
                    onClick={() =>
                      appendOperation({
                        operation: "",
                        workstation: "",
                        time_in_mins: 1,
                        hour_rate: 0,
                      })
                    }
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add Operation
                  </Button>
                </div>

                {operationFields.length === 0 ? (
                  <div className="text-center py-10 border-2 border-dashed border-border/50 rounded-2xl">
                    <Cog className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p className="text-muted-foreground">
                      No operations added yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {operationFields.map((field, index) => (
                      <div
                        key={field.id}
                        className="grid grid-cols-12 gap-2 items-start p-4 bg-secondary/20 rounded-xl relative group"
                      >
                        <div className="col-span-12 md:col-span-3">
                          <FormFrappeSelect
                            control={form.control}
                            name={`operations.${index}.operation`}
                            label="Operation"
                            doctype="Operation"
                          />
                        </div>
                        <div className="col-span-12 md:col-span-3">
                          <FormFrappeSelect
                            control={form.control}
                            name={`operations.${index}.workstation`}
                            label="Workstation"
                            doctype="Workstation"
                            onValueChange={(val) =>
                              handleWorkstationChange(index, val)
                            }
                          />
                        </div>
                        <div className="col-span-4 md:col-span-2">
                          <FormInput
                            control={form.control}
                            name={`operations.${index}.time_in_mins`}
                            label="Time (min)"
                            type="number"
                          />
                        </div>
                        <div className="col-span-4 md:col-span-2">
                          <FormInput
                            control={form.control}
                            name={`operations.${index}.hour_rate`}
                            label="Rate/hr"
                            type="number"
                            disabled
                          />
                        </div>
                        <div className="col-span-10 md:col-span-1 flex flex-col justify-end h-full py-2">
                          {index === 0 && (
                            <span className="text-[10px] uppercase text-muted-foreground mb-1">
                              Cost
                            </span>
                          )}
                          <span className="font-medium text-sm">
                            {(
                              ((form.watch(
                                `operations.${index}.time_in_mins`,
                              ) || 0) /
                                60) *
                              (form.watch(`operations.${index}.hour_rate`) || 0)
                            ).toFixed(2)}
                          </span>
                        </div>
                        <div className="col-span-2 md:col-span-1 flex items-end justify-end h-full">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-destructive hover:bg-destructive/10 rounded-full"
                            onClick={() => removeOperation(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Scrap & Waste Section */}
            <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-lg">
                  <Trash2 className="h-5 w-5 text-amber-500" />
                  Scrap & Waste
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full h-8"
                  onClick={() =>
                    appendScrap({
                      item_code: "",
                      qty: 0,
                      uom: "Nos",
                      rate: 0,
                    })
                  }
                >
                  <Plus className="h-3 w-3 mr-1" /> Add Scrap
                </Button>
              </div>

              {scrapFields.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-border/50 rounded-2xl">
                  <p className="text-muted-foreground text-sm">
                    No scrap/waste defined for this recipe
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {scrapFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="grid grid-cols-12 gap-2 items-start p-4 bg-secondary/20 rounded-xl relative group"
                    >
                      <div className="col-span-12 md:col-span-4">
                        <FormFrappeSelect
                          control={form.control}
                          name={`scrap_items.${index}.item_code`}
                          label="Scrap Item"
                          doctype="Item"
                          placeholder="Select..."
                          onValueChange={(val, doc) => {
                            if (doc) {
                              form.setValue(
                                `scrap_items.${index}.uom`,
                                doc.stock_uom,
                              );
                              form.setValue(
                                `scrap_items.${index}.rate`,
                                doc.valuation_rate || 0,
                              );
                            }
                          }}
                        />
                      </div>
                      <div className="col-span-4 md:col-span-2">
                        <FormInput
                          control={form.control}
                          name={`scrap_items.${index}.qty`}
                          label="Qty"
                          type="number"
                        />
                      </div>
                      <div className="col-span-4 md:col-span-2">
                        <FormFrappeSelect
                          control={form.control}
                          name={`scrap_items.${index}.uom`}
                          label="UOM"
                          doctype="UOM"
                        />
                      </div>
                      <div className="col-span-4 md:col-span-2">
                        <FormInput
                          control={form.control}
                          name={`scrap_items.${index}.rate`}
                          label="Rate"
                          type="number"
                        />
                      </div>
                      <div className="col-span-2 md:col-span-2 flex items-end justify-end h-full">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-destructive hover:bg-destructive/10 rounded-full"
                          onClick={() => removeScrap(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cost Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-2xl border border-border/50 p-6 sticky top-6 space-y-6 shadow-lg">
              <div className="flex items-center gap-2 font-semibold text-lg">
                <Calculator className="h-5 w-5 text-primary" />
                Cost Summary
              </div>

              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Raw Materials</span>
                    <span className="font-medium">
                      ETB{" "}
                      {rawMaterialCost.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  {withOperations && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">
                        Operating Cost
                      </span>
                      <span className="font-medium">
                        ETB{" "}
                        {operatingCost.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  )}
                  <div className="pt-4 border-t border-border/50">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Total Cost</span>
                      <span className="text-xl font-bold text-primary">
                        ETB{" "}
                        {totalCost.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-primary/5 rounded-2xl space-y-1 border border-primary/10">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground uppercase tracking-widest">
                      Cost per Unit
                    </span>
                    <span className="font-bold text-primary text-lg">
                      ETB{" "}
                      {costPerUnit.toLocaleString(undefined, {
                        minimumFractionDigits: 4,
                      })}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground text-right italic">
                    Based on batch size of {form.watch("quantity") || 0}
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-4">
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="w-full rounded-full h-12 text-base shadow-lg shadow-primary/20 transition-all active:scale-95"
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : (
                    <Save className="h-5 w-5 mr-2" />
                  )}
                  Save Changes
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    router.push(
                      `/manufacturing/bom/${encodeURIComponent(bomName)}`,
                    )
                  }
                  className="w-full rounded-full text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}

export default function EditBOMPage() {
  const { name } = useParams();
  const bomName = decodeURIComponent(name as string);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Bill of Materials"
        subtitle={`Modifying ${bomName}`}
        backHref={`/manufacturing/bom/${encodeURIComponent(bomName)}`}
        icon={<BOMIcon className="h-5 w-5" />}
      />

      <Suspense fallback={<LoadingState message="Loading BOM..." />}>
        <EditBOMForm />
      </Suspense>
    </div>
  );
}
