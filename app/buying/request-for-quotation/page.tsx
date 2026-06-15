"use client";

// app/buying/request-for-quotation/page.tsx
// Request for Quotation list — KPICard + StatusBadge + card grid. OKLCH semantic tokens only.

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  MoreVertical,
  Eye,
  Pencil,
  Trash2,
  Search,
  FileSearch,
  Calendar,
  Building2,
  Users,
  Package,
  Send,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFrappeList, useFrappeDelete } from "@/hooks/generic";
import {
  PageHeader,
  LoadingState,
  EmptyState,
  ConfirmDialog,
  StatusBadge,
} from "@/components/smart";
import { KPICard } from "@/components/dashboard/KPICard";
import type { RequestForQuotation } from "@/types/doctype-types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface RFQListItem {
  name: string;
  company: string;
  transaction_date: string;
  status: string;
  docstatus: number;
  suppliers?: unknown[];
  items?: unknown[];
}

function RFQCard({
  rfq,
  index,
  onView,
  onDelete,
}: {
  rfq: RFQListItem;
  index: number;
  onView: () => void;
  onDelete: () => void;
}) {
  const isDraft = rfq.docstatus === 0;

  return (
    <div
      className={cn(
        "group relative bg-card rounded-2xl border border-border/50",
        "hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5",
        "transition-all duration-300 cursor-pointer overflow-hidden",
        "animate-slide-up",
      )}
      style={{ animationDelay: `${index * 40}ms` }}
      onClick={onView}
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-bold text-foreground group-hover:text-primary transition-colors tracking-tight">
              {rfq.name}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              {rfq.company}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full hover:bg-primary/5"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onView();
                }}
                className="rounded-xl"
              >
                <Eye className="h-4 w-4 mr-2" /> View RFQ
              </DropdownMenuItem>
              {isDraft && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="rounded-xl text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-3 mb-5">
          <div className="flex items-center justify-between text-xs px-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>{rfq.transaction_date || "—"}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                {rfq.suppliers?.length ?? 0}
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <Package className="h-3.5 w-3.5" />
                {rfq.items?.length ?? 0}
              </span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-border/50 flex justify-between items-center">
          <StatusBadge status={rfq.status} />
          <div className="h-8 w-8 rounded-full flex items-center justify-center bg-secondary/50 text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all">
            <Eye className="h-4 w-4" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RequestForQuotationListPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const {
    data: rfqs,
    isLoading,
    refetch,
  } = useFrappeList<RFQListItem>("Request for Quotation", {
    fields: [
      "name",
      "company",
      "transaction_date",
      "status",
      "docstatus",
    ],
    orderBy: { field: "creation", order: "desc" },
    limit: 100,
  });

  const deleteMutation = useFrappeDelete("Request for Quotation", {
    onSuccess: () => {
      toast.success("RFQ deleted");
      refetch();
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const filtered = useMemo(() => {
    if (!rfqs) return [];
    return rfqs.filter(
      (r) =>
        r.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.company?.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [rfqs, searchTerm]);

  const kpis = useMemo(() => {
    if (!rfqs) return { total: 0, pending: 0, completed: 0 };
    return {
      total: rfqs.length,
      pending: rfqs.filter(
        (r) => r.status === "Draft" || r.status === "Submitted",
      ).length,
      completed: rfqs.filter((r) => r.status === "Cancelled").length,
    };
  }, [rfqs]);

  if (isLoading) return <LoadingState type="list" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Requests for Quotation"
        subtitle="Send RFQs to suppliers and collect competitive quotes"
        primaryAction={{
          label: "Create RFQ",
          onClick: () => router.push("/buying/request-for-quotation/new"),
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard title="Total RFQs" value={kpis.total} icon={FileSearch} />
        <KPICard
          title="Pending Responses"
          value={kpis.pending}
          icon={Send}
          variant="warning"
        />
        <KPICard
          title="Completed"
          value={kpis.completed}
          icon={CheckCircle2}
          variant="success"
        />
      </div>

      <div className="bg-card rounded-2xl border border-border/50 p-2 shadow-sm">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Search by ID or company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-11 h-12 rounded-xl bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={FileSearch}
          title="No requests for quotation found"
          description={
            searchTerm
              ? "Try adjusting your filters"
              : "Create an RFQ to solicit quotes from suppliers"
          }
          action={
            searchTerm
              ? undefined
              : {
                  label: "New RFQ",
                  onClick: () =>
                    router.push("/buying/request-for-quotation/new"),
                }
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((rfq, idx) => (
            <RFQCard
              key={rfq.name}
              rfq={rfq}
              index={idx}
              onView={() =>
                router.push(
                  `/buying/request-for-quotation/${encodeURIComponent(rfq.name)}`,
                )
              }
              onDelete={() => setDeleteTarget(rfq.name)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Request for Quotation?"
        description="Only draft RFQs can be deleted. This will permanently remove the record."
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget); }}
        loading={deleteMutation.isPending}
        variant="destructive"
      />
    </div>
  );
}
