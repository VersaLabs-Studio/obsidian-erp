// app/sales/sales-order/page.tsx
// Obsidian ERP v4.0 - Sales Orders List Page with Power Features

"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Eye,
  CalendarDays,
  User,
  Truck,
  Building2,
  DollarSign,
  Package,
  CheckCircle2,
  FileText,
  ArrowRight,
  LayoutGrid,
  TableIcon,
  Plus as PlusIcon,
} from "lucide-react";
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
  EmptyState,
  LoadingState,
  ConfirmDialog,
} from "@/components/smart";
import { KPICard } from "@/components/dashboard/KPICard";
import { CommandPalette } from "@/components/command/CommandPalette";
import type { SalesOrder } from "@/types/doctype-types";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/smart/status-badge";
import { ListErrorState } from "@/components/ui/list-error-state";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  EnhancedDataTable,
  StatusCell,
  CurrencyCell,
  DateCell,
  ProgressCell,
} from "@/components/shared/EnhancedDataTable";
import type { ListColumn } from "@/lib/list-power/column-config";
import {
  type SavedView,
  type SavedViewFilters,
  loadViews,
  createView,
  deleteView,
  touchView,
} from "@/lib/list-power/saved-views";
import { useExport } from "@/hooks/useExport";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDisplayStatus(order: SalesOrder): string {
  if (order.docstatus === 2) return "Cancelled";
  return order.status || "Draft";
}

function viewToStatusFilter(view: SavedView): string {
  const status = view.filters.status;
  if (!status) return "all";
  // Map saved view statuses to the filter keys used in the status pills
  const map: Record<string, string> = {
    Draft: "Draft",
    "To Deliver and Bill": "To Deliver and Bill",
    "To Deliver": "To Deliver",
    "To Bill": "To Bill",
    Completed: "Completed",
    Cancelled: "Cancelled",
  };
  return map[status] ?? status;
}

// ---------------------------------------------------------------------------
// Table columns definition
// ---------------------------------------------------------------------------

const SO_TABLE_COLUMNS: ListColumn<SalesOrder>[] = [
  {
    key: "name",
    label: "Order #",
    sortable: true,
    defaultVisible: true,
    toggleable: false,
    category: "identity",
  },
  {
    key: "customer_name",
    label: "Customer",
    sortable: true,
    defaultVisible: true,
    toggleable: true,
    category: "identity",
    cell: (_val, row) => {
      const o = row as SalesOrder;
      return <span>{o.customer_name || o.customer || "—"}</span>;
    },
  },
  {
    key: "transaction_date",
    label: "Order Date",
    sortable: true,
    defaultVisible: true,
    toggleable: true,
    category: "dates",
    cell: (_val, row) => <DateCell value={(row as SalesOrder).transaction_date} />,
  },
  {
    key: "delivery_date",
    label: "Delivery Date",
    sortable: true,
    defaultVisible: true,
    toggleable: true,
    category: "dates",
    cell: (_val, row) => <DateCell value={(row as SalesOrder).delivery_date ?? ""} />,
  },
  {
    key: "grand_total",
    label: "Grand Total",
    sortable: true,
    defaultVisible: true,
    toggleable: true,
    category: "financial",
    cell: (_val, row) => <CurrencyCell value={(row as SalesOrder).grand_total ?? 0} />,
  },
  {
    key: "per_delivered",
    label: "% Delivered",
    sortable: true,
    defaultVisible: true,
    toggleable: true,
    category: "progress",
    cell: (_val, row) => <ProgressCell value={(row as SalesOrder).per_delivered ?? 0} />,
  },
  {
    key: "per_billed",
    label: "% Billed",
    sortable: true,
    defaultVisible: true,
    toggleable: true,
    category: "progress",
    cell: (_val, row) => <ProgressCell value={(row as SalesOrder).per_billed ?? 0} />,
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
    defaultVisible: true,
    toggleable: true,
    category: "status",
    cell: (_val, row) => <StatusCell value={getDisplayStatus(row as SalesOrder)} />,
  },
  {
    key: "company",
    label: "Company",
    sortable: true,
    defaultVisible: false,
    toggleable: true,
    category: "other",
  },
];

// ---------------------------------------------------------------------------
// Card component (unchanged from original)
// ---------------------------------------------------------------------------

function SalesOrderCard({
  order,
  index,
  onView,
  onEdit,
  onDelete,
}: {
  order: SalesOrder;
  index: number;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const displayStatus = getDisplayStatus(order);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ET", {
      style: "currency",
      currency: "ETB",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const isEditable = order.status === "Draft" && order.docstatus === 0;
  const isDeletable = order.docstatus === 0;

  return (
    <div
      className={cn(
        "group relative bg-card rounded-2xl border border-border/50",
        "hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5",
        "transition-all duration-300 cursor-pointer overflow-hidden",
        "animate-slide-up"
      )}
      style={{ animationDelay: `${index * 40}ms` }}
      onClick={onView}
    >
      <div className="p-5">
        {/* Header Row */}
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-foreground tracking-tight">
                {order.name}
              </h3>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <User className="h-3 w-3" />
              {order.customer_name || order.customer || "No customer"}
            </p>
          </div>

          {/* Status Badge */}
          <StatusBadge status={displayStatus} size="sm" />
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
              Date
            </p>
            <p className="text-sm font-medium text-foreground flex items-center gap-1">
              <CalendarDays className="h-3 w-3 text-muted-foreground" />
              {formatDate(order.transaction_date)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
              Delivery Date
            </p>
            <p className="text-sm font-medium text-foreground flex items-center gap-1">
              <Truck className="h-3 w-3 text-muted-foreground" />
              {formatDate(order.delivery_date ?? "")}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
              Company
            </p>
            <p className="text-sm font-medium text-foreground flex items-center gap-1 truncate">
              <Building2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{order.company || "—"}</span>
            </p>
          </div>
        </div>

        {/* Footer with Amount and Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          {/* Grand Total */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
                Grand Total
              </p>
              <p className="text-lg font-bold text-foreground tracking-tight">
                {formatCurrency(order.grand_total ?? 0)}
              </p>
            </div>
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="rounded-xl border-border/50 shadow-xl bg-popover/95 backdrop-blur-xl p-1.5 min-w-[160px]"
            >
              <DropdownMenuItem
                className="rounded-lg cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onView();
                }}
              >
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              {isEditable && (
                <DropdownMenuItem
                  className="rounded-lg cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {isDeletable && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="rounded-lg cursor-pointer text-destructive focus:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function SalesOrderListPage() {
  const router = useRouter();
  const { exportData, isExporting } = useExport();

  // --- Power feature state ---
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<string>("creation");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [deleteTarget, setDeleteTarget] = useState<SalesOrder | null>(null);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);

  const PAGE_SIZE = 20;

  // --- Saved views ---
  const savedViews = useMemo(() => loadViews("Sales Order"), []);
  const activeView = useMemo(
    () => savedViews.find((v) => v.id === activeViewId) ?? null,
    [savedViews, activeViewId]
  );

  const handleViewSelect = useCallback(
    (viewId: string) => {
      const view = savedViews.find((v) => v.id === viewId);
      if (!view) return;
      setActiveViewId(viewId);
      setStatusFilter(viewToStatusFilter(view));
      if (view.sort) {
        setSortField(view.sort.field);
        setSortOrder(view.sort.order);
      }
      if (view.filters.search) setSearch(view.filters.search);
      setPage(1);
      touchView("Sales Order", viewId);
    },
    [savedViews]
  );

  // --- Server-side filters ---
  const filters = useMemo(() => {
    const f: [string, string, unknown][] = [];
    if (statusFilter !== "all") {
      f.push(["status", "=", statusFilter]);
    }
    return f;
  }, [statusFilter]);

  // --- Data fetch ---
  const {
    data: orders = [],
    isLoading,
    error,
  } = useFrappeList<SalesOrder>("Sales Order", {
    fields: [
      "name",
      "customer",
      "customer_name",
      "transaction_date",
      "delivery_date",
      "grand_total",
      "status",
      "docstatus",
      "company",
      "per_delivered",
      "per_billed",
    ],
    orderBy: { field: sortField, order: sortOrder },
    search,
    filters: filters.length > 0 ? filters : undefined,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  const deleteMutation = useFrappeDelete("Sales Order", {
    onSuccess: () => setDeleteTarget(null),
  });

  // --- Status counts (from server, using the full unfiltered fetch for KPIs) ---
  // For accurate counts we'd ideally have separate API calls; here we use the current page as approximation
  // since the server doesn't return total counts. The KPI section uses the filtered data.
  const statusCounts = useMemo(() => {
    if (!orders) return {};
    return orders.reduce(
      (acc, o) => {
        const status = getDisplayStatus(o);
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  }, [orders]);

  const kpis = useMemo(() => {
    if (!orders)
      return { total: 0, draft: 0, active: 0, completed: 0 };
    return {
      total: orders.length,
      draft: orders.filter((o) => o.status === "Draft").length,
      active: orders.filter((o) =>
        ["To Deliver and Bill", "To Deliver", "To Bill"].includes(o.status)
      ).length,
      completed: orders.filter((o) => o.status === "Completed").length,
    };
  }, [orders]);

  // --- Sort handler for the table ---
  const handleSort = useCallback(
    (field: string, order: "asc" | "desc" | null) => {
      if (order === null) {
        setSortField("creation");
        setSortOrder("desc");
      } else {
        setSortField(field);
        setSortOrder(order);
      }
      setPage(1);
    },
    []
  );

  // --- CSV export ---
  const handleExport = useCallback(() => {
    if (!orders || orders.length === 0) return;
    exportData(
      orders.map((o) => ({
        "Order #": o.name,
        Customer: o.customer_name || o.customer || "",
        "Order Date": o.transaction_date,
        "Delivery Date": o.delivery_date ?? "",
        "Grand Total": o.grand_total ?? 0,
        "% Delivered": o.per_delivered ?? 0,
        "% Billed": o.per_billed ?? 0,
        Status: getDisplayStatus(o),
        Company: o.company ?? "",
      })),
      "sales-orders",
      "Sales Orders Export",
      "csv"
    );
  }, [orders, exportData]);

  // --- Delete ---
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.name);
  };

  // --- Active filter chips ---
  const activeFilters = useMemo(() => {
    const chips: { id: string; label: string }[] = [];
    if (statusFilter !== "all") {
      chips.push({ id: "status", label: `Status: ${statusFilter}` });
    }
    return chips;
  }, [statusFilter]);

  if (isLoading && (!orders || orders.length === 0))
    return <LoadingState type="cards" count={6} />;
  if (error)
    return <ListErrorState error={error} label="sales orders" />;

  return (
    <div className="space-y-6">
      <CommandPalette />

      <PageHeader
        title="Sales Orders"
        subtitle={`${orders?.length ?? 0} order${(orders?.length ?? 0) !== 1 ? "s" : ""}`}
        showSearch
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Search by ID, customer..."
        actions={
          <div className="flex items-center gap-2">
            {/* View mode toggle */}
            <div className="flex items-center rounded-full border border-border/50 bg-secondary/30 p-0.5">
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                className="h-7 w-7 p-0 rounded-full"
                onClick={() => setViewMode("table")}
              >
                <TableIcon className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={viewMode === "cards" ? "default" : "ghost"}
                size="sm"
                className="h-7 w-7 p-0 rounded-full"
                onClick={() => setViewMode("cards")}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Button
              className="rounded-full shadow-lg shadow-primary/20"
              onClick={() => router.push("/sales/sales-order/new")}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Sales Order
            </Button>
          </div>
        }
      />

      {/* KPI Bar */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KPICard
          title="Total Orders"
          value={kpis.total}
          icon={Package}
          isLoading={isLoading}
        />
        <KPICard
          title="Draft"
          value={kpis.draft}
          icon={FileText}
          variant="warning"
          isLoading={isLoading}
        />
        <KPICard
          title="Active"
          value={kpis.active}
          icon={Truck}
          variant="default"
          isLoading={isLoading}
        />
        <KPICard
          title="Completed"
          value={kpis.completed}
          icon={CheckCircle2}
          variant="success"
          isLoading={isLoading}
        />
      </div>

      {/* Saved Views + Status Filter Tabs */}
      <div className="space-y-3">
        {/* Saved views tabs */}
        <Tabs
          value={activeViewId ?? "custom"}
          onValueChange={(v) => {
            if (v === "custom") {
              setActiveViewId(null);
            } else {
              handleViewSelect(v);
            }
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <TabsList className="bg-muted/50">
              {savedViews.map((view) => (
                <TabsTrigger
                  key={view.id}
                  value={view.id}
                  className="text-xs gap-1.5"
                >
                  {view.name}
                </TabsTrigger>
              ))}
              <TabsTrigger value="custom" className="text-xs">
                Custom
              </TabsTrigger>
            </TabsList>
          </div>
        </Tabs>

        {/* Status filter pills */}
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "all", label: "All", count: orders?.length || 0 },
            { key: "Draft", label: "Draft", count: statusCounts.Draft || 0 },
            {
              key: "To Deliver and Bill",
              label: "To Deliver & Bill",
              count: statusCounts["To Deliver and Bill"] || 0,
            },
            {
              key: "To Deliver",
              label: "To Deliver",
              count: statusCounts["To Deliver"] || 0,
            },
            {
              key: "To Bill",
              label: "To Bill",
              count: statusCounts["To Bill"] || 0,
            },
            {
              key: "Completed",
              label: "Completed",
              count: statusCounts.Completed || 0,
            },
          ].map((status) => (
            <Button
              key={status.key}
              variant={statusFilter === status.key ? "default" : "outline"}
              size="sm"
              className={cn(
                "rounded-full gap-2 transition-all",
                statusFilter === status.key
                  ? "shadow-lg shadow-primary/20"
                  : "hover:bg-secondary/80"
              )}
              onClick={() => {
                setStatusFilter(status.key);
                setActiveViewId(null);
                setPage(1);
              }}
            >
              {status.label}
              <Badge
                variant="secondary"
                className={cn(
                  "h-5 min-w-[20px] px-1.5 text-[10px] font-bold",
                  statusFilter === status.key
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-secondary"
                )}
              >
                {status.count}
              </Badge>
            </Button>
          ))}
        </div>
      </div>

      {/* Content: Table or Cards */}
      {viewMode === "table" ? (
        <EnhancedDataTable
          columns={SO_TABLE_COLUMNS}
          data={(orders ?? []) as SalesOrder[]}
          isLoading={isLoading}
          total={orders?.length ?? 0}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          onSearch={(v) => {
            setSearch(v);
            setPage(1);
          }}
          searchValue={search}
          onSort={handleSort}
          filters={activeFilters}
          onFilterRemove={(id) => {
            if (id === "status") {
              setStatusFilter("all");
              setActiveViewId(null);
              setPage(1);
            }
          }}
          onExport={handleExport}
          onRowClick={(row) =>
            router.push(
              `/sales/sales-order/${encodeURIComponent((row as SalesOrder).name)}`
            )
          }
          getRowKey={(row) => (row as SalesOrder).name}
        />
      ) : (
        <>
          {!orders || orders.length === 0 ? (
            <EmptyState
              title="No sales orders found"
              description="Create your first sales order to start tracking fulfillment"
              action={
                <Button
                  onClick={() => router.push("/sales/sales-order/new")}
                  className="rounded-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Sales Order
                </Button>
              }
            />
          ) : orders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">No sales orders match this filter</p>
              <p className="text-sm mt-1">Try selecting a different status</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {orders.map((order, index) => (
                <SalesOrderCard
                  key={order.name}
                  order={order}
                  index={index}
                  onView={() =>
                    router.push(
                      `/sales/sales-order/${encodeURIComponent(order.name)}`
                    )
                  }
                  onEdit={() =>
                    router.push(
                      `/sales/sales-order/${encodeURIComponent(order.name)}/edit`
                    )
                  }
                  onDelete={() => setDeleteTarget(order)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Sales Order"
        description={`Are you sure you want to delete sales order "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
