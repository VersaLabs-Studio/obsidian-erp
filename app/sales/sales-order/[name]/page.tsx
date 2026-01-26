// @ts-nocheck
"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Printer,
  Share2,
  Edit,
  Trash2,
  Send,
  Ban,
  CheckCircle2,
  AlertCircle,
  Package,
  Calendar,
  MoreVertical,
  Check,
  Building2,
  Users,
  Briefcase,
  Layers,
  Info,
  DollarSign,
  TrendingUp,
  MapPin,
  Clock,
  User,
  ClipboardList,
  Truck,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useFrappeDoc,
  useFrappeUpdate,
  useFrappeDelete,
} from "@/hooks/generic";
import { PageHeader, LoadingState, ConfirmDialog } from "@/components/smart";
import { InfoCard, DataPoint } from "@/components/ui/info-card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { SalesOrder } from "@/types/doctype-types";

const getStatusBadgeClasses = (status: string) => {
  switch (status) {
    case "Draft":
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
    case "To Deliver and Bill":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300";
    case "To Deliver":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300";
    case "To Bill":
      return "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300";
    case "Completed":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300";
    case "Cancelled":
      return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
};

export default function SalesOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(params.name as string);

  const [isArtworkVerified, setIsArtworkVerified] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  const {
    data: order,
    isLoading,
    refetch,
  } = useFrappeDoc<SalesOrder>("Sales Order", name);

  const updateMutation = useFrappeUpdate("Sales Order", {
    onSuccess: () => {
      refetch();
      setShowSubmitDialog(false);
      setShowCancelDialog(false);
    },
  });

  const deleteMutation = useFrappeDelete("Sales Order", {
    onSuccess: () => router.push("/sales/sales-order"),
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ET", {
      style: "currency",
      currency: order?.currency || "ETB",
    }).format(amount || 0);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const isOverdue =
    order?.delivery_date &&
    new Date(order.delivery_date) < new Date() &&
    order.status !== "Completed" &&
    order.status !== "Cancelled";

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) return <LoadingState type="detail" />;
  if (!order)
    return (
      <div className="p-8 text-center text-destructive font-bold">
        Sales Order not found
      </div>
    );

  const isDraft = order.docstatus === 0;
  const isCancelled = order.docstatus === 2;

  return (
    <div className="space-y-8 pb-24 print:p-0 print:m-0 print:bg-white">
      {/* Header - Hidden on Print */}
      <div className="print:hidden">
        <PageHeader
          title={order.name}
          subtitle={
            <div className="flex items-center gap-2">
              <Badge
                className={cn(
                  "text-xs font-semibold border-0",
                  getStatusBadgeClasses(order.status),
                )}
              >
                {order.status}
              </Badge>
              {isOverdue && (
                <span className="text-destructive text-sm flex items-center gap-1 font-bold animate-pulse">
                  <AlertCircle className="h-4 w-4" /> OVERDUE FOR DELIVERY
                </span>
              )}
            </div>
          }
          backHref="/sales/sales-order"
          actions={
            <div className="flex gap-2">
              {isDraft && (
                <>
                  <Button
                    variant="outline"
                    className="rounded-full shadow-sm hover:shadow-md transition-all bg-card"
                    onClick={() =>
                      router.push(
                        `/sales/sales-order/${encodeURIComponent(name)}/edit`,
                      )
                    }
                  >
                    <Edit className="h-4 w-4 mr-2" /> Edit
                  </Button>
                  <Button
                    className={cn(
                      "rounded-full shadow-lg transition-all",
                      !isArtworkVerified
                        ? "opacity-30 grayscale cursor-not-allowed"
                        : "shadow-primary/20 hover:shadow-primary/30",
                    )}
                    onClick={() =>
                      isArtworkVerified && setShowSubmitDialog(true)
                    }
                    disabled={!isArtworkVerified}
                  >
                    <Send className="h-4 w-4 mr-2" /> Submit
                  </Button>
                </>
              )}
              {order.docstatus === 1 && !isCancelled && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() =>
                      router.push(
                        `/stock/delivery-note/new?sales_order=${encodeURIComponent(name)}&customer=${encodeURIComponent(order.customer)}`,
                      )
                    }
                    className="rounded-full shadow-sm hover:shadow-md transition-all bg-card"
                  >
                    <Truck className="h-4 w-4 mr-2" />
                    Create Delivery Note
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      router.push(
                        `/manufacturing/work-order/new?sales_order=${encodeURIComponent(name)}`,
                      )
                    }
                    className="rounded-full shadow-sm hover:shadow-md transition-all bg-card"
                  >
                    <ClipboardList className="h-4 w-4 mr-2" />
                    Create Work Order
                  </Button>
                </div>
              )}

              <Button
                variant="outline"
                size="icon"
                className="rounded-full h-10 w-10"
                onClick={handlePrint}
              >
                <Printer className="h-4 w-4" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-full h-10 w-10"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="rounded-xl shadow-xl min-w-[200px] p-2"
                >
                  <DropdownMenuItem
                    className="rounded-lg cursor-pointer py-2"
                    onClick={handlePrint}
                  >
                    <Printer className="h-4 w-4 mr-2" /> Print Order
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="rounded-lg cursor-pointer py-2"
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      setCopied(true);
                      toast.success("Link copied to clipboard");
                      setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 mr-2" />
                    ) : (
                      <Share2 className="h-4 w-4 mr-2" />
                    )}
                    Share Order
                  </DropdownMenuItem>
                  {order.docstatus === 1 && !isCancelled && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="rounded-lg cursor-pointer text-destructive focus:text-destructive py-2 font-medium"
                        onClick={() => setShowCancelDialog(true)}
                      >
                        <Ban className="h-4 w-4 mr-2" /> Cancel Order
                      </DropdownMenuItem>
                    </>
                  )}
                  {isDraft && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="rounded-lg cursor-pointer text-destructive focus:text-destructive py-2 font-medium"
                        onClick={() => setShowDeleteDialog(true)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Delete Draft
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          }
        />
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:block">
        {/* Left Column: Extensive Info */}
        <div className="lg:col-span-8 space-y-8">
          {/* Artwork verification gate */}
          {isDraft && (
            <div
              className={cn(
                "p-8 rounded-[2.5rem] border-2 transition-all duration-500 overflow-hidden relative group print:hidden",
                isArtworkVerified
                  ? "bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800"
                  : "bg-amber-50/50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800 ring-4 ring-amber-500/5 animate-in fade-in zoom-in",
              )}
            >
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex gap-5 items-center">
                  <div
                    className={cn(
                      "h-16 w-16 rounded-[1.5rem] flex items-center justify-center transition-all duration-500 shadow-lg",
                      isArtworkVerified
                        ? "bg-emerald-500 text-white scale-110"
                        : "bg-amber-500 text-white scale-100",
                    )}
                  >
                    {isArtworkVerified ? (
                      <Layers className="h-8 w-8" />
                    ) : (
                      <Info className="h-8 w-8" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-black text-xl text-foreground tracking-tight">
                      Artwork Verification
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Sales Order implementation requires critical review of
                      GSM, size and finishing before submission.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setIsArtworkVerified(!isArtworkVerified)}
                  variant={isArtworkVerified ? "outline" : "default"}
                  className={cn(
                    "rounded-[1.2rem] h-12 px-8 font-bold transition-all shadow-lg hover:scale-105 active:scale-95",
                    isArtworkVerified
                      ? "border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                      : "shadow-amber-500/20",
                  )}
                >
                  {isArtworkVerified
                    ? "Reset Verification"
                    : "Acknowledge Specs"}
                </Button>
              </div>
            </div>
          )}

          {/* Table Container */}
          <InfoCard
            title="Production Specification Table"
            icon={<Package className="h-5 w-5 text-indigo-500" />}
          >
            <div className="rounded-[2rem] border border-border/50 overflow-hidden bg-white dark:bg-card shadow-sm print:border-0 print:shadow-none">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-900 border-b-2 border-border/50">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">
                      Item Details
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] w-1/3">
                      Technical Specification
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] text-right">
                      Quantity
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] text-right">
                      Extended Value
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {order.items?.map((item, idx) => (
                    <tr
                      key={idx}
                      className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors"
                    >
                      <td className="px-6 py-6">
                        <div className="space-y-1">
                          <p className="font-bold text-foreground text-base tracking-tight">
                            {item.item_code}
                          </p>
                          <p className="text-xs text-muted-foreground/80 font-medium">
                            {item.item_name}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="text-[13px] text-muted-foreground leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity whitespace-pre-wrap font-medium">
                          {item.description ||
                            "Refer to master catalog for general specifications."}
                        </div>
                      </td>
                      <td className="px-6 py-6 text-right">
                        <span className="font-black text-white font-mono text-sm bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl">
                          {item.qty.toLocaleString()} {item.uom || "Nos"}
                        </span>
                      </td>
                      <td className="px-6 py-6 text-right">
                        <p className="font-bold text-foreground">
                          {formatCurrency(item.amount)}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 font-mono italic">
                          @ {formatCurrency(item.rate)}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals Section */}
              <div className="p-8 bg-slate-50/50 dark:bg-muted/10 border-t border-border/10">
                <div className="flex flex-col items-end space-y-4">
                  <div className="grid grid-cols-2 gap-x-12 gap-y-2 w-full max-w-sm">
                    <span className="text-[10px] font-black uppercase text-muted-foreground text-right self-center tracking-widest">
                      Net Subtotal
                    </span>
                    <span className="text-sm font-bold text-foreground text-right">
                      {formatCurrency(order.total)}
                    </span>

                    <span className="text-[10px] font-black uppercase text-muted-foreground text-right self-center tracking-widest">
                      Taxes & Charges
                    </span>
                    <span className="text-sm font-bold text-foreground text-right">
                      {formatCurrency(order.total_taxes_and_charges)}
                    </span>

                    <div className="col-span-2 h-px bg-border/20 my-2" />

                    <span className="text-xs font-black uppercase text-primary text-right self-center tracking-tighter">
                      Agreement Grand Total
                    </span>
                    <span className="text-2xl font-black text-primary text-right tracking-tighter">
                      {formatCurrency(order.grand_total)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </InfoCard>

          {/* Notes/Terms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <InfoCard
              title="Customer Reference"
              icon={<FileText className="h-5 w-5 text-blue-500" />}
            >
              <div className="space-y-4 p-2">
                <DataPoint
                  label="Purchase Order NO"
                  value={order.po_no || "N/A"}
                  icon={<Info className="h-3.5 w-3.5 text-muted-foreground" />}
                />
                <DataPoint
                  label="PO Issue Date"
                  value={formatDate(order.po_date)}
                  icon={
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  }
                />
                {order.customer_address && (
                  <div className="pt-2">
                    <p className="text-[10px] font-black uppercase text-muted-foreground mb-2">
                      Billing & Shipping
                    </p>
                    <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 text-xs text-muted-foreground leading-relaxed border-l-4 border-blue-500">
                      {order.customer_address}
                    </div>
                  </div>
                )}
              </div>
            </InfoCard>

            <InfoCard
              title="Terms & Conditions"
              icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
            >
              <div className="p-4 rounded-2xl border-2 border-dashed text-[13px] text-muted-foreground leading-relaxed bg-slate-50/30 dark:bg-muted/5 font-medium">
                {order.terms ||
                  "Standard business terms apply to this transaction."}
              </div>
            </InfoCard>
          </div>
        </div>

        {/* Right Column: Sidebar */}
        <div className="lg:col-span-4 space-y-8 print:hidden">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-primary/5 rounded-[2rem] p-6 border-b-4 border-primary/20 hover:scale-105 transition-transform">
              <p className="text-[10px] font-black text-primary uppercase mb-1">
                Items
              </p>
              <p className="text-2xl font-black text-primary">
                {order.items?.length || 0}
              </p>
            </div>
            <div className="bg-indigo-500/10 rounded-[2rem] p-6 border-b-4 border-indigo-500/20 hover:scale-105 transition-transform">
              <p className="text-[10px] font-black text-indigo-500 uppercase mb-1">
                Status
              </p>
              <p className="text-sm font-black text-indigo-500 truncate">
                {order.status}
              </p>
            </div>
          </div>

          <InfoCard
            title="Timeline & Governance"
            icon={<Clock className="h-5 w-5 text-amber-500" />}
          >
            <div className="space-y-5">
              <DataPoint
                label="Booking Date"
                value={formatDate(order.transaction_date)}
              />
              <div
                className={cn(
                  "p-4 rounded-3xl flex items-center justify-between border-2 transition-all",
                  isOverdue
                    ? "bg-destructive/5 border-destructive animate-pulse"
                    : "bg-primary/5 border-primary/10",
                )}
              >
                <div>
                  <p className="text-[10px] font-black uppercase opacity-60">
                    Delivery Commitment
                  </p>
                  <p
                    className={cn(
                      "text-lg font-black tracking-tighter",
                      isOverdue ? "text-destructive" : "text-primary",
                    )}
                  >
                    {formatDate(order.delivery_date)}
                  </p>
                </div>
                {isOverdue && (
                  <AlertCircle className="h-8 w-8 text-destructive opacity-40" />
                )}
              </div>
              <DataPoint label="Organization" value={order.company} />
              <DataPoint label="DocType Series" value={order.naming_series} />
            </div>
          </InfoCard>

          <InfoCard
            title="Client Partnership"
            icon={<Users className="h-5 w-5 text-blue-500" />}
          >
            <div className="space-y-5">
              <div className="p-5 rounded-3xl bg-secondary/30 dark:bg-secondary/10 border border-border">
                <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">
                  Account
                </p>
                <Link
                  href={`/crm/customer/${encodeURIComponent(order.customer)}`}
                  className="font-black text-lg text-foreground tracking-tight underline decoration-primary/40 underline-offset-4 hover:text-primary transition-colors cursor-pointer block"
                >
                  {order.customer_name || order.customer}
                </Link>
                {order.contact_person && (
                  <Link
                    href={`/crm/contact/${encodeURIComponent(order.contact_person)}`}
                    className="text-xs text-muted-foreground hover:text-primary mt-2 flex items-center gap-2 transition-colors cursor-pointer w-fit"
                  >
                    <User className="h-3 w-3" /> {order.contact_person}
                  </Link>
                )}
              </div>
              <DataPoint
                label="Currency Base"
                value={order.currency || "ETB"}
              />
              <DataPoint
                label="Price Strategy"
                value={order.selling_price_list || "Standard"}
              />
            </div>
          </InfoCard>

          {order.sales_partner && (
            <InfoCard
              title="Internal Relations"
              icon={<Briefcase className="h-5 w-5 text-gray-500" />}
            >
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                    Strategy Partner
                  </p>
                  <Link
                    href={`/sales/settings/sales-partner/${encodeURIComponent(order.sales_partner)}`}
                    className="text-sm font-semibold text-foreground hover:text-primary transition-colors cursor-pointer underline decoration-primary/30 underline-offset-2 block"
                  >
                    {order.sales_partner}
                  </Link>
                </div>
                <div className="bg-secondary/30 dark:bg-secondary/10 p-4 rounded-2xl flex justify-between items-center group/commission">
                  <span className="text-xs font-black uppercase text-muted-foreground">
                    Settlement %
                  </span>
                  <span className="text-xl font-black text-indigo-500 group-hover/commission:scale-110 transition-transform">
                    {order.commission_rate || 0}%
                  </span>
                </div>
                {order.project && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                      Associated Project
                    </p>
                    <Link
                      href={`/sales/settings/project/${encodeURIComponent(order.project)}/edit`}
                      className="text-sm font-semibold text-foreground hover:text-primary transition-colors cursor-pointer underline decoration-primary/30 underline-offset-2 block"
                    >
                      {order.project}
                    </Link>
                  </div>
                )}
              </div>
            </InfoCard>
          )}
        </div>
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={showSubmitDialog}
        onOpenChange={setShowSubmitDialog}
        title="Confirm Order Submission"
        description="This will lock the order and notify production. Ensure all technical specifications are double-checked."
        onConfirm={async () => {
          await updateMutation.mutateAsync({
            name: order.name,
            data: { docstatus: 1 },
          });
          toast.success("Sales Order submitted successfully");
        }}
        loading={updateMutation.isPending}
      />

      <ConfirmDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        title="Revoke Order Commitment"
        description="This will cancel the order and stop production. This action is tracked in the audit trail."
        onConfirm={async () => {
          await updateMutation.mutateAsync({
            name: order.name,
            data: { docstatus: 2 },
          });
          toast.success("Order revoked and cancelled");
        }}
        loading={updateMutation.isPending}
      />

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Discard Draft"
        description="Permanently delete this draft Sales Order. It cannot be recovered."
        onConfirm={async () => {
          await deleteMutation.mutateAsync(order.name);
          toast.success("Order draft deleted");
        }}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
