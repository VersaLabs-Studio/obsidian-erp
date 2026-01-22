// @ts-nocheck
"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useFrappeDoc, useFrappeUpdate } from "@/hooks/generic";
import { PageHeader, LoadingState, EmptyState } from "@/components/smart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingCart,
  Building2,
  Truck,
  Calendar,
  CreditCard,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  ArrowUpRight,
  TrendingUp,
  FileSearch,
  Plus,
  Pencil,
  Trash2,
  Printer,
  ChevronRight,
  Info,
  Layers,
  MoreVertical,
  Briefcase,
  History,
  FileCheck,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const STATUS_CONFIG = {
  Draft: { color: "text-slate-600", bg: "bg-slate-100", icon: Clock },
  "To Receive and Bill": {
    color: "text-amber-600",
    bg: "bg-amber-100",
    icon: Truck,
  },
  "To Receive": { color: "text-blue-600", bg: "bg-blue-100", icon: Truck },
  "To Bill": {
    color: "text-indigo-600",
    bg: "bg-indigo-100",
    icon: CreditCard,
  },
  Completed: {
    color: "text-emerald-600",
    bg: "bg-emerald-100",
    icon: CheckCircle2,
  },
  Cancelled: { color: "text-gray-400", bg: "bg-gray-100", icon: XCircle },
};

export default function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = use(params);
  const router = useRouter();

  const {
    data: order,
    isLoading,
    refetch,
  } = useFrappeDoc("Purchase Order", name);
  const updateMutation = useFrappeUpdate("Purchase Order");

  const handleStatusUpdate = async (newDocStatus: number) => {
    try {
      await updateMutation.mutateAsync({
        name,
        data: { docstatus: newDocStatus },
      });
      toast.success(
        newDocStatus === 1 ? "Order authorized" : "Order cancelled",
      );
      refetch();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (isLoading) return <LoadingState type="detail" />;
  if (!order) return <EmptyState title="Purchase Order not found" />;

  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.Draft;
  const StatusIcon = statusConfig.icon;
  const isDraft = order.docstatus === 0;
  const isAuthorized = order.docstatus === 1;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader
        title={order.name}
        subtitle={order.supplier_name}
        backHref="/buying/purchase-order"
        tags={
          <Badge
            className={cn(
              "rounded-full px-4 py-1.5 text-[10px] font-black tracking-widest uppercase border-0 shadow-sm",
              statusConfig.bg,
              statusConfig.color,
            )}
          >
            <StatusIcon className="h-3 w-3 mr-2" />
            {order.status}
          </Badge>
        }
      >
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-2xl h-11 px-6 font-bold">
            <Printer className="h-4 w-4 mr-2" /> Print PO
          </Button>
          {isDraft && (
            <>
              <Button
                variant="outline"
                className="rounded-2xl h-11 px-6 font-bold"
                onClick={() =>
                  router.push(
                    `/buying/purchase-order/${encodeURIComponent(name)}/edit`,
                  )
                }
              >
                Edit
              </Button>
              <Button
                className="rounded-2xl h-11 px-8 font-black uppercase tracking-widest text-[11px] shadow-lg shadow-primary/20"
                onClick={() => handleStatusUpdate(1)}
              >
                Authorize Order
              </Button>
            </>
          )}
          {isAuthorized && order.per_received < 100 && (
            <Button
              className="rounded-2xl h-11 px-8 font-black uppercase tracking-widest text-[11px] shadow-lg shadow-blue-500/20 bg-blue-600 hover:bg-blue-700"
              onClick={() =>
                router.push(
                  `/stock/stock-entry/new?purchase_order=${encodeURIComponent(name)}&purpose=Material Receipt`,
                )
              }
            >
              <Truck className="h-4 w-4 mr-2" /> Record Receipt
            </Button>
          )}
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Timeline Info Card */}
          <div className="bg-card rounded-[2.5rem] border border-border/50 p-8 shadow-sm">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" /> Order Placement
                </p>
                <p className="font-bold text-sm tracking-tight">
                  {format(parseISO(order.transaction_date), "MMM d, yyyy")}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" /> Expected Arrival
                </p>
                <p className="font-bold text-sm tracking-tight text-amber-600">
                  {format(parseISO(order.schedule_date), "MMM d, yyyy")}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5" /> Receipt WH
                </p>
                <p className="font-bold text-sm tracking-tight">
                  {order.set_warehouse?.split(" - ")[0] || "Default"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-2">
                  <CreditCard className="h-3.5 w-3.5" /> List Price
                </p>
                <p className="font-bold text-sm tracking-tight truncate">
                  {order.buying_price_list || "Standard Buy"}
                </p>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="bg-card rounded-[2.5rem] border border-border/50 overflow-hidden shadow-sm">
            <div className="p-8 border-b border-border/50 bg-secondary/10 flex justify-between items-center">
              <h3 className="font-bold text-lg tracking-tight flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" /> Purchase
                Matrix
              </h3>
              <Badge
                variant="outline"
                className="rounded-lg h-7 px-3 font-black text-[10px] uppercase"
              >
                {order.items?.length || 0} Line Items
              </Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-secondary/20 border-b border-border/50">
                    <th className="p-6 text-[10px] font-black uppercase text-muted-foreground tracking-widest w-1/3">
                      Item Detail
                    </th>
                    <th className="p-6 text-[10px] font-black uppercase text-muted-foreground tracking-widest text-right">
                      Quantity
                    </th>
                    <th className="p-6 text-[10px] font-black uppercase text-muted-foreground tracking-widest text-right">
                      Unit Rate
                    </th>
                    <th className="p-6 text-[10px] font-black uppercase text-muted-foreground tracking-widest text-right">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {order.items?.map((item, idx) => (
                    <tr
                      key={idx}
                      className="group hover:bg-secondary/10 transition-colors"
                    >
                      <td className="p-6">
                        <p className="font-bold text-sm transition-colors group-hover:text-primary">
                          {item.item_code}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-medium mt-1 truncate max-w-xs">
                          {item.item_name}
                        </p>
                      </td>
                      <td className="p-6 text-right">
                        <div className="space-y-1">
                          <p className="font-black text-sm tabular-nums">
                            {item.qty}{" "}
                            <span className="text-[10px] text-muted-foreground">
                              {item.uom}
                            </span>
                          </p>
                          <div className="flex justify-end gap-1.5 items-center">
                            <div className="h-1 w-16 bg-secondary rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full"
                                style={{
                                  width: `${Math.min(((item.received_qty || 0) / item.qty) * 100, 100)}%`,
                                }}
                              />
                            </div>
                            <span className="text-[9px] font-bold text-muted-foreground">
                              Rec: {item.received_qty || 0}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-6 text-right font-bold text-xs tabular-nums text-muted-foreground">
                        {order.currency}{" "}
                        {item.rate?.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="p-6 text-right font-black text-sm tabular-nums">
                        {order.currency}{" "}
                        {((item.qty || 0) * (item.rate || 0)).toLocaleString(
                          undefined,
                          { minimumFractionDigits: 2 },
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes & Terms */}
          <div className="bg-card rounded-[2.5rem] border border-border/50 p-8 shadow-sm">
            <h4 className="font-bold text-xs uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-primary" /> Contractual Terms
            </h4>
            <p className="text-sm text-foreground/80 leading-relaxed italic whitespace-pre-wrap">
              {order.terms ||
                "Standard organizational procurement terms apply. No specific terms recorded for this individual order."}
            </p>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {/* Summary Stats */}
          <div className="bg-primary shadow-2xl shadow-primary/20 rounded-[3rem] p-10 text-white space-y-8 overflow-hidden relative">
            <div className="relative z-10 space-y-8">
              <div className="flex justify-between items-start">
                <CreditCard className="h-10 w-10 text-white/40" />
                <div className="text-right">
                  <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">
                    Total Payload
                  </p>
                  <p className="text-4xl font-black tabular-nums tracking-tighter">
                    {order.currency} {order.grand_total?.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="space-y-4 pt-8 border-t border-white/10">
                <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
                  <span className="text-white/60">Fulfillment Status</span>
                  <span>{Math.round(order.per_received || 0)}% Received</span>
                </div>
                <div className="h-3 bg-white/10 rounded-full overflow-hidden p-1 shadow-inner">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-1000"
                    style={{
                      width: `${Math.min(order.per_received || 0, 100)}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
                  <span className="text-white/60">Billing Status</span>
                  <span>{Math.round(order.per_billed || 0)}% Billed</span>
                </div>
                <div className="h-3 bg-white/10 rounded-full overflow-hidden p-1 shadow-inner">
                  <div
                    className="h-full bg-emerald-400 rounded-full transition-all duration-1000"
                    style={{
                      width: `${Math.min(order.per_billed || 0, 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
            <ShoppingCart className="absolute -bottom-10 -right-10 h-64 w-64 text-white/5 rotate-[-15deg]" />
          </div>

          {/* References */}
          <div className="bg-card rounded-[2.5rem] border border-border/50 p-8 shadow-sm space-y-6">
            <h4 className="font-bold text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <History className="h-4 w-4" /> Traceability
            </h4>
            <div className="space-y-3">
              {order.material_request && (
                <div
                  className="flex items-center justify-between p-4 rounded-2xl bg-secondary/30 border border-border/50 cursor-pointer active:scale-95 transition-all"
                  onClick={() =>
                    router.push(
                      `/stock/material-request/${encodeURIComponent(order.material_request)}`,
                    )
                  }
                >
                  <div className="flex items-center gap-3">
                    <Plus className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold truncate max-w-[150px]">
                      {order.material_request}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                </div>
              )}
              {order.project && (
                <div className="flex items-center justify-between p-4 rounded-2xl bg-secondary/30 border border-border/50">
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-4 w-4 text-blue-500" />
                    <span className="text-xs font-bold truncate max-w-[150px]">
                      {order.project}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                </div>
              )}
              {!order.material_request && !order.project && (
                <p className="text-[11px] text-muted-foreground font-bold italic px-2">
                  No linked demand records found.
                </p>
              )}
            </div>
          </div>

          {/* Procurement Alert */}
          <div className="p-8 rounded-[2.5rem] bg-indigo-500/5 border border-indigo-500/10 flex gap-4 shadow-sm items-start">
            <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center shrink-0">
              <Info className="h-5 w-5 text-indigo-600" />
            </div>
            <p className="text-[11px] text-indigo-800 font-medium leading-relaxed">
              Once authorized, this order will be visible to the warehouse for{" "}
              <strong>Material Receipt</strong> logs. Partial receipts are
              tracked via the fulfillment engine.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
