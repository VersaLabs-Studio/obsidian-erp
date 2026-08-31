"use client";

// app/accounting/settings/payment-defaults/page.tsx
// Obsidian ERP v4.1.1 — Default Mode of Payment Settings (D1).
//
// Cloned from the warehouse-defaults page pattern. The operator picks a
// Mode of Payment once; the Mark-as-Paid dialog on SI/PI detail pages
// prefills from this config.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { CreditCard, ArrowLeft, Save, Loader2, RotateCcw } from "lucide-react";

import { PageHeader } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import { Button } from "@/components/ui/button";
import { FormFrappeSelect } from "@/components/form";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { cn } from "@/lib/utils";
import {
  usePaymentDefaults,
  useUpdatePaymentDefaults,
  type PaymentDefaults,
} from "@/lib/accounting/payment-defaults";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

export default function PaymentDefaultsPage() {
  const router = useRouter();

  const { data: defaults, isLoading } = usePaymentDefaults();
  const updateMutation = useUpdatePaymentDefaults();

  const form = useForm<PaymentDefaults>({
    defaultValues: {
      defaultModeOfPayment: "",
    },
  });

  // Hydrate form when defaults load
  useEffect(() => {
    if (defaults) {
      form.reset(defaults);
    }
  }, [defaults, form]);

  const handleSubmit = (data: PaymentDefaults) => {
    updateMutation.mutate(data, {
      onSuccess: () => {
        toast.success("Payment defaults saved", {
          description: "Mark-as-Paid dialogs will now prefill this mode.",
        });
      },
      onError: (err) => {
        toast.error("Failed to save defaults", {
          description: err.message,
        });
      },
    });
  };

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="space-y-6 pb-12"
    >
      <motion.div variants={fadeIn}>
        <PageHeader
          title="Default Mode of Payment"
          subtitle="Set the default payment mode for Mark-as-Paid actions"
          backHref="/accounting/settings"
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => form.reset(defaults)}
              disabled={updateMutation.isPending}
            >
              <RotateCcw className="mr-1.5 h-4 w-4" /> Reset
            </Button>
          }
        />
      </motion.div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <motion.div variants={fadeIn} className="space-y-6">
            <InfoCard
              title="Mode of Payment"
              icon={<CreditCard className="h-5 w-5 text-primary" />}
            >
              <p className="mb-6 text-sm text-muted-foreground">
                This mode of payment is pre-filled in the "Mark as Paid" dialog on
                Sales Invoice and Purchase Invoice detail pages. The operator can
                still override it per transaction.
              </p>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <FormFrappeSelect
                  control={form.control}
                  name="defaultModeOfPayment"
                  label="Default Mode of Payment"
                  doctype="Mode of Payment"
                  placeholder="Select default mode..."
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => router.back()}
                  disabled={updateMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-1.5 h-4 w-4" />
                  )}
                  Save Defaults
                </Button>
              </div>
            </InfoCard>

            <InfoCard title="How It Works">
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  <strong className="text-foreground">Default Mode of Payment</strong> —
                  The payment mode pre-selected in the "Mark as Paid" dialog on
                  Sales Invoice and Purchase Invoice detail pages.
                </p>
                <p>
                  <strong className="text-foreground">Overrides allowed</strong> —
                  Operators can still pick a different mode per invoice; this is
                  merely the default for convenience.
                </p>
              </div>
            </InfoCard>
          </motion.div>
        </form>
      </Form>
    </motion.div>
  );
}
