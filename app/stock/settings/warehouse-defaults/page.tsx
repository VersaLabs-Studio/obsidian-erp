"use client";

// app/stock/settings/warehouse-defaults/page.tsx
// Obsidian ERP v4.0 — Global Default Warehouse Settings (2T §2 T1).
//
// User sets Source / FG / WIP / Scrap warehouses once; persists into
// ERPNext Manufacturing Settings + Stock Settings singles. Config lib
// auto-prefills warehouse fields in all create forms.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Warehouse, ArrowLeft, Save, Loader2, RotateCcw } from "lucide-react";

import { PageHeader } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import { Button } from "@/components/ui/button";
import { FormFrappeSelect } from "@/components/form";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { getActiveCompany } from "@/lib/settings/company";
import {
  useWarehouseDefaults,
  useUpdateWarehouseDefaults,
  type WarehouseDefaults,
} from "@/lib/stock/warehouse-defaults";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

export default function WarehouseDefaultsPage() {
  const router = useRouter();
  const company = getActiveCompany();

  const { data: defaults, isLoading } = useWarehouseDefaults();
  const updateMutation = useUpdateWarehouseDefaults();

  const form = useForm<WarehouseDefaults>({
    defaultValues: {
      sourceWarehouse: "",
      fgWarehouse: "",
      wipWarehouse: "",
      scrapWarehouse: "",
    },
  });

  // Hydrate form when defaults load
  useEffect(() => {
    if (defaults) {
      form.reset(defaults);
    }
  }, [defaults, form]);

  const handleSubmit = (data: WarehouseDefaults) => {
    updateMutation.mutate(data, {
      onSuccess: () => {
        toast.success("Warehouse defaults saved", {
          description: "Create forms will now auto-prefill these warehouses.",
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
          title="Default Warehouses"
          subtitle="Set system-wide default warehouses for all transactional documents"
          backHref="/stock/settings"
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
              title="Warehouse Defaults"
              icon={<Warehouse className="h-5 w-5 text-primary" />}
            >
              <p className="mb-6 text-sm text-muted-foreground">
                These defaults are applied to all create forms (Work Order, Stock Entry, Delivery Note,
                Purchase Receipt, etc.). Fields remain visible and editable — the system just prefills them.
              </p>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <FormFrappeSelect
                  control={form.control}
                  name="sourceWarehouse"
                  label="Source / Default Warehouse"
                  doctype="Warehouse"
                  filters={[["company", "=", company], ["is_group", "=", 0]]}
                  placeholder="Select source warehouse..."
                />
                <FormFrappeSelect
                  control={form.control}
                  name="fgWarehouse"
                  label="Finished-Goods Warehouse"
                  doctype="Warehouse"
                  filters={[["company", "=", company], ["is_group", "=", 0]]}
                  placeholder="Select FG warehouse..."
                />
                <FormFrappeSelect
                  control={form.control}
                  name="wipWarehouse"
                  label="Work-in-Progress Warehouse"
                  doctype="Warehouse"
                  filters={[["company", "=", company], ["is_group", "=", 0]]}
                  placeholder="Select WIP warehouse..."
                />
                <FormFrappeSelect
                  control={form.control}
                  name="scrapWarehouse"
                  label="Scrap / Rejected Warehouse"
                  doctype="Warehouse"
                  filters={[["company", "=", company], ["is_group", "=", 0]]}
                  placeholder="Select scrap warehouse..."
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
                  <strong className="text-foreground">Source Warehouse</strong> — Default warehouse for stock movements (Stock Settings.default_warehouse).
                  Used in Delivery Note, Purchase Receipt, Material Request, and Stock Entry create forms.
                </p>
                <p>
                  <strong className="text-foreground">Finished-Goods Warehouse</strong> — Where completed production items are stored (Manufacturing Settings.default_fg_warehouse).
                  Required for Work Order creation and SO→WO automation.
                </p>
                <p>
                  <strong className="text-foreground">WIP Warehouse</strong> — Work-in-progress staging area (Manufacturing Settings.default_wip_warehouse).
                  Required for Work Order creation.
                </p>
                <p>
                  <strong className="text-foreground">Scrap Warehouse</strong> — For rejected/scrap materials (Manufacturing Settings.default_scrap_warehouse).
                  Optional; used in manufacturing operations.
                </p>
              </div>
            </InfoCard>
          </motion.div>
        </form>
      </Form>
    </motion.div>
  );
}
