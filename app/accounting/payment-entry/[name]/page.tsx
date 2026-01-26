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
  AlertCircle,
  CreditCard,
  Clock,
  Landmark,
  Wallet,
  ArrowRightCircle,
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
import type { PaymentEntry } from "@/types/doctype-types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PaymentEntryReference {
  reference_doctype: string;
  reference_name: string;
  total_amount: number;
  outstanding_amount: number;
  allocated_amount: number;
}

export default function PaymentEntryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(params.name as string);

  // States
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch Entry
  const {
    data: entry,
    isLoading,
    refetch,
  } = useFrappeDoc<PaymentEntry>("Payment Entry", name);

  // Mutations
  const updateMutation = useFrappeUpdate<{ data: PaymentEntry }, any>(
    "Payment Entry",
    {
      onSuccess: () => {
        refetch();
        setShowSubmitDialog(false);
        setShowCancelDialog(false);
      },
    },
  );

  const deleteMutation = useFrappeDelete("Payment Entry", {
    onSuccess: () => router.push("/accounting/payment-entry"),
  });

  if (isLoading) return <LoadingState type="detail" />;
  if (!entry)
    return (
      <div className="flex flex-col items-center justify-center p-20">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h3 className="text-xl font-bold">Payment Entry Not Found</h3>
        <Button
          variant="link"
          onClick={() => router.push("/accounting/payment-entry")}
        >
          Back to list
        </Button>
      </div>
    );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ET", {
      style: "currency",
      currency: "ETB",
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

  const isDraft = entry.docstatus === 0;
  const isSubmitted = entry.docstatus === 1;
  const isCancelled = entry.docstatus === 2;
  const isReceive = entry.payment_type === "Receive";

  const references = (entry.references ||
    []) as unknown as PaymentEntryReference[];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      <PageHeader
        title={entry.name}
        subtitle={
          <div className="flex items-center gap-2">
            <Badge
              className={cn(
                "text-xs font-black uppercase tracking-widest border-0",
                isSubmitted
                  ? "bg-emerald-100 text-emerald-700"
                  : isCancelled
                    ? "bg-gray-100 text-gray-600"
                    : "bg-slate-100 text-slate-700",
              )}
            >
              {isSubmitted ? "Submitted" : isCancelled ? "Cancelled" : "Draft"}
            </Badge>
            <Badge
              variant="outline"
              className="text-[10px] font-black uppercase tracking-widest"
            >
              {entry.payment_type}
            </Badge>
          </div>
        }
        backUrl="/accounting/payment-entry"
        actions={
          <div className="flex gap-2 flex-wrap">
            {isDraft && (
              <>
                <Button
                  variant="outline"
                  className="rounded-full bg-card"
                  onClick={() =>
                    router.push(
                      `/accounting/payment-entry/${encodeURIComponent(name)}/edit`,
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
                  <Printer className="h-4 w-4 mr-2" /> Print Receipt
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {isSubmitted && !isCancelled && (
                  <DropdownMenuItem
                    className="rounded-xl cursor-pointer text-destructive"
                    onClick={() => setShowCancelDialog(true)}
                  >
                    <Ban className="h-4 w-4 mr-2" /> Cancel Entry
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
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-card rounded-[2.5rem] border border-border shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-10 opacity-5 select-none text-primary">
              <Landmark className="w-40 h-40" />
            </div>

            <div className="p-10 border-b border-border bg-gradient-to-br from-primary/5 to-transparent">
              <div className="flex flex-col md:flex-row justify-between gap-8">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-[0.4em] text-primary mb-2">
                    Financial Voucher
                  </h2>
                  <h1 className="text-4xl font-black tracking-tight">
                    {entry.name}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-4 font-bold flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />{" "}
                    {entry.company}
                  </p>
                </div>
                <div className="md:text-right space-y-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Posting Date
                    </p>
                    <p className="font-bold flex items-center md:justify-end gap-2">
                      <Calendar className="w-4 h-4 text-primary" />{" "}
                      {formatDate(entry.posting_date)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Status
                    </p>
                    <p className="font-bold text-emerald-600 flex items-center md:justify-end gap-2">
                      <Clock className="w-4 h-4" /> Real-time Settled
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-10 grid grid-cols-1 md:grid-cols-3 gap-12">
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">
                  {entry.party_type}
                </h4>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-secondary/50 flex items-center justify-center font-black text-lg text-primary">
                    {(entry.party || " ").charAt(0)}
                  </div>
                  <div>
                    <p className="font-black text-lg truncate max-w-[150px]">
                      {entry.party}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest leading-none mt-1">
                      Beneficiary
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">
                  Paid To/By
                </h4>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold truncate max-w-[150px]">
                      {isReceive ? entry.paid_to : entry.paid_from}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest leading-none mt-1">
                      {isReceive ? "Bank/Cash Account" : "Source Account"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-primary/5 rounded-[2rem] p-6 border border-primary/10">
                <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-primary mb-2">
                  Net Amount
                </h4>
                <p className="text-2xl font-black tracking-tighter">
                  {formatCurrency(
                    isReceive ? entry.received_amount : entry.paid_amount,
                  )}
                </p>
                <p className="text-[10px] text-primary/60 font-medium mt-1">
                  Via {entry.mode_of_payment}
                </p>
              </div>
            </div>

            {/* References Table */}
            {references.length > 0 && (
              <div className="border-t border-border">
                <div className="p-10 pb-4">
                  <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-3">
                    <ArrowRightCircle className="w-4 h-4 text-primary" />{" "}
                    Invoice Allocations
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-secondary/20 border-y border-border/50 text-muted-foreground">
                        <th className="px-10 py-5 text-left font-black text-[10px] uppercase tracking-widest">
                          Reference ID
                        </th>
                        <th className="px-6 py-5 text-right font-black text-[10px] uppercase tracking-widest">
                          Total Amount
                        </th>
                        <th className="px-6 py-5 text-right font-black text-[10px] uppercase tracking-widest">
                          Remaining
                        </th>
                        <th className="px-10 py-5 text-right font-black text-[10px] uppercase tracking-widest">
                          Allocated
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {references.map((ref, i) => (
                        <tr
                          key={i}
                          className="hover:bg-primary/5 transition-colors group"
                        >
                          <td className="px-10 py-6">
                            <p className="font-black text-foreground">
                              {ref.reference_name}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1 group-hover:text-primary transition-colors">
                              {ref.reference_doctype}
                            </p>
                          </td>
                          <td className="px-6 py-6 text-right font-bold text-muted-foreground">
                            {formatCurrency(ref.total_amount)}
                          </td>
                          <td className="px-6 py-6 text-right font-bold text-muted-foreground">
                            {formatCurrency(ref.outstanding_amount)}
                          </td>
                          <td className="px-10 py-6 text-right font-black text-emerald-600">
                            {formatCurrency(ref.allocated_amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {entry.remarks && (
              <div className="p-10 bg-secondary/10 border-t border-border">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-3">
                  Remarks / Internal Notes
                </h4>
                <p className="text-xs text-muted-foreground font-medium leading-relaxed bg-card p-6 rounded-[2rem] border border-border/50 italic">
                  {entry.remarks}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <Card className="rounded-[2.5rem] p-8 border-border/50 bg-card/30 backdrop-blur-sm space-y-6 shadow-sm">
            <h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-3 border-b border-border pb-4">
              <HistoryIcon className="w-4 h-4 text-primary" /> Audit Info
            </h3>
            <div className="space-y-4">
              <DataPoint label="Prepared By" value={entry.owner} />
              <DataPoint
                label="Created At"
                value={formatDate(entry.creation ?? "")}
              />
              <DataPoint
                label="Last Modified"
                value={formatDate(entry.modified ?? "")}
              />
            </div>
          </Card>

          <Card className="rounded-[2.5rem] p-8 bg-black text-white relative overflow-hidden group shadow-2xl">
            <div className="absolute -left-10 -bottom-10 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <Receipt className="w-40 h-40" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white/40 mb-2">
              Accounting Integrity
            </h3>
            <h2 className="text-xl font-black mb-4">GL Impact</h2>
            <p className="text-xs text-white/60 leading-relaxed mb-6">
              This entry has impacted the General Ledger. All balances for
              bank/cash and party accounts are updated.
            </p>
            <Button
              variant="outline"
              className="w-full rounded-2xl border-white/20 bg-white/5 hover:bg-white text-white hover:text-black font-black transition-all"
            >
              View Ledger
            </Button>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={showSubmitDialog}
        onOpenChange={setShowSubmitDialog}
        title="Submit Payment Voucher"
        description="This will finalize the payment and cannot be undone without cancellation. Confirm?"
        onConfirm={async () => {
          await updateMutation.mutateAsync({
            name: entry.name,
            data: { docstatus: 1 },
          });
          toast.success("Payment Submitted");
        }}
        loading={updateMutation.isPending}
      />

      <ConfirmDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        title="Cancel Payment Entry"
        description="Cancellation will reverse all accounting impacts. Proceed?"
        confirmText="Cancel Entry"
        onConfirm={async () => {
          await updateMutation.mutateAsync({
            name: entry.name,
            data: { docstatus: 2 },
          });
          toast.success("Payment Cancelled");
        }}
        loading={updateMutation.isPending}
      />

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Payment"
        description="Delete this draft payment entry permanently?"
        onConfirm={async () => {
          await deleteMutation.mutateAsync(entry.name);
          toast.success("Payment Deleted");
        }}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
