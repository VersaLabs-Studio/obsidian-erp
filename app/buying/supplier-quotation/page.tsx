"use client";

// app/buying/supplier-quotation/page.tsx
// Supplier Quotation list — KPICard + StatusBadge + card grid. OKLCH semantic tokens only.

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  MoreVertical,
  Eye,
  Trash2,
  Search,
  FileText,
  Calendar,
  Building2,
  DollarSign,
  CheckCircle2,
  Clock,
  Send,
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
import type { SupplierQuotation } from "@/types/doctype-types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SQListItem {
  name: string;
  supplier: string;
  supplier_name?: string;
  transaction_date: string;
  grand_total?: number;
  currency?: string;
  status: string;
  docstatus: number;
}

function SQCard({
  sq,
  index,
  onView,
  onDelete,
}: {
  sq: SQListItem;
  index: number;
  onView: () => void;
  onDelete: () => void;
}) {
  const isDraft = sq.docstatus === 0;

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
              {sq.name}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              {sq.supplier_name || sq.supplier}
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
                <Eye className="h-4 w-4 mr-2" /> View Quotation
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
              <span>{sq.transaction_date || "—"}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground font-bold">
              <DollarSign className="h-3.5 w-3.5" />
              <span>
                {sq.currency || "ETB"} {(sq.grand_total ?? 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-border/50 flex justify-between items-center">
          <StatusBadge status={sq.status} />
          <div className="h-8 w-8 rounded-full flex items-center justify-center bg-secondary/50 text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all">
            <Eye className="h-4 w-4" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SupplierQuotationListPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const {
    data: sqs,
    isLoading,
    refetch,
  } = useFrappeList<SQListItem>("Supplier Quotation", {
    fields: [
      "name",
      "supplier",
      "supplier_name",
      "transaction_date",
      "grand_total",
      "currency",
      "status",
      "docstatus",
    ],
    orderBy: { field: "creation", order: "desc" },
    limit: 100,
  });

  const deleteMutation = useFrappeDelete("Supplier Quotation", {
    onSuccess: () => {
      toast.success("Supplier Quotation deleted");
      refetch();
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const filtered = useMemo(() => {
    if (!sqs) return [];
    return sqs.filter(
      (s) =>
        s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.supplier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [sqs, searchTerm]);

  const kpis = useMemo(() => {
    if (!sqs) return { total: 0, draft: 0, submitted: 0, accepted: 0 };
    return {
      total: sqs.length,
      draft: sqs.filter((s) => s.docstatus === 0).length,
      submitted: sqs.filter((s) => s.docstatus === 1).length,
      accepted: sqs.filter((s) => s.status === "Submitted").length,
    };
  }, [sqs]);

  if (isLoading) return <LoadingState type="list" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supplier Quotations"
        subtitle="Compare supplier quotes and select the best offer"
        primaryAction={{
          label: "Create Quotation",
          onClick: () => router.push("/buying/supplier-quotation/new"),
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <KPICard title="Total" value={kpis.total} icon={FileText} />
        <KPICard
          title="Draft"
          value={kpis.draft}
          icon={Clock}
          variant="warning"
        />
        <KPICard
          title="Submitted"
          value={kpis.submitted}
          icon={Send}
          variant="default"
        />
        <KPICard
          title="Accepted"
          value={kpis.accepted}
          icon={CheckCircle2}
          variant="success"
        />
      </div>

      <div className="bg-card rounded-2xl border border-border/50 p-2 shadow-sm">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Search by ID or supplier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-11 h-12 rounded-xl bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No supplier quotations found"
          description={
            searchTerm
              ? "Try adjusting your filters"
              : "Create a supplier quotation to record a vendor's quote"
          }
          action={
            searchTerm
              ? undefined
              : {
                  label: "New Quotation",
                  onClick: () =>
                    router.push("/buying/supplier-quotation/new"),
                }
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((sq, idx) => (
            <SQCard
              key={sq.name}
              sq={sq}
              index={idx}
              onView={() =>
                router.push(
                  `/buying/supplier-quotation/${encodeURIComponent(sq.name)}`,
                )
              }
              onDelete={() => setDeleteTarget(sq.name)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Supplier Quotation?"
        description="Only draft quotations can be deleted. This will permanently remove the record."
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget); }}
        loading={deleteMutation.isPending}
        variant="destructive"
      />
    </div>
  );
}
