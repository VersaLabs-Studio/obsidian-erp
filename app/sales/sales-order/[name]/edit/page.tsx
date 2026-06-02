"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import {
  ShoppingCart,
  Users,
  Calendar,
  Package,
  CheckCircle2,
  Lock,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/smart";
import { FlowWizard } from "@/components/flows/FlowWizard";
import { useFrappeDoc, useFrappeUpdate } from "@/hooks/generic";
import {
  validateWizardStep,
  salesOrderStepSchemas,
  type StepValidationResult,
} from "@/lib/flows/flow-validation";
import type { WizardStep } from "@/types/flow-types";
import type { SalesOrder } from "@/types/doctype-types";

const MOTION = {
  fast: { duration: 0.15, ease: [0.4, 0, 0.2, 1] as const },
  normal: { duration: 0.25, ease: [0.4, 0, 0.2, 1] as const },
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: MOTION.normal },
};

const SALES_ORDER_EDIT_STEPS: WizardStep[] = [
  {
    id: "step1",
    label: "Customer & Dates",
    description: "Core order details",
    schema: salesOrderStepSchemas.step1,
    fields: [
      "customer",
      "company",
      "transaction_date",
      "delivery_date",
      "po_no",
    ],
    icon: "Users",
  },
  {
    id: "step2",
    label: "Order Items",
    description: "Products and quantities",
    schema: salesOrderStepSchemas.step2,
    fields: ["items", "taxes_and_charges"],
    icon: "Package",
  },
  {
    id: "step3",
    label: "Review & Update",
    description: "Confirm changes",
    schema: salesOrderStepSchemas.step3,
    fields: ["confirmed"],
    icon: "CheckCircle2",
  },
];

interface SalesOrderItem {
  item_code: string;
  item_name?: string;
  description?: string;
  qty: number;
  rate: number;
  amount?: number;
  uom?: string;
}

interface FormData {
  [key: string]: unknown;
  customer: string;
  customer_name: string;
  company: string;
  transaction_date: string;
  delivery_date: string;
  po_no: string;
  currency: string;
  conversion_rate: number;
  selling_price_list: string;
  price_list_currency: string;
  plc_conversion_rate: number;
  order_type: string;
  naming_series: string;
  taxes_and_charges: string;
  tc_name: string;
  items: SalesOrderItem[];
}

function StepCustomerDates({
  formData,
  onFieldChange,
}: {
  formData: FormData;
  onFieldChange: (field: string, value: unknown) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-bold text-lg text-foreground tracking-tight">
          Customer & Dates
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Core order details. Customer is locked after creation.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
            Customer
            <Lock className="inline h-3 w-3 ml-1 text-primary" />
          </label>
          <div className="flex h-12 items-center rounded-xl border border-primary/20 bg-primary/5 px-3 text-sm dark:bg-primary/10">
            <span className="text-foreground font-medium truncate">
              {formData.customer_name || formData.customer || "—"}
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
            Company
            <span className="text-destructive ml-0.5">*</span>
          </label>
          <input
            type="text"
            value={formData.company}
            onChange={(e) => onFieldChange("company", e.target.value)}
            className="flex h-12 w-full rounded-xl border border-input bg-secondary/30 px-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
            Order Date
            <span className="text-destructive ml-0.5">*</span>
          </label>
          <div className="relative">
            <input
              type="date"
              value={formData.transaction_date}
              onChange={(e) =>
                onFieldChange("transaction_date", e.target.value)
              }
              className="flex h-12 w-full rounded-xl border border-input bg-secondary/30 px-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
            Delivery Date
            <span className="text-destructive ml-0.5">*</span>
          </label>
          <div className="relative">
            <input
              type="date"
              value={formData.delivery_date}
              onChange={(e) => onFieldChange("delivery_date", e.target.value)}
              className={cn(
                "flex h-12 w-full rounded-xl border bg-secondary/30 px-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                !formData.delivery_date && "border-destructive/50"
              )}
            />
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
          {!formData.delivery_date && (
            <p className="text-xs text-destructive">
              Delivery date is required
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
            Customer PO No
          </label>
          <input
            type="text"
            value={formData.po_no}
            onChange={(e) => onFieldChange("po_no", e.target.value)}
            placeholder="External reference..."
            className="flex h-12 w-full rounded-xl border border-input bg-secondary/30 px-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
            Order Type
          </label>
          <div className="flex h-12 items-center rounded-xl border border-primary/20 bg-primary/5 px-3 text-sm dark:bg-primary/10">
            <span className="text-foreground font-medium">
              {formData.order_type || "Sales"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepOrderItems({
  formData,
  onFieldChange,
}: {
  formData: FormData;
  onFieldChange: (field: string, value: unknown) => void;
}) {
  const items = formData.items || [];

  const handleItemChange = useCallback(
    (index: number, field: string, value: unknown) => {
      const updated = [...items];
      updated[index] = { ...updated[index], [field]: value };

      if (field === "qty" || field === "rate") {
        const qty = Number(updated[index].qty) || 0;
        const rate = Number(updated[index].rate) || 0;
        updated[index].amount = qty * rate;
      }

      onFieldChange("items", updated);
    },
    [items, onFieldChange]
  );

  const subtotal = useMemo(() => {
    return items.reduce((acc: number, item: SalesOrderItem) => {
      const qty = Number(item.qty) || 0;
      const rate = Number(item.rate) || 0;
      return acc + qty * rate;
    }, 0);
  }, [items]);

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat("en-ET", {
      style: "currency",
      currency: "ETB",
    }).format(amount || 0);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-bold text-lg text-foreground tracking-tight">
          Order Items
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Adjust quantities and rates as needed.
        </p>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/20 border-b border-border">
              <tr>
                <th className="px-4 py-3 text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider w-[25%]">
                  Item
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider w-[30%]">
                  Description
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider w-[12%] text-right">
                  Qty
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider w-[15%] text-right">
                  Rate
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider w-[13%] text-right">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {items.map((item: SalesOrderItem, index: number) => {
                const qty = Number(item.qty) || 0;
                const rate = Number(item.rate) || 0;
                const amount = qty * rate;

                return (
                  <motion.tr
                    key={index}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, ...MOTION.fast }}
                    className="group hover:bg-secondary/10 transition-colors"
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-1.5 h-10 rounded-xl bg-primary/5 px-3 border border-primary/20 dark:bg-primary/10">
                        <Lock className="h-3 w-3 text-primary shrink-0" />
                        <span className="text-sm font-medium text-foreground truncate">
                          {item.item_code || "—"}
                        </span>
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="flex items-center gap-1.5 min-h-[40px] rounded-xl bg-primary/5 px-3 py-2 border border-primary/20 dark:bg-primary/10">
                        <span className="text-xs text-muted-foreground truncate">
                          {item.description || "—"}
                        </span>
                      </div>
                    </td>

                    <td className="p-3">
                      <input
                        type="number"
                        value={item.qty}
                        onChange={(e) =>
                          handleItemChange(index, "qty", Number(e.target.value))
                        }
                        min={0}
                        step={1}
                        className="flex h-10 w-full rounded-xl border border-input bg-secondary/30 px-3 text-sm text-right font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </td>

                    <td className="p-3">
                      <input
                        type="number"
                        value={item.rate}
                        onChange={(e) =>
                          handleItemChange(
                            index,
                            "rate",
                            Number(e.target.value)
                          )
                        }
                        min={0}
                        step={0.01}
                        className="flex h-10 w-full rounded-xl border border-input bg-secondary/30 px-3 text-sm text-right font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </td>

                    <td className="p-3">
                      <div className="h-10 px-3 rounded-xl bg-primary/5 flex items-center justify-end font-semibold text-primary text-sm">
                        {formatCurrency(amount)}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-secondary/5 border-t border-border flex justify-end">
          <div className="text-right">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Subtotal
            </p>
            <p className="text-2xl font-bold tracking-tight text-primary">
              {formatCurrency(subtotal)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
            Tax Template
          </label>
          <input
            type="text"
            value={formData.taxes_and_charges}
            onChange={(e) =>
              onFieldChange("taxes_and_charges", e.target.value)
            }
            placeholder="Select tax template..."
            className="flex h-12 w-full rounded-xl border border-input bg-secondary/30 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="flex items-end">
          <div className="bg-secondary/20 p-4 rounded-2xl border border-border/50 w-full">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-foreground">
                Grand Total Est.
              </span>
              <span className="text-2xl font-black text-primary tracking-tighter">
                {formatCurrency(subtotal)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Package className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <p className="text-sm text-muted-foreground">
            No items to display
          </p>
        </div>
      )}
    </div>
  );
}

function StepReview({
  formData,
  confirmed,
  onConfirmedChange,
}: {
  formData: FormData;
  confirmed: boolean;
  onConfirmedChange: (val: boolean) => void;
}) {
  const items = formData.items || [];
  const subtotal = useMemo(() => {
    return items.reduce((acc: number, item: SalesOrderItem) => {
      const qty = Number(item.qty) || 0;
      const rate = Number(item.rate) || 0;
      return acc + qty * rate;
    }, 0);
  }, [items]);

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat("en-ET", {
      style: "currency",
      currency: "ETB",
    }).format(amount || 0);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-bold text-lg text-foreground tracking-tight">
          Review & Update
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Verify all changes before updating the Sales Order.
        </p>
      </div>

      <div className="bg-card rounded-2xl shadow-lg border border-border/50 p-6 space-y-6">
        <div>
          <h4 className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider mb-3">
            Customer & Dates
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <SummaryField
              label="Customer"
              value={formData.customer_name || formData.customer}
            />
            <SummaryField label="Company" value={formData.company} />
            <SummaryField label="Order Type" value={formData.order_type} />
            <SummaryField
              label="Order Date"
              value={formData.transaction_date}
            />
            <SummaryField
              label="Delivery Date"
              value={formData.delivery_date}
            />
            {formData.po_no && (
              <SummaryField label="Customer PO" value={formData.po_no} />
            )}
            <SummaryField label="Currency" value={formData.currency} />
            <SummaryField
              label="Price List"
              value={formData.selling_price_list}
            />
          </div>
        </div>

        <div className="h-px bg-border" />

        <div>
          <h4 className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider mb-3">
            Order Items ({items.length})
          </h4>
          <div className="rounded-xl border border-border/50 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-secondary/20">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">
                    Qty
                  </th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">
                    Rate
                  </th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {items.map((item: SalesOrderItem, index: number) => (
                  <tr
                    key={index}
                    className="hover:bg-secondary/10 transition-colors"
                  >
                    <td className="px-3 py-2">
                      <span className="font-medium text-foreground">
                        {item.item_code}
                      </span>
                      {item.item_name &&
                        item.item_name !== item.item_code && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({item.item_name})
                          </span>
                        )}
                    </td>
                    <td className="px-3 py-2 text-right font-medium">
                      {item.qty}
                    </td>
                    <td className="px-3 py-2 text-right font-medium">
                      {formatCurrency(item.rate)}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-primary">
                      {formatCurrency(
                        (Number(item.qty) || 0) * (Number(item.rate) || 0)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="h-px bg-border" />

        <div className="flex justify-end">
          <div className="text-right space-y-1">
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Subtotal</span>
              <span className="text-sm font-bold">
                {formatCurrency(subtotal)}
              </span>
            </div>
            {formData.taxes_and_charges && (
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  Tax Template
                </span>
                <span className="text-sm font-medium">
                  {formData.taxes_and_charges}
                </span>
              </div>
            )}
            <div className="h-px bg-border my-2" />
            <div className="flex items-center gap-4">
              <span className="text-base font-bold text-foreground">
                Grand Total
              </span>
              <span className="text-3xl font-black text-primary tracking-tighter">
                {formatCurrency(subtotal)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={MOTION.normal}
        className={cn(
          "flex items-center gap-3 rounded-xl border p-4 cursor-pointer transition-all",
          confirmed
            ? "border-primary/30 bg-primary/5 dark:bg-primary/10"
            : "border-border bg-card hover:border-primary/20"
        )}
        onClick={() => onConfirmedChange(!confirmed)}
      >
        <div
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all",
            confirmed
              ? "border-primary bg-primary text-primary-foreground"
              : "border-muted-foreground/30"
          )}
        >
          {confirmed && <CheckCircle2 className="h-4 w-4" />}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            I confirm all changes are correct
          </p>
          <p className="text-xs text-muted-foreground">
            This will update the Sales Order document
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function SummaryField({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">
        {label}
      </p>
      <p className="text-sm font-medium text-foreground mt-0.5 truncate">
        {value || "—"}
      </p>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="h-14 rounded-full bg-muted animate-pulse" />
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
            <div className="h-3 w-20 rounded bg-muted animate-pulse" />
            {i < 3 && <div className="h-px w-8 bg-muted" />}
          </div>
        ))}
      </div>
      <div className="space-y-4">
        <div className="h-6 w-48 rounded bg-muted animate-pulse" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-12 rounded-xl bg-muted animate-pulse"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function EditSalesOrderPage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(params.name as string);

  const [currentStep, setCurrentStep] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    customer: "",
    customer_name: "",
    company: "",
    transaction_date: "",
    delivery_date: "",
    po_no: "",
    currency: "ETB",
    conversion_rate: 1,
    selling_price_list: "Standard Selling",
    price_list_currency: "ETB",
    plc_conversion_rate: 1,
    order_type: "Sales",
    naming_series: "SAL-ORD-.YYYY.-",
    taxes_and_charges: "",
    tc_name: "",
    items: [],
  });

  const {
    data: order,
    isLoading: isOrderLoading,
    error: orderError,
  } = useFrappeDoc<SalesOrder>("Sales Order", name);

  useEffect(() => {
    if (!order) return;

    if (order.docstatus !== 0) {
      toast.error("Only draft orders can be edited");
      router.replace(`/sales/sales-order/${encodeURIComponent(name)}`);
      return;
    }

    const items =
      (order.items as Array<Record<string, unknown>>)?.map((i) => ({
        item_code: String(i.item_code ?? ""),
        item_name: i.item_name ? String(i.item_name) : undefined,
        description: i.description ? String(i.description) : undefined,
        qty: Number(i.qty) || 0,
        rate: Number(i.rate) || 0,
        amount: Number(i.amount) || 0,
        uom: i.uom ? String(i.uom) : "Nos",
      })) || [];

    setFormData({
      customer: order.customer || "",
      customer_name: order.customer_name || "",
      company: order.company || "",
      transaction_date: order.transaction_date || "",
      delivery_date: order.delivery_date || "",
      po_no: order.po_no || "",
      currency: order.currency || "ETB",
      conversion_rate: order.conversion_rate || 1,
      selling_price_list: order.selling_price_list || "Standard Selling",
      price_list_currency: order.price_list_currency || "ETB",
      plc_conversion_rate: order.plc_conversion_rate || 1,
      order_type: order.order_type || "Sales",
      naming_series: order.naming_series || "SAL-ORD-.YYYY.-",
      taxes_and_charges: order.taxes_and_charges || "",
      tc_name: order.tc_name || "",
      items: items.length > 0 ? items : [],
    });
  }, [order, name, router]);

  const validationResults = useMemo((): Record<string, StepValidationResult> => {
    const step1Data = {
      customer: formData.customer,
      company: formData.company,
      transaction_date: formData.transaction_date,
      delivery_date: formData.delivery_date,
      currency: formData.currency,
      selling_price_list: formData.selling_price_list,
      order_type: formData.order_type,
      territory: "",
      customer_address: "",
      shipping_address_name: "",
      contact_person: "",
    };

    const step2Data = {
      items: formData.items.map((item) => ({
        item_code: item.item_code,
        qty: item.qty,
        rate: item.rate,
        amount: item.amount,
        uom: item.uom,
        warehouse: "",
        description: item.description,
      })),
    };

    const step3Data = { confirmed };

    return {
      step1: validateWizardStep("Sales Order", "step1", step1Data),
      step2: validateWizardStep("Sales Order", "step2", step2Data),
      step3: validateWizardStep("Sales Order", "step3", step3Data),
    };
  }, [formData, confirmed]);

  const handleFieldChange = useCallback(
    (field: string, value: unknown) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleStepChange = useCallback((step: number) => {
    setCurrentStep(step);
  }, []);

  const updateMutation = useFrappeUpdate<
    { data: { name: string } },
    { name: string; data: Record<string, unknown> }
  >("Sales Order", {
    successMessage: "Sales Order updated successfully",
    onSuccess: () => {
      router.push(`/sales/sales-order/${encodeURIComponent(name)}`);
    },
    onError: () => {},
  });

  const handleSubmit = useCallback(() => {
    const allValid = Object.values(validationResults).every((r) => r.valid);
    if (!allValid) {
      toast.error("Please fix validation errors before submitting");
      return;
    }

    if (!confirmed) {
      toast.error("Please confirm the order details");
      return;
    }

    const validItems = formData.items.filter(
      (item) => item.item_code && item.qty > 0
    );

    if (validItems.length === 0) {
      toast.error("Please add at least one item with quantity");
      return;
    }

    const payload = {
      company: formData.company,
      transaction_date: formData.transaction_date,
      delivery_date: formData.delivery_date,
      po_no: formData.po_no || undefined,
      order_type: formData.order_type,
      currency: formData.currency,
      conversion_rate: formData.conversion_rate,
      selling_price_list: formData.selling_price_list,
      price_list_currency: formData.price_list_currency,
      plc_conversion_rate: formData.plc_conversion_rate,
      taxes_and_charges: formData.taxes_and_charges || undefined,
      tc_name: formData.tc_name || undefined,
      items: validItems.map((item) => ({
        item_code: item.item_code,
        item_name: item.item_name,
        description: item.description,
        qty: item.qty,
        rate: item.rate,
        amount: item.qty * item.rate,
        uom: item.uom,
      })),
    };

    updateMutation.mutate({ name, data: payload });
  }, [formData, confirmed, validationResults, updateMutation, name]);

  const handleCancel = useCallback(() => {
    router.push(`/sales/sales-order/${encodeURIComponent(name)}`);
  }, [router, name]);

  const renderStep = useCallback(
    (step: WizardStep) => {
      switch (step.id) {
        case "step1":
          return (
            <StepCustomerDates
              formData={formData}
              onFieldChange={handleFieldChange}
            />
          );
        case "step2":
          return (
            <StepOrderItems
              formData={formData}
              onFieldChange={handleFieldChange}
            />
          );
        case "step3":
          return (
            <StepReview
              formData={formData}
              confirmed={confirmed}
              onConfirmedChange={setConfirmed}
            />
          );
        default:
          return null;
      }
    },
    [formData, handleFieldChange, confirmed]
  );

  if (isOrderLoading) {
    return (
      <div className="space-y-6 pb-20">
        <PageHeader
          title="Edit Sales Order"
          subtitle="Loading..."
          backHref={`/sales/sales-order/${encodeURIComponent(name)}`}
        />
        <div className="max-w-4xl mx-auto">
          <PageSkeleton />
        </div>
      </div>
    );
  }

  if (orderError || !order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <ShoppingCart className="h-8 w-8 text-destructive" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold text-foreground">
            Failed to load Sales Order
          </h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {orderError?.message || "Sales Order not found"}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() =>
            router.push(`/sales/sales-order/${encodeURIComponent(name)}`)
          }
        >
          Back to Order
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 pb-20"
    >
      <motion.div variants={itemVariants}>
        <PageHeader
          title={`Edit ${order.name}`}
          subtitle={order.customer_name || order.customer}
          backHref={`/sales/sales-order/${encodeURIComponent(name)}`}
        />
      </motion.div>

      <motion.div variants={itemVariants} className="max-w-4xl mx-auto">
        <FlowWizard
          steps={SALES_ORDER_EDIT_STEPS}
          formData={formData}
          validationResults={validationResults}
          isSubmitting={updateMutation.isPending}
          onFormDataChange={(data) => setFormData(data as FormData)}
          onStepChange={handleStepChange}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          renderStep={renderStep}
          submitLabel="Update Sales Order"
          submittingLabel="Updating..."
        />
      </motion.div>
    </motion.div>
  );
}
