"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Loader2, Tag, Calendar, Info, Settings } from "lucide-react";

import { useFrappeCreate } from "@/hooks/generic";
import { PageHeader } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import { FormInput, FormFrappeSelect, FormDatePicker, FormSwitch } from "@/components/form";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import {
  GuidedErrorDialog,
  useGuidedError,
} from "@/components/errors/GuidedErrorDialog";
import { getActiveCompany } from "@/lib/settings/company";
import { ItemPriceCreateSchema } from "@/lib/schemas/doctype-schemas";

type FormData = z.input<typeof ItemPriceCreateSchema>;

export default function NewItemPricePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { resolution, showError, dismiss } = useGuidedError();

  const prefillPriceList = searchParams.get("price_list") || "";

  const form = useForm<FormData>({
    resolver: zodResolver(ItemPriceCreateSchema),
    defaultValues: {
      item_code: "",
      price_list: prefillPriceList,
      uom: "",
      price_list_rate: 0,
      currency: "ETB",
      valid_from: "",
      valid_upto: "",
      buying: 0,
      selling: 0,
    },
  });

  const createMutation = useFrappeCreate("Item Price", {
    onSuccess: () => router.push("/stock/settings/item-price"),
    successMessage: "Item Price created successfully",
    onError: (err) => {
      showError(
        resolveFrappeError(err, {
          doctype: "Item Price",
          values: form.getValues(),
        }),
      );
    },
  });

  const onSubmit = async (data: FormData) => {
    const submitData = {
      ...data,
      company: getActiveCompany(),
      buying: data.buying ?? 0,
      selling: data.selling ?? 0,
      currency: data.currency || "ETB",
      valid_from: data.valid_from || undefined,
      valid_upto: data.valid_upto || undefined,
    };
    await createMutation.mutateAsync(submitData);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="New Item Price" backHref="/stock/settings/item-price" />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <InfoCard title="Item & Price List" icon={<Tag className="h-4 w-4" />}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormFrappeSelect
                    control={form.control}
                    name="item_code"
                    label="Item Code"
                    required
                    doctype="Item"
                    labelField="item_code"
                    extraFields={["item_name", "stock_uom"]}
                    onValueChange={(_val, doc) => {
                      if (doc?.stock_uom) {
                        form.setValue("uom", doc.stock_uom);
                      }
                    }}
                  />
                  <FormFrappeSelect
                    control={form.control}
                    name="price_list"
                    label="Price List"
                    required
                    doctype="Price List"
                    labelField="price_list_name"
                  />
                  <FormFrappeSelect
                    control={form.control}
                    name="uom"
                    label="UOM"
                    required
                    doctype="UOM"
                    labelField="uom_name"
                  />
                  <FormInput
                    control={form.control}
                    name="price_list_rate"
                    label="Price List Rate"
                    required
                    type="number"
                    placeholder="0.00"
                  />
                </div>
              </InfoCard>

              <InfoCard title="Validity & Currency" icon={<Calendar className="h-4 w-4" />}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput
                    control={form.control}
                    name="currency"
                    label="Currency"
                    placeholder="ETB"
                  />
                  <div />
                  <FormDatePicker
                    control={form.control}
                    name="valid_from"
                    label="Valid From"
                  />
                  <FormDatePicker
                    control={form.control}
                    name="valid_upto"
                    label="Valid Upto"
                  />
                </div>
              </InfoCard>

              <InfoCard title="Type" icon={<Info className="h-4 w-4" />}>
                <div className="flex flex-wrap gap-6">
                  <FormSwitch
                    control={form.control}
                    name="buying"
                    label="Buying"
                    description="Available for purchase orders"
                    transform={{
                      input: (val) => val === 1,
                      output: (val) => (val ? 1 : 0),
                    }}
                  />
                  <FormSwitch
                    control={form.control}
                    name="selling"
                    label="Selling"
                    description="Available for sales orders"
                    transform={{
                      input: (val) => val === 1,
                      output: (val) => (val ? 1 : 0),
                    }}
                  />
                </div>
              </InfoCard>
            </div>

            <div className="space-y-6">
              <InfoCard
                title="Actions"
                icon={<Settings className="h-4 w-4" />}
                variant="gradient"
              >
                <Button
                  type="submit"
                  className="w-full rounded-xl"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Item Price"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded-xl"
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
              </InfoCard>
            </div>
          </div>
        </form>
      </Form>

      <GuidedErrorDialog resolution={resolution} onDismiss={dismiss} />
    </div>
  );
}
