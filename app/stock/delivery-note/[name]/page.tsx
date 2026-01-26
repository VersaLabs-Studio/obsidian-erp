// @ts-nocheck
"use client";

import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Pencil,
  Trash2,
  Truck,
  Package,
  MapPin,
  User,
  Calendar,
  CheckCircle2,
  XCircle,
  FileText,
  Receipt,
  RotateCcw,
  Building2,
  Printer,
  CreditCard,
  Lock,
} from "lucide-react";
import {
  useFrappeDoc,
  useFrappeDelete,
  useFrappeUpdate,
} from "@/hooks/generic";
import {
  PageHeader,
  LoadingState,
  EmptyState,
  ConfirmDialog,
} from "@/components/smart";
import { InfoCard, DataPoint } from "@/components/ui/info-card";
import { useState } from "react";
import { toast } from "sonner";
import type { DeliveryNote } from "@/types/doctype-types";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

const STATUS_CONFIG = {
  Draft: {
    color: "text-slate-600",
    bg: "bg-slate-50",
    border: "border-slate-200",
    icon: Pencil,
  },
  "To Bill": {
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: FileText,
  },
  Completed: {
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    icon: CheckCircle2,
  },
  Return: {
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
    icon: RotateCcw,
  },
  Cancelled: {
    color: "text-gray-400",
    bg: "bg-gray-50",
    border: "border-gray-200",
    icon: XCircle,
  },
  Closed: {
    color: "text-gray-500",
    bg: "bg-gray-50",
    border: "border-gray-200",
    icon: Lock,
  },
};

export default function DeliveryNoteDetailPage() {
  const { name } = useParams();
  const router = useRouter();
  const dnName = decodeURIComponent(name as string);
  const [showDelete, setShowDelete] = useState(false);

  const {
    data: dn,
    isLoading,
    refetch,
    error,
  } = useFrappeDoc<DeliveryNote>("Delivery Note", dnName);

  const deleteMutation = useFrappeDelete("Delivery Note", {
    onSuccess: () => {
      toast.success("Delivery Note deleted");
      router.push("/stock/delivery-note");
    },
  });

  const updateMutation = useFrappeUpdate("Delivery Note", {
    onSuccess: () => {
      refetch();
    },
  });

  if (isLoading) return <LoadingState type="detail" />;
  if (error || !dn)
    return <EmptyState icon={Truck} title="Delivery Note not found" />;

  const statusConfig = STATUS_CONFIG[dn.status] || STATUS_CONFIG.Draft;
  const isDraft = dn.docstatus === 0;
  const canInvoice = dn.status === "To Bill";
  const isReturn = dn.is_return === 1;

  const handleSubmit = async () => {
    await updateMutation.mutateAsync({ name: dnName, data: { docstatus: 1 } });
    toast.success("Delivery Note submitted. Stock has been deducted.");
  };

  const handlePrintGatePass = () => {
    toast.info("Opening Gate Pass for printing...");
    // Mock: in production this would open a PDF report URL from Frappe
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={dn.name}
        subtitle={`Delivery to ${dn.customer_name || dn.customer}`}
        backHref="/stock/delivery-note"
        icon={<Truck className="h-5 w-5 text-primary" />}
        actions={
          <div className="flex gap-2">
            {isDraft && (
              <>
                <Button
                  variant="outline"
                  className="rounded-full h-9"
                  onClick={() =>
                    router.push(
                      `/stock/delivery-note/${encodeURIComponent(dnName)}/edit`,
                    )
                  }
                >
                  <Pencil className="h-4 w-4 mr-2" /> Edit
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={updateMutation.isPending}
                  className="rounded-full h-9 shadow-lg shadow-primary/10"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Submit
                </Button>
              </>
            )}

            {canInvoice && (
              <Button
                onClick={() =>
                  router.push(
                    `/accounting/sales-invoice/new?delivery_note=${encodeURIComponent(dnName)}`,
                  )
                }
                className="rounded-full h-9 shadow-lg shadow-emerald-500/10 bg-emerald-600 hover:bg-emerald-700"
              >
                <Receipt className="h-4 w-4 mr-2" /> Create Invoice
              </Button>
            )}

            <Button
              variant="outline"
              onClick={handlePrintGatePass}
              className="rounded-full h-9"
            >
              <Printer className="h-4 w-4 mr-2" /> Gate Pass
            </Button>

            {isDraft && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDelete(true)}
                className="rounded-full h-9 w-9 text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        }
      />

      {/* Status & Summary Bar */}
      <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <Badge
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-bold border shadow-sm",
                statusConfig.bg,
                statusConfig.color,
                statusConfig.border,
              )}
            >
              <statusConfig.icon className="h-4 w-4 mr-2" />
              {dn.status}
            </Badge>
            {isReturn && (
              <Badge className="bg-red-100 text-red-600 border-red-200 rounded-full px-3 py-1">
                Return Delivery
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-6 text-sm">
            <DataPoint
              icon={<Calendar className="h-4 w-4 text-blue-500" />}
              label="Date"
              value={
                dn.posting_date ? format(parseISO(dn.posting_date), "PPP") : "—"
              }
            />
            <DataPoint
              icon={<Package className="h-4 w-4 text-emerald-500" />}
              label="Items"
              value={`${dn.total_qty || 0} units`}
            />
            {dn.grand_total && (
              <DataPoint
                icon={<CreditCard className="h-4 w-4 text-primary" />}
                label="Value"
                value={`ETB ${dn.grand_total.toLocaleString()}`}
              />
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Items Table */}
          <InfoCard
            title="Delivered Items"
            icon={<Package className="h-5 w-5 text-emerald-500" />}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-muted-foreground">
                    <th className="text-left py-3 px-2 font-medium uppercase text-[10px] tracking-widest">
                      Item
                    </th>
                    <th className="text-right py-3 px-2 font-medium uppercase text-[10px] tracking-widest">
                      Qty
                    </th>
                    <th className="text-right py-3 px-2 font-medium uppercase text-[10px] tracking-widest">
                      Rate
                    </th>
                    <th className="text-right py-3 px-2 font-medium uppercase text-[10px] tracking-widest">
                      Amount
                    </th>
                    <th className="text-left py-3 px-2 font-medium uppercase text-[10px] tracking-widest">
                      Warehouse
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dn.items?.map((item: any, idx: number) => (
                    <tr
                      key={idx}
                      className="border-b border-border/20 hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-4 px-2">
                        <div className="font-bold text-foreground">
                          {item.item_name || item.item_code}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {item.item_code}
                        </div>
                      </td>
                      <td className="text-right py-4 px-2 font-black">
                        {item.qty} {item.uom}
                      </td>
                      <td className="text-right py-4 px-2 text-muted-foreground">
                        {item.rate?.toLocaleString()}
                      </td>
                      <td className="text-right py-4 px-2 font-bold">
                        {item.amount?.toLocaleString()}
                      </td>
                      <td className="py-4 px-2 text-muted-foreground text-xs">
                        {item.warehouse}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-secondary/20">
                    <td
                      colSpan={3}
                      className="text-right py-4 px-2 font-black uppercase text-xs"
                    >
                      Grand Total
                    </td>
                    <td className="text-right py-4 px-2 font-black text-lg text-primary">
                      ETB {dn.grand_total?.toLocaleString()}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </InfoCard>
        </div>

        <div className="space-y-6">
          {/* Customer Info */}
          <InfoCard
            title="Customer Details"
            icon={<Building2 className="h-5 w-5 text-primary" />}
          >
            <div className="space-y-4">
              <div className="p-4 bg-secondary/20 rounded-xl">
                <p className="font-bold text-lg">
                  {dn.customer_name || dn.customer}
                </p>
                <p className="text-xs text-muted-foreground font-mono">
                  {dn.customer}
                </p>
              </div>

              {dn.shipping_address && (
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-2">
                    Shipping To
                  </p>
                  <div className="p-3 bg-blue-500/5 rounded-xl border border-blue-500/10 text-sm">
                    <div
                      dangerouslySetInnerHTML={{ __html: dn.shipping_address }}
                    />
                  </div>
                </div>
              )}
            </div>
          </InfoCard>

          {/* Logistics Info */}
          <InfoCard
            title="Logistics"
            icon={<Truck className="h-5 w-5 text-amber-500" />}
          >
            <div className="space-y-3">
              {dn.driver_name && (
                <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-bold text-sm">{dn.driver_name}</p>
                    <p className="text-[10px] text-muted-foreground">Driver</p>
                  </div>
                </div>
              )}
              {dn.vehicle_no && (
                <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl">
                  <Truck className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-bold font-mono">{dn.vehicle_no}</p>
                    <p className="text-[10px] text-muted-foreground">Vehicle</p>
                  </div>
                </div>
              )}
              {dn.transporter_name && (
                <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-bold text-sm">{dn.transporter_name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Transporter
                    </p>
                  </div>
                </div>
              )}
              {dn.lr_no && (
                <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/10">
                  <p className="text-[10px] font-bold uppercase text-amber-600">
                    Gate Pass / LR No
                  </p>
                  <p className="font-mono font-bold">{dn.lr_no}</p>
                </div>
              )}
            </div>
          </InfoCard>
        </div>
      </div>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={() => setShowDelete(false)}
        title="Delete Delivery Note?"
        description="This action cannot be undone."
        onConfirm={() => deleteMutation.mutateAsync(dnName)}
        loading={deleteMutation.isPending}
        variant="destructive"
      />
    </div>
  );
}
