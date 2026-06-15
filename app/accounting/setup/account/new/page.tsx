"use client";

import { useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
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
import {
  Plus,
  Loader2,
  Wallet,
  Building2,
  Network,
  ArrowRightCircle,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useFrappeCreate, useFrappeDoc } from "@/hooks/generic";
import { PageHeader, LoadingState } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import {
  FormFrappeSelect,
  FormSelect,
  FormSwitch,
  FormInput,
} from "@/components/form";
import { AccountCreateSchema } from "@/lib/schemas/doctype-schemas";
import type { Account } from "@/types/doctype-types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function CreateAccountForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const parentAccount = searchParams.get("parent_account");

  const form = useForm({
    resolver: zodResolver(AccountCreateSchema),
    defaultValues: {
      account_name: "",
      account_number: "",
      parent_account: parentAccount || "",
      company: "",
      root_type: "Asset",
      account_type: "",
      is_group: 0,
      freeze_account: "No",
      disabled: 0,
    },
  });

  const { control, handleSubmit, watch, setValue } = form;

  // Fetch Parent Details to inherit root type
  const selectedParent = watch("parent_account");
  const { data: parentData } = useFrappeDoc<Account>(
    "Account",
    selectedParent || "",
    {
      enabled: !!selectedParent,
    },
  );

  useMemo(() => {
    if (parentData) {
      if (parentData.root_type) {
        setValue("root_type", parentData.root_type as any);
      }
    }
  }, [parentData, setValue]);

  const createMutation = useFrappeCreate<{ data: Account }, any>("Account", {
    onSuccess: (data) => {
      toast.success("Account created successfully");
      router.push("/accounting/setup/account");
    },
  });

  const onSubmit = async (values: any) => {
    await createMutation.mutateAsync(values);
  };

  return (
    <div className="space-y-8 pb-24 max-w-5xl mx-auto">
      <PageHeader
        title="Add New Account"
        subtitle="Create a new node in your Chart of Accounts"
        backUrl="/accounting/setup/account"
      />

      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <InfoCard
            title="Account Details"
            icon={<Network className="h-4 w-4" />}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <FormInput
                  control={control}
                  name="account_name"
                  label="Account Name"
                  required
                  placeholder="e.g. Petty Cash"
                />
                <FormInput
                  control={control}
                  name="account_number"
                  label="Account Number (Optional)"
                  placeholder="e.g. 1110"
                />
                <FormFrappeSelect
                  control={control}
                  name="company"
                  label="Company"
                  required
                  doctype="Company"
                  labelField="company_name"
                />
              </div>

              <div className="space-y-6">
                <FormFrappeSelect
                  control={control}
                  name="parent_account"
                  label="Parent Account"
                  doctype="Account"
                  placeholder="Select parent..."
                  filters={[["is_group", "=", 1]]}
                />
                <FormSelect
                  control={control}
                  name="root_type"
                  label="Root Type"
                  options={[
                    { value: "Asset", label: "Asset" },
                    { value: "Liability", label: "Liability" },
                    { value: "Equity", label: "Equity" },
                    { value: "Income", label: "Income" },
                    { value: "Expense", label: "Expense" },
                  ]}
                />
                <FormSelect
                  control={control}
                  name="account_type"
                  label="Account Type (Optional)"
                  options={[
                    { value: "", label: "Default" },
                    { value: "Bank", label: "Bank" },
                    { value: "Cash", label: "Cash" },
                    { value: "Receivable", label: "Receivable" },
                    { value: "Payable", label: "Payable" },
                    { value: "Stock", label: "Stock" },
                    { value: "Tax", label: "Tax" },
                    { value: "Chargeable", label: "Chargeable" },
                  ]}
                />
              </div>
            </div>
          </InfoCard>

          <InfoCard
            title="Account Settings"
            icon={<ArrowRightCircle className="h-4 w-4" />}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <FormSwitch
                control={control}
                name="is_group"
                label="Is Group"
                description="Can contain child accounts"
              />
              <FormSelect
                control={control}
                name="freeze_account"
                label="Freeze Account"
                options={[
                  { value: "No", label: "No" },
                  { value: "Yes", label: "Yes" },
                ]}
              />
              <FormSwitch
                control={control}
                name="disabled"
                label="Disabled"
                description="Hide from selection"
              />
            </div>
          </InfoCard>

          <div className="flex justify-end gap-3 sticky bottom-6 z-10 glass-card p-4 rounded-2xl shadow-xl">
            <Button
              type="button"
              variant="outline"
              className="rounded-full px-10"
              onClick={() => router.push("/accounting/setup/account")}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-full px-12 shadow-lg shadow-primary/20 bg-primary text-primary-foreground font-black"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Create Account
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

export default function NewAccountPage() {
  return (
    <Suspense fallback={<LoadingState type="detail" />}>
      <CreateAccountForm />
    </Suspense>
  );
}
