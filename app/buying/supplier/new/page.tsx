// @ts-nocheck
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Save,
  Loader2,
  Building2,
  Tag,
  Globe,
  Settings,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { Form } from "@/components/ui/form";
import { useFrappeCreate } from "@/hooks/generic";
import { PageHeader } from "@/components/smart";
import { FormInput, FormFrappeSelect, FormSelect } from "@/components/form";
import {
  SupplierCreateSchema,
  type SupplierFormData,
} from "@/lib/schemas/doctype-schemas";
import { toast } from "sonner";

export default function CreateSupplierPage() {
  const router = useRouter();

  const form = useForm<SupplierFormData>({
    resolver: zodResolver(SupplierCreateSchema),
    defaultValues: {
      supplier_name: "",
      supplier_group: "",
      supplier_type: "Company",
      country: "Ethiopia",
      default_currency: "ETB",
      disabled: 0,
    },
  });

  const createMutation = useFrappeCreate("Supplier", {
    onSuccess: (response) => {
      toast.success("Supplier registered successfully");
      router.push(
        `/buying/supplier/${encodeURIComponent(response.data?.name || response.name)}`,
      );
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = (data: SupplierFormData) => {
    createMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Register Supplier"
        subtitle="Onboard a new vendor to your procurement network"
        backHref="/buying/supplier"
      />

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6 max-w-4xl mx-auto"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Identity & Classification */}
            <div className="bg-card rounded-[2.5rem] border border-border/50 p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg tracking-tight">Identity</h3>
                  <p className="text-xs text-muted-foreground">
                    Legal name and category
                  </p>
                </div>
              </div>

              <FormInput
                control={form.control}
                name="supplier_name"
                label="Legal Supplier Name"
                placeholder="e.g. Acme Components Ltd."
                required
              />

              <FormFrappeSelect
                control={form.control}
                name="supplier_group"
                label="Supplier Group"
                doctype="Supplier Group"
                required
              />

              <FormSelect
                control={form.control}
                name="supplier_type"
                label="Organization Type"
                options={[
                  { label: "Company / Corporate", value: "Company" },
                  { label: "Individual / Personal", value: "Individual" },
                ]}
              />
            </div>

            {/* Regional & Financial */}
            <div className="bg-card rounded-[2.5rem] border border-border/50 p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                  <Globe className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-bold text-lg tracking-tight">
                    Financials
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Regional and billing defaults
                  </p>
                </div>
              </div>

              <FormFrappeSelect
                control={form.control}
                name="country"
                label="Country of Residence"
                doctype="Country"
              />

              <FormFrappeSelect
                control={form.control}
                name="default_currency"
                label="Preferred Currency"
                doctype="Currency"
              />

              <FormFrappeSelect
                control={form.control}
                name="default_price_list"
                label="Standard Price List"
                doctype="Price List"
              />
            </div>

            {/* Tax & Misc */}
            <div className="md:col-span-2 bg-card rounded-[2.5rem] border border-border/50 p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                  <Tag className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-bold text-lg tracking-tight">
                    Other Details
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Tax information and account compliance
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormInput
                  control={form.control}
                  name="tax_id"
                  label="Tax ID / VAT Registration"
                  placeholder="e.g. ET-12345678"
                />

                <div className="p-5 rounded-3xl bg-secondary/30 border border-border/50 flex gap-4">
                  <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                  <p className="text-[11px] text-muted-foreground font-medium">
                    Ensure the Supplier Name matches exactly with legal
                    documents to avoid reconciliation errors in Accounts
                    Payable.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6">
            <Button
              type="button"
              variant="ghost"
              className="rounded-2xl px-8 h-12 font-bold"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded-2xl px-12 h-12 font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-3" />
              )}
              Register Supplier
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
