// @ts-nocheck
"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useFrappeDoc, useFrappeUpdate } from "@/hooks/generic";
import { PageHeader, LoadingState, EmptyState } from "@/components/smart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Building2,
  Package,
  ArrowRightLeft,
  LogIn,
  LogOut,
  Factory,
  Cog,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  Printer,
  ChevronRight,
  Info,
  Layers,
  Monitor,
  Warehouse,
  MoreVertical,
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

const PURPOSE_CONFIG = {
  "Material Issue": {
    color: "text-red-600",
    bg: "bg-red-500/10",
    icon: LogOut,
    label: "Issue",
  },
  "Material Receipt": {
    color: "text-emerald-600",
    bg: "bg-emerald-500/10",
    icon: LogIn,
    label: "Receipt",
  },
  "Material Transfer": {
    color: "text-blue-600",
    bg: "bg-blue-500/10",
    icon: ArrowRightLeft,
    label: "Transfer",
  },
  "Material Transfer for Manufacture": {
    color: "text-indigo-600",
    bg: "bg-indigo-500/10",
    icon: Factory,
    label: "Transfer for Mfg",
  },
  Manufacture: {
    color: "text-violet-600",
    bg: "bg-violet-500/10",
    icon: Cog,
    label: "Manufacture",
  },
  Repack: {
    color: "text-amber-600",
    bg: "bg-amber-500/10",
    icon: Package,
    label: "Repack",
  },
};

export default function StockEntryDetailPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = use(params);
  const router = useRouter();

  const { data: entry, isLoading, refetch } = useFrappeDoc("Stock Entry", name);

  const updateMutation = useFrappeUpdate("Stock Entry");

  const handleStatusUpdate = async (newDocStatus: number) => {
    try {
      await updateMutation.mutateAsync({
        name,
        data: { docstatus: newDocStatus },
      });
      toast.success(
        newDocStatus === 1 ? "Stock Entry submitted" : "Stock Entry cancelled",
      );
      refetch();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (isLoading) return <LoadingState type="detail" />;
  if (!entry) return <EmptyState title="Stock Entry not found" />;

  const purposeConfig =
    PURPOSE_CONFIG[entry.purpose] || PURPOSE_CONFIG["Material Transfer"];
  const PurposeIcon = purposeConfig.icon;
  const isDraft = entry.docstatus === 0;
  const isSubmitted = entry.docstatus === 1;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader
        title={entry.name}
        subtitle={`${entry.purpose} Journal`}
        backHref="/stock/stock-entry"
        tags={
          <div className="flex gap-2">
            <Badge
              className={cn(
                "rounded-full px-4 py-1.5 text-[10px] font-black tracking-widest uppercase border-0 shadow-sm",
                purposeConfig.bg,
                purposeConfig.color,
              )}
            >
              <PurposeIcon className="h-3 w-3 mr-2" />
              {entry.purpose}
            </Badge>
            <Badge
              className={cn(
                "rounded-full px-4 py-1.5 text-[10px] font-black tracking-widest uppercase border-0 shadow-sm",
                isSubmitted
                  ? "bg-emerald-500/10 text-emerald-600"
                  : "bg-slate-500/10 text-slate-600",
              )}
            >
              {isSubmitted ? (
                <CheckCircle2 className="h-3 w-3 mr-2" />
              ) : (
                <Clock className="h-3 w-3 mr-2" />
              )}
              {isSubmitted ? "SUBMITTED" : "DRAFT"}
            </Badge>
          </div>
        }
      >
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-2xl h-11 px-6 font-bold">
            <Printer className="h-4 w-4 mr-2" /> Print Slip
          </Button>
          {isDraft && (
            <>
              <Button
                variant="outline"
                className="rounded-2xl h-11 px-6 font-bold"
                onClick={() =>
                  router.push(
                    `/stock/stock-entry/${encodeURIComponent(name)}/edit`,
                  )
                }
              >
                Edit
              </Button>
              <Button
                className="rounded-2xl h-11 px-8 font-black uppercase tracking-widest text-[11px] shadow-lg shadow-primary/20"
                onClick={() => handleStatusUpdate(1)}
              >
                Post to Ledger
              </Button>
            </>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 rounded-full hover:bg-secondary"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2">
              <DropdownMenuItem className="rounded-xl">
                <FileText className="h-4 w-4 mr-2" /> View Stock Ledger
              </DropdownMenuItem>
              {isSubmitted && (
                <DropdownMenuItem
                  className="rounded-xl text-destructive"
                  onClick={() => handleStatusUpdate(2)}
                >
                  <XCircle className="h-4 w-4 mr-2" /> Cancel Entry
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Warehouse Flow Card */}
          <div className="bg-card rounded-[3rem] border border-border/50 p-10 shadow-sm relative overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-center relative z-10">
              <div className="md:col-span-2 space-y-3">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <LogOut className="h-3.5 w-3.5" /> Source Location
                </p>
                <div className="p-6 rounded-[2rem] bg-secondary/30 border border-border/50">
                  <p className="font-black text-lg truncate">
                    {entry.from_warehouse?.split(" - ")[0] || "Stock Receipt"}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono mt-1 opacity-60">
                    {entry.from_warehouse || "—"}
                  </p>
                </div>
              </div>

              <div className="flex justify-center md:col-span-1">
                <div className="h-12 w-12 rounded-full bg-primary text-white flex items-center justify-center shadow-xl shadow-primary/30 ring-4 ring-background animate-pulse">
                  <ArrowRightLeft className="h-6 w-6" />
                </div>
              </div>

              <div className="md:col-span-2 space-y-3 text-right">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 justify-end">
                  Target Location <LogIn className="h-3.5 w-3.5" />
                </p>
                <div className="p-6 rounded-[2rem] bg-emerald-500/5 border border-emerald-500/10">
                  <p className="font-black text-lg truncate text-emerald-600">
                    {entry.to_warehouse?.split(" - ")[0] || "Stock Disposal"}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono mt-1 opacity-60">
                    {entry.to_warehouse || "—"}
                  </p>
                </div>
              </div>
            </div>

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none">
              <Warehouse className="h-64 w-64" />
            </div>
          </div>

          {/* Items Table */}
          <div className="bg-card rounded-[2.5rem] border border-border/50 overflow-hidden shadow-sm">
            <div className="p-8 border-b border-border/50 bg-secondary/10 flex justify-between items-center">
              <h3 className="font-bold text-lg tracking-tight flex items-center gap-2">
                <Package className="h-5 w-5 text-indigo-500" /> Registry Matrix
              </h3>
              <div className="flex gap-4 items-center">
                <div className="text-right">
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter">
                    Outgoing Value
                  </p>
                  <p className="text-xs font-black text-red-600">
                    ETB {entry.total_outgoing_value?.toLocaleString()}
                  </p>
                </div>
                <div className="w-px h-6 bg-border" />
                <div className="text-left">
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter">
                    Incoming Value
                  </p>
                  <p className="text-xs font-black text-emerald-600">
                    ETB {entry.total_incoming_value?.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-secondary/20 border-b border-border/50">
                    <th className="p-6 text-[10px] font-black uppercase text-muted-foreground tracking-widest w-1/2">
                      Item Detail
                    </th>
                    <th className="p-6 text-[10px] font-black uppercase text-muted-foreground tracking-widest text-right">
                      Quantity
                    </th>
                    <th className="p-6 text-[10px] font-black uppercase text-muted-foreground tracking-widest text-right">
                      Unit Rate
                    </th>
                    <th className="p-6 text-[10px] font-black uppercase text-muted-foreground tracking-widest text-right">
                      Total Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {entry.items?.map((item, idx) => (
                    <tr
                      key={idx}
                      className={cn(
                        "group transition-colors",
                        item.is_finished_item
                          ? "bg-violet-500/5"
                          : "hover:bg-secondary/10",
                      )}
                    >
                      <td className="p-6">
                        <div className="flex items-start gap-4">
                          <div
                            className={cn(
                              "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border",
                              item.is_finished_item
                                ? "bg-violet-500 text-white shadow-lg border-violet-400"
                                : "bg-background shadow-sm border-border",
                            )}
                          >
                            {item.is_finished_item ? (
                              <Layers className="h-5 w-5" />
                            ) : (
                              <Package className="h-5 w-5 text-muted-foreground/50" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-sm group-hover:text-primary transition-colors flex items-center gap-2">
                              {item.item_code}
                              {item.is_finished_item && (
                                <Badge className="bg-violet-600 text-[8px] h-4 rounded-md uppercase font-black">
                                  Output
                                </Badge>
                              )}
                            </p>
                            <p className="text-[11px] text-muted-foreground font-medium mt-1 truncate max-w-xs">
                              {item.item_name}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-6 text-right">
                        <p className="font-black text-sm tabular-nums">
                          {item.qty}
                        </p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">
                          {item.uom}
                        </p>
                      </td>
                      <td className="p-6 text-right font-bold text-xs tabular-nums text-muted-foreground">
                        {item.basic_rate?.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="p-6 text-right">
                        <p
                          className={cn(
                            "font-black text-sm tabular-nums",
                            item.is_finished_item
                              ? "text-violet-600"
                              : "text-foreground",
                          )}
                        >
                          {(
                            (item.qty || 0) * (item.basic_rate || 0)
                          ).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Timeline Card */}
          <div className="bg-card rounded-[2.5rem] border border-border/50 p-8 shadow-sm">
            <h4 className="font-bold text-xs uppercase tracking-widest text-muted-foreground mb-6">
              Posting Audit
            </h4>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    Effective Date
                  </p>
                  <p className="font-bold text-sm tracking-tight">
                    {format(parseISO(entry.posting_date), "MMMM d, yyyy")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-2xl bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Clock className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    System Timestamp
                  </p>
                  <p className="font-bold text-sm tracking-tight">
                    {entry.posting_time?.slice(0, 5) || "00:00"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Relations Card */}
          <div className="bg-card rounded-[2.5rem] border border-border/50 p-8 shadow-sm space-y-6">
            <h4 className="font-bold text-xs uppercase tracking-widest text-muted-foreground">
              Source References
            </h4>
            <div className="space-y-3">
              {entry.work_order && (
                <div
                  className="flex items-center justify-between p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 transition-transform active:scale-95 cursor-pointer"
                  onClick={() =>
                    router.push(
                      `/manufacturing/work-order/${encodeURIComponent(entry.work_order)}`,
                    )
                  }
                >
                  <div className="flex items-center gap-3">
                    <Factory className="h-4 w-4 text-indigo-600" />
                    <span className="text-xs font-bold text-indigo-700">
                      {entry.work_order}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-indigo-400" />
                </div>
              )}
              {entry.material_request && (
                <div
                  className="flex items-center justify-between p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 transition-transform active:scale-95 cursor-pointer"
                  onClick={() =>
                    router.push(
                      `/stock/material-request/${encodeURIComponent(entry.material_request)}`,
                    )
                  }
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-bold text-blue-700">
                      {entry.material_request}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-blue-400" />
                </div>
              )}
              {!entry.work_order && !entry.material_request && (
                <p className="text-[11px] text-muted-foreground font-medium italic">
                  Direct inventory adjustment.
                </p>
              )}
            </div>
          </div>

          {/* Financial Warning */}
          <div className="bg-amber-500/5 rounded-[2.5rem] border border-amber-500/10 p-8 space-y-4 shadow-inner">
            <div className="flex items-center gap-3 text-amber-600">
              <Monitor className="h-5 w-5" />
              <p className="font-black text-[10px] uppercase tracking-widest">
                GL Impact
              </p>
            </div>
            <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
              Submitting this journal will trigger an{" "}
              <strong>Asset Capitalization</strong> workflow. The value
              difference of{" "}
              <span className="font-black">
                ETB {entry.value_difference?.toLocaleString() || "0.00"}
              </span>{" "}
              will be posted to the stock adjustment account.
            </p>
          </div>

          {/* Remarks */}
          <div className="px-4 text-center">
            <p className="text-[10px] font-black text-muted-foreground uppercase mb-2">
              Audit Remarks
            </p>
            <p className="text-[11px] text-foreground/60 italic leading-relaxed">
              "
              {entry.remarks ||
                "No supplementary notes provided for this movement."}
              "
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
