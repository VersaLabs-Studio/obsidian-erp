"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Printer,
  Edit,
  Trash2,
  Send,
  Ban,
  Building2,
  MoreVertical,
  BookOpen,
  Download,
  Calendar,
  AlertCircle,
  Clock,
  Landmark,
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
import { PageHeader, LoadingState, ConfirmDialog, StatusBadge } from "@/components/smart";
import { InfoCard, DataPoint } from "@/components/ui/info-card";
import { Card } from "@/components/ui/card";
import { FlowRail } from "@/components/flows/FlowRail";
import type { FlowChainResult } from "@/types/flow-types";
import type { JournalEntry } from "@/types/doctype-types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import { GuidedErrorDialog, useGuidedError } from "@/components/errors/GuidedErrorDialog";

interface JournalEntryAccount {
  account: string;
  account_name?: string;
  debit: number;
  credit: number;
  party_type?: string;
  party?: string;
  user_remark?: string;
}

export default function JournalEntryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(params.name as string);

  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { resolution, showError, dismiss } = useGuidedError();

  const {
    data: entry,
    isLoading,
    refetch,
  } = useFrappeDoc<JournalEntry>("Journal Entry", name);

  const updateMutation = useFrappeUpdate<{ data: JournalEntry }, any>(
    "Journal Entry",
    {
      onSuccess: () => {
        refetch();
        setShowSubmitDialog(false);
        setShowCancelDialog(false);
      },
    },
  );

  const deleteMutation = useFrappeDelete("Journal Entry", {
    onSuccess: () => router.push("/accounting/journal-entry"),
  });

  if (isLoading) return <LoadingState type="detail" />;
  if (!entry)
    return (
      <div className="flex flex-col items-center justify-center p-20">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h3 className="text-xl font-bold">Journal Entry Not Found</h3>
        <Button
          variant="link"
          onClick={() => router.push("/accounting/journal-entry")}
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

  const accounts = (entry.accounts || []) as unknown as JournalEntryAccount[];

  const chain: FlowChainResult = {
    flowId: "journal-entry",
    stages: [{
      id: "journal-entry",
      label: "Journal Entry",
      doctype: "Journal Entry",
      status: entry.docstatus === 1 ? "completed" : entry.docstatus === 0 ? "current" : "blocked",
      documentName: entry.name,
      documentUrl: `/accounting/journal-entry/${encodeURIComponent(entry.name)}`,
    }],
    currentIndex: 0,
    completedCount: entry.docstatus === 1 ? 1 : 0,
    pendingCount: entry.docstatus === 0 ? 1 : 0,
    isComplete: entry.docstatus === 1,
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      <PageHeader
        title={entry.name}
        subtitle={
          <div className="flex items-center gap-2">
            <StatusBadge status={entry.docstatus ?? 0} />
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground border border-border rounded-full px-2.5 py-0.5">
              {entry.voucher_type}
            </span>
          </div>
        }
        backUrl="/accounting/journal-entry"
        actions={
          <div className="flex gap-2 flex-wrap">
            {isDraft && (
              <>
                <Button
                  variant="outline"
                  className="rounded-full bg-card"
                  onClick={() =>
                    router.push(
                      `/accounting/journal-entry/${encodeURIComponent(name)}/edit`,
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
                  <Printer className="h-4 w-4 mr-2" /> Print PDF
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
          <div className="bg-card rounded-2xl border border-border shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-10 opacity-5 select-none text-primary">
              <BookOpen className="w-40 h-40" />
            </div>

            <div className="p-10 border-b border-border bg-gradient-to-br from-primary/5 to-transparent">
              <div className="flex flex-col md:flex-row justify-between gap-8">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-[0.4em] text-primary mb-2">
                    Voucher Entry
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
                    <p className="font-bold text-success flex items-center md:justify-end gap-2">
                      <Clock className="w-4 h-4" /> Real-time Audit
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
                      Account & Party
                    </th>
                    <th className="px-6 py-5 text-right font-black text-[10px] uppercase tracking-widest">
                      Debit
                    </th>
                    <th className="px-10 py-5 text-right font-black text-[10px] uppercase tracking-widest">
                      Credit
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {accounts.map((acc, i) => (
                    <tr
                      key={i}
                      className="hover:bg-primary/5 transition-colors group"
                    >
                      <td className="px-10 py-6">
                        <p className="font-black text-foreground">
                          {acc.account}
                        </p>
                        {acc.party && (
                          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1 group-hover:text-primary transition-colors">
                            {acc.party_type}: {acc.party}
                          </p>
                        )}
                        {acc.user_remark && (
                          <p className="text-xs text-muted-foreground mt-2 italic border-l-2 border-border pl-3">
                            {acc.user_remark}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-6 text-right font-black text-success">
                        {acc.debit > 0 ? formatCurrency(acc.debit) : "—"}
                      </td>
                      <td className="px-10 py-6 text-right font-black text-destructive">
                        {acc.credit > 0 ? formatCurrency(acc.credit) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-secondary/10 font-black">
                  <tr>
                    <td className="px-10 py-6 text-right uppercase tracking-[0.2em] text-[10px] text-muted-foreground">
                      Total Balanced
                    </td>
                    <td className="px-6 py-6 text-right text-success">
                      {formatCurrency(entry.total_debit ?? 0)}
                    </td>
                    <td className="px-10 py-6 text-right text-destructive">
                      {formatCurrency(entry.total_credit ?? 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {entry.user_remark && (
              <div className="p-10 bg-secondary/10 border-t border-border">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-3">
                  Voucher Narration
                </h4>
                <p className="text-xs text-muted-foreground font-medium leading-relaxed bg-card p-6 rounded-2xl border border-border/50 italic">
                  {entry.user_remark}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <Card className="rounded-2xl p-8 border-border/50 bg-card/30 backdrop-blur-sm space-y-6 shadow-sm">
            <h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-3 border-b border-border pb-4">
              <HistoryIcon className="w-4 h-4 text-primary" /> Audit Trail
            </h3>
            <div className="space-y-4">
              <DataPoint label="Authorized By" value={entry.owner} />
              <DataPoint
                label="Created At"
                value={formatDate(entry.creation ?? "")}
              />
              <DataPoint
                label="Doc status"
                value={
                  isSubmitted
                    ? "Submitted"
                    : isCancelled
                      ? "Cancelled"
                      : "Draft"
                }
              />
            </div>
          </Card>

          <Card className="rounded-2xl p-8 bg-primary text-primary-foreground relative overflow-hidden group shadow-xl">
            <div className="absolute -left-10 -bottom-10 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <BookOpen className="w-40 h-40" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-primary-foreground/40 mb-2">
              Internal Consistency
            </h3>
            <h2 className="text-xl font-black mb-4">GL Impact</h2>
            <p className="text-xs text-primary-foreground/60 leading-relaxed mb-6">
              This journal entry has finalized its impact on the General Ledger.
              All balances are updated in real-time.
            </p>
            <Button
              variant="outline"
              className="w-full rounded-2xl border-primary-foreground/20 bg-primary-foreground/5 hover:bg-primary-foreground hover:text-primary font-black transition-all"
            >
              View Ledger
            </Button>
          </Card>

          <InfoCard title="Flow">
            <FlowRail result={chain} currentDocName={name} sourceDoctype="Journal Entry" />
          </InfoCard>
        </div>
      </div>

      <ConfirmDialog
        open={showSubmitDialog}
        onOpenChange={setShowSubmitDialog}
        title="Submit Journal Entry"
        description="This will finalize the accounting impact. Proceed?"
        onConfirm={async () => {
          try {
            await updateMutation.mutateAsync({
              name: entry.name,
              data: { docstatus: 1 },
            });
            toast.success("Entry Submitted");
          } catch (err) {
            showError(resolveFrappeError(err, { doctype: "Journal Entry" }));
          }
        }}
        loading={updateMutation.isPending}
      />

      <ConfirmDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        title="Cancel Entry"
        description="Reverse the accounting impact of this journal entry?"
        confirmText="Cancel Entry"
        onConfirm={async () => {
          try {
            await updateMutation.mutateAsync({
              name: entry.name,
              data: { docstatus: 2 },
            });
            toast.success("Entry Cancelled");
          } catch (err) {
            showError(resolveFrappeError(err, { doctype: "Journal Entry" }));
          }
        }}
        loading={updateMutation.isPending}
      />

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Journal Entry"
        description="Delete this draft entry permanently?"
        onConfirm={async () => {
          try {
            await deleteMutation.mutateAsync(entry.name);
            toast.success("Entry Deleted");
          } catch (err) {
            showError(resolveFrappeError(err, { doctype: "Journal Entry" }));
          }
        }}
        loading={deleteMutation.isPending}
      />
      <GuidedErrorDialog resolution={resolution} onDismiss={dismiss} />
    </div>
  );
}
