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
import { Warehouse, ArrowLeft, Save, Loader2, RotateCcw, Eye, EyeOff, ShieldAlert } from "lucide-react";

import { PageHeader } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import { Button } from "@/components/ui/button";
import { FormFrappeSelect } from "@/components/form";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { cn } from "@/lib/utils";
import { getActiveCompany } from "@/lib/settings/company";
import {
  useWarehouseDefaults,
  useUpdateWarehouseDefaults,
  type WarehouseDefaults,
} from "@/lib/stock/warehouse-defaults";
// 2Y Part 8 — Implicit warehouse admin escape hatch.
import { getShowPickersOverride, setShowPickersOverride } from "@/lib/stock/implicit-warehouses";

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

  const form = useForm<{
    sourceWarehouse: string;
    fgWarehouse: string;
    wipWarehouse: string;
    scrapWarehouse: string;
    allowNegativeStock: boolean;
  }>({
    defaultValues: {
      sourceWarehouse: "",
      fgWarehouse: "",
      wipWarehouse: "",
      scrapWarehouse: "",
      allowNegativeStock: false,
    },
  });

  // Hydrate form when defaults load
  useEffect(() => {
    if (defaults) {
      form.reset({
        sourceWarehouse: defaults.sourceWarehouse,
        fgWarehouse: defaults.fgWarehouse,
        wipWarehouse: defaults.wipWarehouse,
        scrapWarehouse: defaults.scrapWarehouse,
        allowNegativeStock: defaults.allowNegativeStock ?? false,
      });
    }
  }, [defaults, form]);

  // 2Y Part 8 — Admin escape hatch: toggle to show/hide warehouse pickers.
  const [showPickers, setShowPickersState] = useState(getShowPickersOverride());
  const handleTogglePickers = (show: boolean) => {
    setShowPickersOverride(show);
    setShowPickersState(show);
    toast.success(show ? "Warehouse pickers shown" : "Warehouse pickers hidden (implicit mode)", {
      description: show
        ? "All create forms will display warehouse fields for manual override."
        : "All create forms will auto-resolve warehouses from saved defaults.",
    });
  };

  const handleSubmit = (data: {
    sourceWarehouse: string;
    fgWarehouse: string;
    wipWarehouse: string;
    scrapWarehouse: string;
    allowNegativeStock: boolean;
  }) => {
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

              {/* 2Y-R3 — Allow Negative Stock toggle (G1) */}
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-border/50 bg-secondary/20 p-4">
                <ShieldAlert className="h-5 w-5 shrink-0 text-amber-500" />
                <div className="flex flex-1 items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Allow Negative Stock
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Permit transactions that reduce stock below zero. Useful for
                      fast-moving SMEs that bill before physical receipt.
                    </p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      {...form.register("allowNegativeStock")}
                    />
                    <div className="h-6 w-11 rounded-full bg-secondary peer-checked:bg-primary transition-colors" />
                    <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
                  </label>
                </div>
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

             {/* 2Y Part 8 — Admin escape hatch for implicit warehouses. */}
             <InfoCard title="Implicit Warehouse Mode" icon={<Eye className="h-5 w-5 text-primary" />}>
               <div className="space-y-4">
                 <p className="text-sm text-muted-foreground">
                   When <strong className="text-foreground">Implicit Mode</strong> is ON (default), create forms
                   auto-resolve warehouses from the defaults above and hide the pickers. This reduces form
                   complexity and ensures consistent warehouse usage across the organization.
                 </p>
                 <p className="text-sm text-muted-foreground">
                   Toggle <strong className="text-foreground">Show Pickers</strong> to reveal warehouse fields in
                   all create forms — useful for one-off overrides or during initial setup.
                 </p>
                 <div className="flex items-center gap-4">
                   <Button
                     type="button"
                     variant={showPickers ? "default" : "outline"}
                     size="sm"
                     onClick={() => handleTogglePickers(true)}
                   >
                     <Eye className="mr-1.5 h-4 w-4" /> Show Pickers
                   </Button>
                   <Button
                     type="button"
                     variant={!showPickers ? "default" : "outline"}
                     size="sm"
                     onClick={() => handleTogglePickers(false)}
                   >
                     <EyeOff className="mr-1.5 h-4 w-4" /> Implicit Mode
                   </Button>
                   <span className={cn(
                     "text-xs font-medium",
                     showPickers ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400",
                   )}>
                     {showPickers ? "Pickers visible" : "Implicit mode active"}
                   </span>
                 </div>
               </div>
             </InfoCard>
          </motion.div>
        </form>
      </Form>
    </motion.div>
  );
}
