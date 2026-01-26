// @ts-nocheck
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Search,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  Package,
  Calendar,
  MapPin,
  User,
  FileText,
  RotateCcw,
  AlertTriangle,
  Lock,
  Receipt,
  Building2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFrappeList, useFrappeDelete } from "@/hooks/generic";
import {
  PageHeader,
  LoadingState,
  EmptyState,
  ConfirmDialog,
} from "@/components/smart";
import type { DeliveryNote } from "@/types/doctype-types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

const STATUS_CONFIG = {
  Draft: {
    color: "text-slate-600",
    bg: "bg-slate-100 dark:bg-slate-800",
    icon: Pencil,
  },
  "To Bill": {
    color: "text-amber-600",
    bg: "bg-amber-100 dark:bg-amber-900/20",
    icon: FileText,
  },
  Completed: {
    color: "text-emerald-600",
    bg: "bg-emerald-100 dark:bg-emerald-900/20",
    icon: CheckCircle2,
  },
  Return: {
    color: "text-red-600",
    bg: "bg-red-100 dark:bg-red-900/20",
    icon: RotateCcw,
  },
  "Return Issued": {
    color: "text-orange-600",
    bg: "bg-orange-100 dark:bg-orange-900/20",
    icon: AlertTriangle,
  },
  Cancelled: {
    color: "text-gray-400",
    bg: "bg-gray-100 dark:bg-gray-800",
    icon: XCircle,
  },
  Closed: {
    color: "text-gray-500",
    bg: "bg-gray-100 dark:bg-gray-800",
    icon: Lock,
  },
};

function DeliveryNoteCard({
  dn,
  index,
  onView,
  onEdit,
  onDelete,
  onCreateInvoice,
}) {
  const statusConfig = STATUS_CONFIG[dn.status] || STATUS_CONFIG.Draft;
  const StatusIcon = statusConfig.icon;
  const isDraft = dn.docstatus === 0;
  const canInvoice = dn.status === "To Bill";
  const isReturn = dn.is_return === 1;
  const billedPercent = dn.per_billed || 0;

  return (
    <div
      className={cn(
        "group relative bg-card rounded-2xl border p-6",
        "hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20",
        "transition-all duration-300 cursor-pointer animate-in fade-in slide-in-from-bottom-4",
        isReturn ? "border-red-200 dark:border-red-800/50" : "border-border/50",
      )}
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={onView}
    >
      {/* Return Badge */}
      {isReturn && (
        <div className="absolute -top-2 -left-2 px-2.5 py-1 bg-red-500 text-white text-[10px] font-bold rounded-full shadow-lg">
          RETURN
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "h-12 w-12 rounded-xl flex items-center justify-center border",
              statusConfig.bg,
              statusConfig.color,
            )}
          >
            <Truck className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">
              {dn.name}
            </h3>
            <p className="text-xs text-muted-foreground">
              {dn.posting_date
                ? format(parseISO(dn.posting_date), "MMM d, yyyy")
                : "—"}
            </p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-xl">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onView();
              }}
            >
              <Eye className="h-4 w-4 mr-2" /> View Details
            </DropdownMenuItem>
            {isDraft && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                <Pencil className="h-4 w-4 mr-2" /> Edit
              </DropdownMenuItem>
            )}
            {canInvoice && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateInvoice();
                  }}
                  className="text-emerald-600 focus:text-emerald-600"
                >
                  <Receipt className="h-4 w-4 mr-2" /> Create Invoice
                </DropdownMenuItem>
              </>
            )}
            {isDraft && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Customer Info */}
      <div className="mb-4 p-3 bg-secondary/20 rounded-xl">
        <div className="flex items-center gap-2 text-sm">
          <Building2 className="h-4 w-4 text-primary shrink-0" />
          <span className="font-bold truncate">
            {dn.customer_name || dn.customer}
          </span>
        </div>
        {dn.shipping_address_name && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{dn.shipping_address_name}</span>
          </div>
        )}
      </div>

      {/* Logistics Info */}
      <div className="grid grid-cols-2 gap-3 text-xs mb-4">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Package className="h-3.5 w-3.5" />
          <span>{dn.total_qty || 0} items</span>
        </div>
        {dn.driver_name && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <User className="h-3.5 w-3.5" />
            <span className="truncate">{dn.driver_name}</span>
          </div>
        )}
        {dn.vehicle_no && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Truck className="h-3.5 w-3.5" />
            <span className="font-mono">{dn.vehicle_no}</span>
          </div>
        )}
        {dn.grand_total > 0 && (
          <div className="flex items-center gap-1.5 text-foreground font-bold">
            ETB {dn.grand_total?.toLocaleString()}
          </div>
        )}
      </div>

      {/* Billing Progress (for To Bill status) */}
      {canInvoice && billedPercent < 100 && (
        <div className="mb-4">
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-muted-foreground uppercase font-bold tracking-wider">
              Billed
            </span>
            <span className="font-bold">{Math.round(billedPercent)}%</span>
          </div>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full"
              style={{ width: `${billedPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="pt-3 border-t border-border/50 flex items-center justify-between">
        <Badge
          className={cn(
            "rounded-full text-[10px] font-bold border",
            statusConfig.bg,
            statusConfig.color,
          )}
        >
          <StatusIcon className="h-3 w-3 mr-1" />
          {dn.status}
        </Badge>
        {dn.lr_no && (
          <span className="text-[10px] font-mono text-muted-foreground">
            LR: {dn.lr_no}
          </span>
        )}
      </div>
    </div>
  );
}

export default function DeliveryNoteListPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const {
    data: deliveryNotes,
    isLoading,
    refetch,
  } = useFrappeList<DeliveryNote>("Delivery Note", {
    fields: [
      "name",
      "customer",
      "customer_name",
      "posting_date",
      "status",
      "grand_total",
      "total_qty",
      "per_billed",
      "driver_name",
      "vehicle_no",
      "lr_no",
      "shipping_address_name",
      "is_return",
      "docstatus",
    ],
    orderBy: { field: "posting_date", order: "desc" },
    limit: 100,
  });

  const deleteMutation = useFrappeDelete("Delivery Note", {
    onSuccess: () => {
      toast.success("Delivery Note deleted");
      refetch();
      setDeleteTarget(null);
    },
  });

  const filtered = useMemo(() => {
    if (!deliveryNotes) return [];
    return deliveryNotes.filter((dn) => {
      const matchesSearch =
        !searchTerm ||
        dn.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dn.customer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dn.customer_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || dn.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [deliveryNotes, searchTerm, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: deliveryNotes?.length || 0 };
    deliveryNotes?.forEach((dn) => {
      counts[dn.status] = (counts[dn.status] || 0) + 1;
    });
    return counts;
  }, [deliveryNotes]);

  if (isLoading) return <LoadingState message="Loading delivery notes..." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Delivery Notes"
        subtitle="Manage deliveries, gate passes, and dispatch tracking"
        primaryAction={{
          label: "New Delivery",
          onClick: () => router.push("/stock/delivery-note/new"),
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by DN#, customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-full"
          />
        </div>

        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList className="bg-secondary/30 p-1 rounded-full h-auto flex-wrap">
            <TabsTrigger value="all" className="rounded-full">
              All ({statusCounts.all || 0})
            </TabsTrigger>
            <TabsTrigger value="Draft" className="rounded-full">
              Draft
            </TabsTrigger>
            <TabsTrigger value="To Bill" className="rounded-full">
              <FileText className="h-3 w-3 mr-1" /> To Bill
            </TabsTrigger>
            <TabsTrigger value="Completed" className="rounded-full">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Completed
            </TabsTrigger>
            <TabsTrigger value="Return" className="rounded-full">
              <RotateCcw className="h-3 w-3 mr-1" /> Returns
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No delivery notes"
          description={
            searchTerm
              ? "Try different search terms"
              : "Create your first delivery"
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((dn, idx) => (
            <DeliveryNoteCard
              key={dn.name}
              dn={dn}
              index={idx}
              onView={() =>
                router.push(
                  `/stock/delivery-note/${encodeURIComponent(dn.name)}`,
                )
              }
              onEdit={() =>
                router.push(
                  `/stock/delivery-note/${encodeURIComponent(dn.name)}/edit`,
                )
              }
              onDelete={() => setDeleteTarget(dn.name)}
              onCreateInvoice={() =>
                router.push(
                  `/accounting/sales-invoice/new?delivery_note=${encodeURIComponent(dn.name)}`,
                )
              }
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title="Delete Delivery Note?"
        description="This will permanently delete this delivery note."
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        loading={deleteMutation.isPending}
        variant="destructive"
      />
    </div>
  );
}
