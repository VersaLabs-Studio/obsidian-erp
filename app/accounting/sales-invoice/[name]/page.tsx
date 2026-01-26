"use client";

import { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
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
  Building2,
  Phone,
  Mail,
  MoreVertical,
  Check,
  CreditCard,
  HandCoins,
  Receipt,
  Download,
  Calendar,
  User,
  AlertCircle,
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
import type {
  SalesInvoice,
  Address,
  Contact,
  Company,
} from "@/types/doctype-types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";

interface SalesInvoiceItem {
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

export default function SalesInvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(params.name as string);

  // States
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch Invoice
  const {
    data: invoice,
    isLoading,
    refetch,
  } = useFrappeDoc<SalesInvoice>("Sales Invoice", name);

  // Mutations
  const updateMutation = useFrappeUpdate<{ data: SalesInvoice }, any>(
    "Sales Invoice",
    {
      onSuccess: () => {
        refetch();
        setShowSubmitDialog(false);
        setShowCancelDialog(false);
      },
    },
  );

  const deleteMutation = useFrappeDelete("Sales Invoice", {
    onSuccess: () => router.push("/accounting/sales-invoice"),
  });

  if (isLoading) return <LoadingState type="detail" />;
  if (!invoice)
    return (
      <div className="flex flex-col items-center justify-center p-20">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h3 className="text-xl font-bold">Invoice Not Found</h3>
        <Button
          variant="link"
          onClick={() => router.push("/accounting/sales-invoice")}
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
      `/accounting/payment-entry/new?invoice=${encodeURIComponent(invoice.name)}&party_type=Customer&party=${encodeURIComponent(invoice.customer ?? "")}&amount=${invoice.outstanding_amount ?? 0}`,
    );
  };

  const items = (invoice.items || []) as unknown as SalesInvoiceItem[];

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
            {Number(invoice.is_opening) === 1 && (
              <Badge
                variant="outline"
                className="text-[10px] uppercase font-black tracking-widest text-sky-600 bg-sky-500/5 border-sky-500/20"
              >
                Opening Balance
              </Badge>
            )}
          </div>
        }
        backUrl="/accounting/sales-invoice"
        actions={
          <div className="flex gap-2 flex-wrap">
            {isDraft && (
              <>
                <Button
                  variant="outline"
                  className="rounded-full bg-card"
                  onClick={() =>
                    router.push(
                      `/accounting/sales-invoice/${encodeURIComponent(name)}/edit`,
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
                className="rounded-full bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20"
                onClick={handleMakePayment}
              >
                <HandCoins className="h-4 w-4 mr-2" /> Make Payment
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
                <DropdownMenuItem className="rounded-xl cursor-pointer">
                  <Download className="h-4 w-4 mr-2" /> Export JSON
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
        {/* Main Content (Invoice Sheet) */}
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-card rounded-[2.5rem] border border-border shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-5 select-none">
              <Receipt className="w-32 h-32" />
            </div>

            <div className="p-10 border-b border-border bg-gradient-to-br from-primary/5 to-transparent">
              <div className="flex flex-col md:flex-row justify-between gap-8">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-[0.3em] text-primary mb-2">
                    Invoice Details
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
                      Posting Date
                    </p>
                    <p className="font-bold flex items-center md:justify-end gap-2">
                      <Calendar className="w-4 h-4 text-primary" />{" "}
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
                  Customer
                </h4>
                <div className="flex items-center gap-4 group">
                  <div className="w-12 h-12 rounded-2xl bg-secondary/50 flex items-center justify-center font-black text-lg group-hover:bg-primary/10 transition-colors">
                    {(invoice.customer_name || invoice.customer || " ").charAt(
                      0,
                    )}
                  </div>
                  <div>
                    <p className="font-black text-lg">
                      {invoice.customer_name || invoice.customer}
                    </p>
                    <p className="text-xs text-muted-foreground font-medium">
                      {invoice.customer}
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">
                  Receivable Account
                </h4>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{invoice.debit_to}</p>
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
                      General Ledger
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Table Area */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/20 border-y border-border/50 text-muted-foreground">
                    <th className="px-10 py-5 text-left font-black text-[10px] uppercase tracking-widest">
                      Item
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
                      className="hover:bg-primary/5 transition-colors"
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

            {/* Financial Summary */}
            <div className="p-10 bg-secondary/5 border-t border-border mt-10">
              <div className="flex flex-col md:flex-row justify-between gap-10">
                <div className="md:w-1/2 space-y-6">
                  {invoice.terms && (
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-3">
                        Terms & Conditions
                      </h4>
                      <div className="text-xs text-muted-foreground bg-card p-5 rounded-2xl border border-border/50 leading-relaxed italic">
                        {invoice.terms}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="p-4 bg-orange-500/5 rounded-2xl border border-orange-500/10">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-orange-600 mb-1">
                        Total Tax
                      </p>
                      <p className="text-sm font-black">
                        {formatCurrency(invoice.total_taxes_and_charges ?? 0)}
                      </p>
                    </div>
                    <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary mb-1">
                        Currency
                      </p>
                      <p className="text-sm font-black tracking-widest">
                        {invoice.currency}
                      </p>
                    </div>
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
                    <span className="text-2xl font-black text-primary">
                      {formatCurrency(invoice.grand_total)}
                    </span>
                  </div>
                  <div className="p-6 bg-emerald-500/10 rounded-[1.5rem] border border-emerald-500/20 shadow-xl shadow-emerald-500/5 mt-6">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
                        Outstanding
                      </span>
                      <span className="text-xl font-black text-emerald-700 tracking-tight">
                        {formatCurrency(invoice.outstanding_amount ?? 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Widgets */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="rounded-[2.5rem] p-8 border-border/50 bg-card/30 backdrop-blur-sm space-y-6 shadow-sm">
            <h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-3 border-b border-border pb-4">
              <History className="w-4 h-4 text-primary" /> System Info
            </h3>
            <div className="space-y-4">
              <DataPoint label="Created By" value={invoice.owner} />
              <DataPoint
                label="Created On"
                value={formatDate(invoice.creation ?? "")}
              />
              <DataPoint
                label="Last Modified"
                value={formatDate(invoice.modified ?? "")}
              />
              <DataPoint label="Modified By" value={invoice.modified_by} />
            </div>
          </Card>

          <Card className="rounded-[2.5rem] p-8 bg-black text-white relative overflow-hidden group shadow-2xl">
            <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <HandCoins className="w-40 h-40" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white/40 mb-2">
              Automated Flow
            </h3>
            <h2 className="text-xl font-black mb-4">Payment Processing</h2>
            <p className="text-xs text-white/60 leading-relaxed mb-6">
              Generate a payment entry instantly for this invoice. All
              accounting ledgers will be synchronized automatically.
            </p>
            <Button
              variant="outline"
              className="w-full rounded-2xl border-white/20 bg-white/5 hover:bg-white text-white hover:text-black font-black transition-all"
              onClick={handleMakePayment}
              disabled={!canPay}
            >
              Launch Entry
            </Button>
          </Card>
        </div>
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={showSubmitDialog}
        onOpenChange={setShowSubmitDialog}
        title="Submit Sales Invoice"
        description="This will lock the document and finalize accounting entries. Proced?"
        onConfirm={async () => {
          await updateMutation.mutateAsync({
            name: invoice.name,
            data: { docstatus: 1 },
          });
          toast.success("Invoice Submitted");
        }}
        loading={updateMutation.isPending}
      />

      <ConfirmDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        title="Cancel Sales Invoice"
        description="Are you sure you want to cancel this invoice? This will reverse accounting entries."
        confirmText="Cancel Invoice"
        onConfirm={async () => {
          await updateMutation.mutateAsync({
            name: invoice.name,
            data: { docstatus: 2 },
          });
          toast.success("Invoice Cancelled");
        }}
        loading={updateMutation.isPending}
      />

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Invoice"
        description="Delete this draft invoice permanently?"
        onConfirm={async () => {
          await deleteMutation.mutateAsync(invoice.name);
          toast.success("Invoice Deleted");
        }}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

function History({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}
