"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { InfoCard } from "@/components/ui/info-card";
import { DataField, PremiumInput, ToggleCard } from "@/components/ui/form-field";
import { useItemGroupQuery, useUpdateItemGroupMutation, useItemGroupOptionsQuery } from "@/hooks/data/useItemGroupQuery";
import { itemGroupFormSchema, ItemGroupFormData, defaultItemGroupFormValues, formToFrappe, frappeToForm } from "@/lib/schemas/item-group";
import { Form, FormField, FormItem, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Save, Folder, Settings, FileText, Building, CreditCard, Users } from "lucide-react";
import { useParams } from "next/navigation";
import { Suspense } from "react";

function LoadingSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-pulse">
      <div className="h-16 bg-muted/60 rounded-full" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <div className="h-80 bg-muted/50 rounded-[2rem]" />
          <div className="h-60 bg-muted/50 rounded-[2rem]" />
        </div>
        <div className="lg:col-span-4 space-y-6">
          <div className="h-60 bg-muted/40 rounded-[2rem]" />
        </div>
      </div>
    </div>
  );
}

function EditContent() {
  const params = useParams<{ name: string }>();
  const router = useRouter();
  const name = decodeURIComponent(params.name);
  const [hasChanges, setHasChanges] = useState(false);
  
  const { data, isLoading } = useItemGroupQuery(name);
  const updateMutation = useUpdateItemGroupMutation({
    onSuccess: (data) => {
      router.push(`/stock/settings/item-group/${encodeURIComponent(data.data.item_group.name)}`);
    },
  });
  const { data: optionsData } = useItemGroupOptionsQuery();

  const form = useForm<ItemGroupFormData>({
    resolver: zodResolver(itemGroupFormSchema),
    defaultValues: defaultItemGroupFormValues,
  });

  // Reset form when data loads
  useEffect(() => {
    if (data) {
      const formData = frappeToForm(data.data.item_group);
      form.reset(formData);
    }
  }, [data, form]);

  // Watch for changes
  useEffect(() => {
    const subscription = form.watch(() => {
      setHasChanges(true);
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const onSubmit = (data: ItemGroupFormData) => {
    updateMutation.mutate({ 
      name, 
      data: formToFrappe(data) as any 
    });
  };

  const parentOptions = optionsData?.data?.item_groups?.filter(g => g.name !== name) || [];
  const priceListOptions = optionsData?.data?.price_lists || [];
  const warehouseOptions = optionsData?.data?.warehouses || [];
  const costCenterOptions = optionsData?.data?.cost_centers || [];
  const expenseAccountOptions = optionsData?.data?.expense_accounts || [];
  const incomeAccountOptions = optionsData?.data?.income_accounts || [];
  const supplierOptions = optionsData?.data?.suppliers || [];
  const taxTemplateOptions = optionsData?.data?.tax_templates || [];
  const taxCategoryOptions = optionsData?.data?.tax_categories || [];

  if (isLoading || !data) return <LoadingSkeleton />;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <PageHeader
        backUrl={`/stock/settings/item-group/${encodeURIComponent(name)}`}
        label="Editing"
        title={data.data.item_group.item_group_name}
        hasChanges={hasChanges}
        primaryAction={{
          label: "Save Changes",
          icon: <Save className="h-4 w-4" />,
          onClick: form.handleSubmit(onSubmit),
          loading: updateMutation.isPending,
          disabled: !hasChanges,
        }}
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-8">
              <InfoCard title={<><Folder className="h-4 w-4" /> Basic Information</>} delay={100}>
                <div className="grid grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="item_group_name"
                    render={({ field }) => (
                      <FormItem>
                        <DataField label="Item Group Name" required error={form.formState.errors.item_group_name?.message}>
                          <FormControl>
                            <PremiumInput {...field} placeholder="Enter item group name" />
                          </FormControl>
                        </DataField>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="parent_item_group"
                    render={({ field }) => (
                      <FormItem>
                        <DataField label="Parent Item Group" required error={form.formState.errors.parent_item_group?.message}>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger className="h-12 rounded-xl bg-secondary/30 hover:bg-secondary/50 focus:bg-white border-0">
                                <SelectValue placeholder="Select parent item group" />
                              </SelectTrigger>
                              <SelectContent className="rounded-2xl shadow-xl bg-white/95 backdrop-blur-xl border-0">
                                <SelectItem value="All Item Groups">All Item Groups</SelectItem>
                                {parentOptions.map((option) => (
                                  <SelectItem key={option.name} value={option.name}>
                                    {option.item_group_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                        </DataField>
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="mt-6">
                  <FormField
                    control={form.control}
                    name="is_group"
                    render={({ field }) => (
                      <ToggleCard
                        checked={field.value}
                        onChange={field.onChange}
                        title="Group Node"
                        description="Make this a group node to create child item groups under it"
                      />
                    )}
                  />
                </div>
              </InfoCard>

              <InfoCard title={<><Settings className="h-4 w-4" /> Default Settings</>} delay={200}>
                <div className="grid grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="default_price_list"
                    render={({ field }) => (
                      <FormItem>
                        <DataField label="Default Price List" error={form.formState.errors.default_price_list?.message}>
                          <FormControl>
                            <SearchableSelect
                              options={priceListOptions}
                              value={field.value}
                              onValueChange={field.onChange}
                              placeholder="Select price list"
                              searchPlaceholder="Search price lists..."
                              emptyText="No price lists found."
                            />
                          </FormControl>
                        </DataField>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="default_warehouse"
                    render={({ field }) => (
                      <FormItem>
                        <DataField label="Default Warehouse" error={form.formState.errors.default_warehouse?.message}>
                          <FormControl>
                            <SearchableSelect
                              options={warehouseOptions}
                              value={field.value}
                              onValueChange={field.onChange}
                              placeholder="Select warehouse"
                              searchPlaceholder="Search warehouses..."
                              emptyText="No warehouses found."
                            />
                          </FormControl>
                        </DataField>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="default_buying_cost_center"
                    render={({ field }) => (
                      <FormItem>
                        <DataField label="Default Buying Cost Center" error={form.formState.errors.default_buying_cost_center?.message}>
                          <FormControl>
                            <SearchableSelect
                              options={costCenterOptions}
                              value={field.value}
                              onValueChange={field.onChange}
                              placeholder="Select cost center"
                              searchPlaceholder="Search cost centers..."
                              emptyText="No cost centers found."
                            />
                          </FormControl>
                        </DataField>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="default_selling_cost_center"
                    render={({ field }) => (
                      <FormItem>
                        <DataField label="Default Selling Cost Center" error={form.formState.errors.default_selling_cost_center?.message}>
                          <FormControl>
                            <SearchableSelect
                              options={costCenterOptions}
                              value={field.value}
                              onValueChange={field.onChange}
                              placeholder="Select cost center"
                              searchPlaceholder="Search cost centers..."
                              emptyText="No cost centers found."
                            />
                          </FormControl>
                        </DataField>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="default_expense_account"
                    render={({ field }) => (
                      <FormItem>
                        <DataField label="Default Expense Account" error={form.formState.errors.default_expense_account?.message}>
                          <FormControl>
                            <SearchableSelect
                              options={expenseAccountOptions}
                              value={field.value}
                              onValueChange={field.onChange}
                              placeholder="Select expense account"
                              searchPlaceholder="Search expense accounts..."
                              emptyText="No expense accounts found."
                            />
                          </FormControl>
                        </DataField>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="default_income_account"
                    render={({ field }) => (
                      <FormItem>
                        <DataField label="Default Income Account" error={form.formState.errors.default_income_account?.message}>
                          <FormControl>
                            <SearchableSelect
                              options={incomeAccountOptions}
                              value={field.value}
                              onValueChange={field.onChange}
                              placeholder="Select income account"
                              searchPlaceholder="Search income accounts..."
                              emptyText="No income accounts found."
                            />
                          </FormControl>
                        </DataField>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="default_supplier"
                    render={({ field }) => (
                      <FormItem>
                        <DataField label="Default Supplier" error={form.formState.errors.default_supplier?.message}>
                          <FormControl>
                            <SearchableSelect
                              options={supplierOptions}
                              value={field.value}
                              onValueChange={field.onChange}
                              placeholder="Select supplier"
                              searchPlaceholder="Search suppliers..."
                              emptyText="No suppliers found."
                            />
                          </FormControl>
                        </DataField>
                      </FormItem>
                    )}
                  />
                </div>
              </InfoCard>

              <InfoCard title={<><FileText className="h-4 w-4" /> Tax Settings</>} delay={300}>
                <div className="grid grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="default_item_tax_template"
                    render={({ field }) => (
                      <FormItem>
                        <DataField label="Default Item Tax Template" error={form.formState.errors.default_item_tax_template?.message}>
                          <FormControl>
                            <SearchableSelect
                              options={taxTemplateOptions}
                              value={field.value}
                              onValueChange={field.onChange}
                              placeholder="Select tax template"
                              searchPlaceholder="Search tax templates..."
                              emptyText="No tax templates found."
                            />
                          </FormControl>
                        </DataField>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="tax_category"
                    render={({ field }) => (
                      <FormItem>
                        <DataField label="Tax Category" error={form.formState.errors.tax_category?.message}>
                          <FormControl>
                            <SearchableSelect
                              options={taxCategoryOptions}
                              value={field.value}
                              onValueChange={field.onChange}
                              placeholder="Select tax category"
                              searchPlaceholder="Search tax categories..."
                              emptyText="No tax categories found."
                            />
                          </FormControl>
                        </DataField>
                      </FormItem>
                    )}
                  />
                </div>
              </InfoCard>
            </div>

            <div className="lg:col-span-4">
              <div className="sticky top-20 space-y-6">
                <InfoCard title="Preview" variant="gradient" delay={200}>
                  <div className="space-y-4">
                    <div className="p-4 bg-white/50 rounded-xl">
                      <h4 className="font-medium mb-2">Item Group Preview</h4>
                      <div className="text-sm space-y-1">
                        <p><span className="text-muted-foreground">Name:</span> {form.watch("item_group_name") || "Not set"}</p>
                        <p><span className="text-muted-foreground">Parent:</span> {form.watch("parent_item_group") || "Not set"}</p>
                        <p><span className="text-muted-foreground">Type:</span> {form.watch("is_group") ? "Group Node" : "Item Group"}</p>
                      </div>
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

export default function EditItemGroupPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <EditContent />
    </Suspense>
  );
}