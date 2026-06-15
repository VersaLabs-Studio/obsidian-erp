"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import {
  Plus,
  Loader2,
  CreditCard,
  CheckCircle2,
  Wallet,
  Settings2,
} from "lucide-react";
import { useFrappeCreate } from "@/hooks/generic";
import { PageHeader } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import { FormSelect, FormSwitch, FormInput } from "@/components/form";
import { ModeOfPaymentCreateSchema } from "@/lib/schemas/doctype-schemas";
import type { ModeOfPayment } from "@/types/doctype-types";
import { toast } from "sonner";

export default function CreateModeOfPaymentPage() {
  const router = useRouter();

  const form = useForm({
    resolver: zodResolver(ModeOfPaymentCreateSchema),
    defaultValues: {
      mode_of_payment: "",
      type: "Cash",
      enabled: 1,
    },
  });

  const { control, handleSubmit } = form;

  const createMutation = useFrappeCreate<{ data: ModeOfPayment }, any>(
    "Mode of Payment",
    {
      onSuccess: (data) => {
        toast.success("Mode of Payment created successfully");
        router.push("/accounting/setup/mode-of-payment");
      },
    },
  );

  const onSubmit = async (values: any) => {
    await createMutation.mutateAsync(values);
  };

  return (
    <div className="space-y-8 pb-24 max-w-4xl mx-auto">
      <PageHeader
        title="Add Mode of Payment"
        subtitle="Define a new method for handling transactions"
        backUrl="/accounting/setup/mode-of-payment"
      />

      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <InfoCard
            title="Payment Method Configuration"
            icon={<CreditCard className="h-4 w-4" />}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <FormInput
                  control={control}
                  name="mode_of_payment"
                  label="Name"
                  required
                  placeholder="e.g. CBE Bank Transfer"
                />
                <FormSelect
                  control={control}
                  name="type"
                  label="Category"
                  required
                  options={[
                    { value: "Cash", label: "Cash / Petty Cash" },
                    { value: "Bank", label: "Bank Transfer / Check" },
                    {
                      value: "Phone",
                      label: "Mobile Money (Telebirr, M-Pesa)",
                    },
                    { value: "General", label: "General / Other" },
                  ]}
                />
              </div>
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-secondary/10 border border-border/50 h-full flex flex-col justify-center">
                  <FormSwitch
                    control={control}
                    name="enabled"
                    label="Available for Transactions"
                    description="If disabled, this mode won't appear in payment selections."
                  />
                </div>
              </div>
            </div>
          </InfoCard>

          <div className="flex justify-end gap-3 sticky bottom-6 z-10 glass-card p-4 rounded-2xl shadow-xl">
            <Button
              type="button"
              variant="outline"
              className="rounded-full px-10 font-bold"
              onClick={() => router.push("/accounting/setup/mode-of-payment")}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-full px-12 shadow-lg shadow-primary/20 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[11px]"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Save Payment Mode
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
