"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Printer,
  Edit,
  Trash2,
  Send,
  Ban,
  Building2,
  MoreVertical,
  HandCoins,
  Receipt,
  Download,
  Calendar,
  Truck,
  AlertCircle,
  CreditCard,
  Clock,
  History as HistoryIcon,
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
import { DataPoint } from "@/components/ui/info-card";
import { Card } from "@/components/ui/card";
import type { PurchaseInvoice, Company } from "@/types/doctype-types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PurchaseInvoiceItem {
  item_code: string;
  item_name?: string;
  description: string;
  qty: number;
  rate: number;
  amount: number;
  uom?: string;
}

const getStatusBadgeClasses = (status: string) => {
  switch (status) {
    case "Draft":
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
    case "Unpaid":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300";
    case "Paid":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300";
    case "Overdue":
      return "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300";
    case "Part Paid":
      return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300";
    case "Cancelled":
      return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
};

export default function PurchaseInvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(params.name as string);

  // States
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch Invoice
  const {
    data: invoice,
    isLoading,
    refetch,
  } = useFrappeDoc<PurchaseInvoice>("Purchase Invoice", name);

  // Mutations
  const updateMutation = useFrappeUpdate<{ data: PurchaseInvoice }, any>(
    "Purchase Invoice",
    {
      onSuccess: () => {
        refetch();
        setShowSubmitDialog(false);
        setShowCancelDialog(false);
      },
    },
  );

  const deleteMutation = useFrappeDelete("Purchase Invoice", {
    onSuccess: () => router.push("/accounting/purchase-invoice"),
  });

  if (isLoading) return <LoadingState type="detail" />;
  if (!invoice)
    return (
      <div className="flex flex-col items-center justify-center p-20">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h3 className="text-xl font-bold">Bill Not Found</h3>
        <Button
          variant="link"
          onClick={() => router.push("/accounting/purchase-invoice")}
        >
          Back to list
        </Button>
      </div>
    );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ET", {
      style: "currency",
      currency: invoice.currency || "ETB",
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

  const isDraft = invoice.docstatus === 0;
  const isSubmitted = invoice.docstatus === 1;
  const isCancelled = invoice.docstatus === 2;
  const canPay = isSubmitted && (invoice.outstanding_amount ?? 0) > 0;

  const handleMakePayment = () => {
    router.push(
      `/accounting/payment-entry/new?invoice=${encodeURIComponent(invoice.name)}&party_type=Supplier&party=${encodeURIComponent(invoice.supplier ?? "")}&amount=${invoice.outstanding_amount ?? 0}&payment_type=Pay`,
    );
  };

  const items = (invoice.items || []) as unknown as PurchaseInvoiceItem[];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      <PageHeader
        title={invoice.name}
        subtitle={
          <div className="flex items-center gap-2">
            <Badge
              className={cn(
                "text-xs font-black uppercase tracking-widest border-0",
                getStatusBadgeClasses(invoice.status || "Draft"),
              )}
            >
              {invoice.status}
            </Badge>
          </div>
        }
        backUrl="/accounting/purchase-invoice"
        actions={
          <div className="flex gap-2 flex-wrap">
            {isDraft && (
              <>
                <Button
                  variant="outline"
                  className="rounded-full bg-card"
                  onClick={() =>
                    router.push(
                      `/accounting/purchase-invoice/${encodeURIComponent(name)}/edit`,
                    )
                  }
                >
                  <Edit className="h-4 w-4 mr-2" /> Edit
                </Button>
                <Button
                  className="rounded-full shadow-lg shadow-primary/20"
                  onClick={() => setShowSubmitDialog(true)}
                >
                  <Send className="h-4 w-4 mr-2" /> Submit
                </Button>
              </>
            )}

            {canPay && (
              <Button
                className="rounded-full bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-500/20"
                onClick={handleMakePayment}
              >
                <HandCoins className="h-4 w-4 mr-2" /> Pay Vendor
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full bg-card"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="rounded-2xl shadow-xl bg-card p-1.5 min-w-[200px]"
              >
                <DropdownMenuItem className="rounded-xl cursor-pointer">
                  <Printer className="h-4 w-4 mr-2" /> Print PDF
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {isSubmitted && !isCancelled && (
                  <DropdownMenuItem
                    className="rounded-xl cursor-pointer text-destructive"
                    onClick={() => setShowCancelDialog(true)}
                  >
                    <Ban className="h-4 w-4 mr-2" /> Cancel Invoice
                  </DropdownMenuItem>
                )}
                {isDraft && (
                  <DropdownMenuItem
                    className="rounded-xl cursor-pointer text-destructive"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Sheet */}
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-card rounded-[2.5rem] border border-border shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-5 select-none text-rose-600">
              <Receipt className="w-32 h-32" />
            </div>

            <div className="p-10 border-b border-border bg-gradient-to-br from-rose-500/5 to-transparent">
              <div className="flex flex-col md:flex-row justify-between gap-8">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-[0.3em] text-rose-600 mb-2">
                    Purchase Invoice
                  </h2>
                  <h1 className="text-4xl font-black tracking-tight">
                    {invoice.name}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-4 font-medium flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> {invoice.company}
                  </p>
                </div>
                <div className="text-md md:text-right space-y-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Invoice Date
                    </p>
                    <p className="font-bold flex items-center md:justify-end gap-2">
                      <Calendar className="w-4 h-4 text-rose-600" />{" "}
                      {formatDate(invoice.posting_date)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Due Date
                    </p>
                    <p className="font-bold flex items-center md:justify-end gap-2 text-rose-500">
                      <Clock className="w-4 h-4" />{" "}
                      {formatDate(invoice.due_date ?? "")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-12">
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">
                  Supplier / Vendor
                </h4>
                <div className="flex items-center gap-4 group">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center font-black text-lg text-rose-700 transition-colors">
                    <Truck className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-black text-lg">
                      {invoice.supplier_name || invoice.supplier}
                    </p>
                    <p className="text-xs text-muted-foreground font-medium">
                      {invoice.supplier}
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">
                  Payable Account
                </h4>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{invoice.credit_to}</p>
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
                      Accounts Payable
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/20 border-y border-border/50 text-muted-foreground">
                    <th className="px-10 py-5 text-left font-black text-[10px] uppercase tracking-widest">
                      Description
                    </th>
                    <th className="px-6 py-5 text-right font-black text-[10px] uppercase tracking-widest">
                      Qty
                    </th>
                    <th className="px-6 py-5 text-right font-black text-[10px] uppercase tracking-widest">
                      Rate
                    </th>
                    <th className="px-10 py-5 text-right font-black text-[10px] uppercase tracking-widest">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {items.map((item, i) => (
                    <tr
                      key={i}
                      className="hover:bg-rose-500/5 transition-colors"
                    >
                      <td className="px-10 py-6">
                        <p className="font-black text-foreground">
                          {item.item_code}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {item.description}
                        </p>
                      </td>
                      <td className="px-6 py-6 text-right font-bold text-muted-foreground">
                        {item.qty} {item.uom || "Nos"}
                      </td>
                      <td className="px-6 py-6 text-right font-bold text-muted-foreground">
                        {formatCurrency(item.rate)}
                      </td>
                      <td className="px-10 py-6 text-right font-black text-foreground">
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-10 bg-secondary/5 border-t border-border mt-10">
              <div className="flex flex-col md:flex-row justify-between gap-10">
                <div className="md:w-1/2 space-y-6">
                  <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 inline-block">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary mb-1">
                      Currency
                    </p>
                    <p className="text-sm font-black tracking-widest">
                      {invoice.currency}
                    </p>
                  </div>
                </div>

                <div className="md:w-1/3 space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground font-medium">
                      Net Total
                    </span>
                    <span className="font-bold">
                      {formatCurrency(invoice.total ?? 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground font-medium">
                      Taxes & Charges
                    </span>
                    <span className="font-bold">
                      {formatCurrency(invoice.total_taxes_and_charges ?? 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t-2 border-border/50 mb-2">
                    <span className="text-lg font-black uppercase tracking-widest text-foreground">
                      Grand Total
                    </span>
                    <span className="text-2xl font-black text-rose-600">
                      {formatCurrency(invoice.grand_total ?? 0)}
                    </span>
                  </div>
                  <div className="p-6 bg-rose-500/10 rounded-[1.5rem] border border-rose-500/20 shadow-xl mt-6">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black uppercase tracking-[0.2em] text-rose-700">
                        Outstanding
                      </span>
                      <span className="text-xl font-black text-rose-700 tracking-tight">
                        {formatCurrency(invoice.outstanding_amount ?? 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="rounded-[2.5rem] p-8 border-border/50 bg-card/30 backdrop-blur-sm space-y-6 shadow-sm">
            <h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-3 border-b border-border pb-4">
              <HistoryIcon className="w-4 h-4 text-rose-600" /> Audit Trail
            </h3>
            <div className="space-y-4">
              <DataPoint label="Owner" value={invoice.owner} />
              <DataPoint
                label="Recorded On"
                value={formatDate(invoice.creation ?? "")}
              />
              <DataPoint
                label="Last Sync"
                value={formatDate(invoice.modified ?? "")}
              />
            </div>
          </Card>

          <Card className="rounded-[2.5rem] p-8 bg-rose-600 text-white relative overflow-hidden group shadow-2xl">
            <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <HandCoins className="w-40 h-40" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white/40 mb-2">
              Liability Management
            </h3>
            <h2 className="text-xl font-black mb-4">Settle Bill</h2>
            <p className="text-xs text-white/60 leading-relaxed mb-6">
              Generate a bank or cash payment entry to settle this vendor
              invoice.
            </p>
            <Button
              variant="outline"
              className="w-full rounded-2xl border-white/20 bg-white/5 hover:bg-white text-white hover:text-black font-black transition-all"
              onClick={handleMakePayment}
              disabled={!canPay}
            >
              Create Payment
            </Button>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={showSubmitDialog}
        onOpenChange={setShowSubmitDialog}
        title="Submit Purchase Invoice"
        description="This will finalize the vendor bill and post to ledger. Proceed?"
        onConfirm={async () => {
          await updateMutation.mutateAsync({
            name: invoice.name,
            data: { docstatus: 1 },
          });
          toast.success("Bill Submitted");
        }}
        loading={updateMutation.isPending}
      />

      <ConfirmDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        title="Cancel Bill"
        description="Are you sure you want to cancel this purchase invoice?"
        confirmText="Cancel Bill"
        onConfirm={async () => {
          await updateMutation.mutateAsync({
            name: invoice.name,
            data: { docstatus: 2 },
          });
          toast.success("Bill Cancelled");
        }}
        loading={updateMutation.isPending}
      />

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Bill"
        description="Delete this draft bill permanently?"
        onConfirm={async () => {
          await deleteMutation.mutateAsync(invoice.name);
          toast.success("Bill Deleted");
        }}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
