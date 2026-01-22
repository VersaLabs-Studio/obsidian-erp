// @ts-nocheck
"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useFrappeDoc, useFrappeUpdate, useFrappePost } from "@/hooks/generic";
import {
  PageHeader,
  LoadingState,
  EmptyState,
  ConfirmDialog,
} from "@/components/smart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Building2,
  Package,
  ShoppingCart,
  ArrowRightLeft,
  LogOut,
  Factory,
  UserCheck,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  History,
  Pencil,
  Trash2,
  Printer,
  ChevronRight,
  Info,
  Layers,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const TYPE_CONFIG = {
  Purchase: {
    color: "text-emerald-600",
    bg: "bg-emerald-500/10",
    icon: ShoppingCart,
  },
  "Material Transfer": {
    color: "text-blue-600",
    bg: "bg-blue-500/10",
    icon: ArrowRightLeft,
  },
  "Material Issue": {
    color: "text-amber-600",
    bg: "bg-amber-500/10",
    icon: LogOut,
  },
  Manufacture: {
    color: "text-indigo-600",
    bg: "bg-indigo-500/10",
    icon: Factory,
  },
  "Customer Provided": {
    color: "text-purple-600",
    bg: "bg-purple-500/10",
    icon: UserCheck,
  },
};

const STATUS_CONFIG = {
  Draft: { color: "text-slate-600", bg: "bg-slate-100", icon: Clock },
  Pending: { color: "text-amber-600", bg: "bg-amber-100", icon: Clock },
  "Partially Ordered": {
    color: "text-blue-600",
    bg: "bg-blue-100",
    icon: History,
  },
  Ordered: {
    color: "text-emerald-600",
    bg: "bg-emerald-100",
    icon: CheckCircle2,
  },
  Transferred: {
    color: "text-indigo-600",
    bg: "bg-indigo-100",
    icon: ArrowRightLeft,
  },
  Cancelled: { color: "text-gray-400", bg: "bg-gray-100", icon: XCircle },
};

export default function MaterialRequestDetailPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = use(params);
  const router = useRouter();

  const {
    data: mr,
    isLoading,
    refetch,
  } = useFrappeDoc("Material Request", name);

  const updateMutation = useFrappeUpdate("Material Request");

  const handleStatusUpdate = async (newDocStatus: number) => {
    try {
      await updateMutation.mutateAsync({
        name,
        data: { docstatus: newDocStatus },
      });
      toast.success(
        newDocStatus === 1 ? "Request submitted" : "Request cancelled",
      );
      refetch();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (isLoading) return <LoadingState type="detail" />;
  if (!mr) return <EmptyState title="Request not found" />;

  const typeConfig =
    TYPE_CONFIG[mr.material_request_type] || TYPE_CONFIG.Purchase;
  const statusConfig = STATUS_CONFIG[mr.status] || STATUS_CONFIG.Draft;
  const TypeIcon = typeConfig.icon;
  const StatusIcon = statusConfig.icon;
  const isDraft = mr.docstatus === 0;
  const isSubmitted = mr.docstatus === 1;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader
        title={mr.name}
        subtitle={`${mr.material_request_type} Request`}
        backHref="/stock/material-request"
        tags={
          <div className="flex gap-2">
            <Badge
              className={cn(
                "rounded-full px-4 py-1.5 text-[10px] font-black tracking-widest uppercase border-0 shadow-sm",
                typeConfig.bg,
                typeConfig.color,
              )}
            >
              <TypeIcon className="h-3 w-3 mr-2" />
              {mr.material_request_type}
            </Badge>
            <Badge
              className={cn(
                "rounded-full px-4 py-1.5 text-[10px] font-black tracking-widest uppercase border-0 shadow-sm",
                statusConfig.bg,
                statusConfig.color,
              )}
            >
              <StatusIcon className="h-3 w-3 mr-2" />
              {mr.status}
            </Badge>
          </div>
        }
      >
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-2xl h-11 px-6 font-bold">
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
          {isDraft && (
            <>
              <Button
                variant="outline"
                className="rounded-2xl h-11 px-6 font-bold"
                onClick={() =>
                  router.push(
                    `/stock/material-request/${encodeURIComponent(name)}/edit`,
                  )
                }
              >
                <Pencil className="h-4 w-4 mr-2" /> Edit
              </Button>
              <Button
                className="rounded-2xl h-11 px-8 font-black uppercase tracking-widest text-[11px] shadow-lg shadow-primary/20"
                onClick={() => handleStatusUpdate(1)}
              >
                Submit Request
              </Button>
            </>
          )}
          {isSubmitted && mr.material_request_type === "Purchase" && (
            <Button
              className="rounded-2xl h-11 px-8 font-black uppercase tracking-widest text-[11px] shadow-lg shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700"
              onClick={() =>
                router.push(
                  `/buying/purchase-order/new?material_request=${encodeURIComponent(name)}`,
                )
              }
            >
              <ShoppingCart className="h-4 w-4 mr-2" /> Create PO
            </Button>
          )}
          {isSubmitted && mr.material_request_type === "Material Transfer" && (
            <Button
              className="rounded-2xl h-11 px-8 font-black uppercase tracking-widest text-[11px] shadow-lg shadow-blue-500/20 bg-blue-600 hover:bg-blue-700"
              onClick={() =>
                router.push(
                  `/stock/stock-entry/new?material_request=${encodeURIComponent(name)}&purpose=Material Transfer`,
                )
              }
            >
              <ArrowRightLeft className="h-4 w-4 mr-2" /> Create Transfer
            </Button>
          )}
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Main Info */}
          <div className="bg-card rounded-[2.5rem] border border-border/50 p-8 shadow-sm">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">
                  Requested Date
                </p>
                <div className="flex items-center gap-2 font-bold text-sm">
                  <Calendar className="h-4 w-4 text-primary" />
                  {format(parseISO(mr.transaction_date), "MMM d, yyyy")}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">
                  Target Date
                </p>
                <div className="flex items-center gap-2 font-bold text-sm">
                  <Clock className="h-4 w-4 text-amber-500" />
                  {format(parseISO(mr.schedule_date), "MMM d, yyyy")}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">
                  Company
                </p>
                <div className="flex items-center gap-2 font-bold text-sm">
                  <Building2 className="h-4 w-4 text-blue-500" />
                  {mr.company}
                </div>
              </div>
              {mr.work_order && (
                <div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">
                    Work Order
                  </p>
                  <div className="flex items-center gap-2 font-bold text-sm text-indigo-600">
                    <Factory className="h-4 w-4" />
                    {mr.work_order}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="bg-card rounded-[2.5rem] border border-border/50 overflow-hidden shadow-sm">
            <div className="p-8 border-b border-border/50 bg-secondary/10 flex justify-between items-center">
              <h3 className="font-bold text-lg tracking-tight flex items-center gap-2">
                <Package className="h-5 w-5 text-emerald-500" /> Requested Items
              </h3>
              <Badge
                variant="outline"
                className="rounded-lg h-7 px-3 font-black text-[10px] uppercase"
              >
                {mr.items?.length || 0} Line Items
              </Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-secondary/20 border-b border-border/50">
                    <th className="p-6 text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                      Item Detail
                    </th>
                    <th className="p-6 text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                      Quantity
                    </th>
                    <th className="p-6 text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                      Warehouse
                    </th>
                    <th className="p-6 text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                      Fulfillment
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {mr.items?.map((item, idx) => (
                    <tr
                      key={idx}
                      className="group hover:bg-secondary/10 transition-colors"
                    >
                      <td className="p-6">
                        <p className="font-bold text-sm transition-colors group-hover:text-primary">
                          {item.item_code}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-medium mt-1">
                          {item.item_name ||
                            item.description ||
                            "No description"}
                        </p>
                      </td>
                      <td className="p-6">
                        <div className="flex flex-col">
                          <span className="font-black text-sm tabular-nums">
                            {item.qty}
                          </span>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">
                            {item.uom}
                          </span>
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="space-y-2">
                          {item.from_warehouse && (
                            <div className="flex items-center gap-2 text-[10px] font-bold text-red-600 bg-red-500/5 px-2 py-1 rounded-lg border border-red-500/10 w-fit">
                              <LogOut className="h-3 w-3" />{" "}
                              {item.from_warehouse.split(" - ")[0]}
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 bg-emerald-500/5 px-2 py-1 rounded-lg border border-emerald-500/10 w-fit">
                            <LogIn className="h-3 w-3" />{" "}
                            {item.warehouse?.split(" - ")[0] ||
                              mr.set_warehouse?.split(" - ")[0]}
                          </div>
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
                            <span className="text-muted-foreground">
                              Status
                            </span>
                            <span className="text-primary">
                              {Math.round(
                                ((item.ordered_qty || 0) / item.qty) * 100,
                              )}
                              %
                            </span>
                          </div>
                          <div className="h-1.5 w-24 bg-secondary/50 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-700"
                              style={{
                                width: `${Math.min(((item.ordered_qty || 0) / item.qty) * 100, 100)}%`,
                              }}
                            />
                          </div>
                          <p className="text-[9px] font-bold text-muted-foreground">
                            Ord: {item.ordered_qty || 0} / {item.qty}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Reason Card */}
          <div className="bg-card rounded-[2.5rem] border border-border/50 p-8 shadow-sm">
            <h4 className="font-bold text-xs uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Internal Note
            </h4>
            <p className="text-sm text-foreground/80 leading-relaxed italic">
              {mr.reason || "No specific reason provided for this request."}
            </p>
          </div>

          {/* Stats Card */}
          <div className="bg-card rounded-[2.5rem] border border-border/50 p-8 shadow-sm space-y-6">
            <h4 className="font-bold text-xs uppercase tracking-widest text-muted-foreground mb-4">
              Request Statistics
            </h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-muted-foreground uppercase">
                  Overall Fulfillment
                </span>
                <span className="font-black text-primary">
                  {Math.round(mr.per_ordered || 0)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-muted-foreground uppercase">
                  Supply Type
                </span>
                <span className="font-black text-sm">
                  {mr.material_request_type}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-muted-foreground uppercase">
                  Total Units
                </span>
                <span className="font-black text-sm tabular-nums">
                  {mr.items?.reduce((sum, i) => sum + i.qty, 0)}
                </span>
              </div>
            </div>

            <div className="pt-6 border-t border-border/50">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3">
                Tracking Milestones
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center shrink-0 border-2",
                      mr.docstatus >= 1
                        ? "bg-emerald-500/10 border-emerald-500 text-emerald-600"
                        : "bg-secondary/50 border-border text-muted-foreground",
                    )}
                  >
                    {mr.docstatus >= 1 ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Layers className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-[11px] font-bold tracking-tight">
                      Requirement Validated
                    </p>
                    <p className="text-[9px] text-muted-foreground font-medium uppercase">
                      {mr.docstatus >= 1
                        ? "Authorized by Manager"
                        : "Awaiting Submission"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center shrink-0 border-2",
                      mr.per_ordered >= 100
                        ? "bg-emerald-500/10 border-emerald-500 text-emerald-600"
                        : "bg-secondary/50 border-border text-muted-foreground",
                    )}
                  >
                    <ShoppingCart className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold tracking-tight">
                      Procurement Completed
                    </p>
                    <p className="text-[9px] text-muted-foreground font-medium uppercase">
                      {mr.per_ordered >= 100
                        ? "Orders Fully Placed"
                        : mr.per_ordered > 0
                          ? "Partially Ordered"
                          : "Open for Purchasing"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-amber-500/5 rounded-[2rem] border border-amber-500/10 p-6 flex gap-4">
            <Info className="h-5 w-5 text-amber-500 shrink-0" />
            <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
              This request has been indexed for the{" "}
              <strong>Master Resource Planning (MRP)</strong> engine. Any
              changes to quantities will affect production schedules.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
