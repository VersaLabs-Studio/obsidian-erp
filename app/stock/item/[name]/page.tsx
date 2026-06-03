// app/stock/item/[name]/page.tsx
// Obsidian ERP v4.0 - Item Detail Page (Schema-Driven Architecture)

"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Edit2,
  Trash2,
  Printer,
  Clock,
  Package,
  MoreVertical,
  Activity,
  Layers,
  Download,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

// v3.0: Import from generated types
import { Item } from "@/types/doctype-types";

// v3.0: Use generic hooks
import { useFrappeDoc, useFrappeDelete } from "@/hooks/generic";

// v3.0: Use smart components
import { PageHeader } from "@/components/smart/page-header";
import {
  StatusBadge,
  LoadingState,
  ConfirmDialog,
  PrintLabelDialog,
} from "@/components/smart";

// Existing UI components
import { InfoCard, DataPoint, StatCard } from "@/components/ui/info-card";
import { useExport } from "@/hooks/useExport";
import { cn } from "@/lib/utils";

// ============================================================================
// Loading Skeleton
// ============================================================================

function LoadingSkeleton() {
  return (
    <div className="max-w-6xl mx-auto p-4 space-y-8 animate-pulse">
      <div className="h-20 bg-muted/60 rounded-3xl" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 h-96 bg-muted/50 rounded-[2rem]" />
        <div className="h-64 bg-muted/40 rounded-[2rem]" />
      </div>
    </div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function ItemDetailPage() {
  const router = useRouter();
  const params = useParams<{ name: string }>();
  const itemName = decodeURIComponent(params.name);

  // v3.0: Dialog states
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);

  // v3.0: Use generic useFrappeDoc hook with generated Item type
  const { data: item, isLoading } = useFrappeDoc<Item>("Item", itemName);

  // v3.0: Use generic delete mutation
  const deleteMutation = useFrappeDelete("Item", {
    successMessage: "Item deleted successfully",
    onSuccess: () => {
      router.push("/stock/item");
    },
  });

  const { exportData, isExporting } = useExport();

  // Handle export
  const handleExport = async (format: "csv" | "pdf") => {
    if (!item) return;
    const exportItem = {
      item_code: item.item_code,
      item_name: item.item_name || "",
      item_group: item.item_group,
      stock_uom: item.stock_uom,
      brand: item.brand || "",
      description: item.description || "",
      status: item.disabled ? "Inactive" : "Active",
      created: item.creation
        ? new Date(item.creation).toLocaleDateString()
        : "",
    };
    await exportData(
      [exportItem],
      `item-${item.item_code}`,
      `Item: ${item.item_name}`,
      format,
      {
        item_code: "Item Code",
        item_name: "Item Name",
        item_group: "Group",
        stock_uom: "UOM",
        brand: "Brand",
        description: "Description",
        status: "Status",
        created: "Created",
      }
    );
  };

  // v3.0: Handle delete with dialog
  const handleDeleteConfirm = async () => {
    try {
      await deleteMutation.mutateAsync(item?.name || itemName);
    } catch (error) {
      console.error("Failed to delete item:", error);
    }
  };

  if (isLoading || !item) {
    return <LoadingSkeleton />;
  }

  // Safe access to item_name with fallback
  const displayName = item.item_name || item.item_code;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* v3.0: Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Item"
        description={`Are you sure you want to delete "${displayName}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        loading={deleteMutation.isPending}
      />

      {/* v3.0: Print Label Dialog */}
      <PrintLabelDialog
        open={showPrintDialog}
        onOpenChange={setShowPrintDialog}
        data={{
          code: item.item_code,
          name: displayName,
          price: item.standard_rate,
          currency: "ETB",
          additionalInfo: item.item_group,
        }}
      />

      {/* v3.0: Use refactored PageHeader from smart components */}
      <PageHeader
        backUrl="/stock/item"
        label="Item Details"
        title={displayName}
        status={{
          label: item.disabled ? "Inactive" : "Active",
          variant: item.disabled ? "destructive" : "success",
        }}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-secondary"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="rounded-2xl border-none shadow-xl bg-popover/90 backdrop-blur-xl p-2 w-48"
          >
            <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground">
              Actions
            </DropdownMenuLabel>
            <DropdownMenuItem
              className="rounded-xl"
              onClick={() =>
                router.push(`/stock/item/${encodeURIComponent(item.name)}/edit`)
              }
            >
              <Edit2 className="mr-2 h-4 w-4" /> Edit Item
            </DropdownMenuItem>
            {/* v3.0: Print Label now works */}
            <DropdownMenuItem
              className="rounded-xl"
              onClick={() => setShowPrintDialog(true)}
            >
              <Printer className="mr-2 h-4 w-4" /> Print Label
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border/50" />
            <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground">
              Export
            </DropdownMenuLabel>
            <DropdownMenuItem
              className="rounded-xl"
              onClick={() => handleExport("csv")}
              disabled={isExporting}
            >
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </DropdownMenuItem>
            <DropdownMenuItem
              className="rounded-xl"
              onClick={() => handleExport("pdf")}
              disabled={isExporting}
            >
              <Download className="mr-2 h-4 w-4" /> Export PDF
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border/50" />
            {/* v3.0: Delete now uses dialog */}
            <DropdownMenuItem
              className="rounded-xl text-destructive focus:bg-destructive/10"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </PageHeader>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Center Panel */}
        <div className="lg:col-span-8 space-y-8">
          <InfoCard
            title={
              <>
                <Package className="h-4 w-4" /> Core Data
              </>
            }
            delay={100}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-12">
              <DataPoint label="Item Name" value={displayName} />
              <DataPoint label="Item Code" value={item.item_code} mono />
              <DataPoint label="Group" value={item.item_group} />
              <DataPoint label="Brand" value={item.brand} />
              <div className="sm:col-span-2">
                <DataPoint
                  label="Description"
                  value={
                    item.description || (
                      <span className="text-muted-foreground italic">
                        No description provided.
                      </span>
                    )
                  }
                />
              </div>
            </div>
          </InfoCard>

          <InfoCard
            title={
              <>
                <Layers className="h-4 w-4" /> Inventory Configuration
              </>
            }
            delay={200}
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                label="Default UOM"
                value={item.stock_uom}
                valueClassName="text-primary"
              />
              <StatCard
                label="Stock Item"
                value={item.is_stock_item ? "Yes" : "No"}
                valueClassName={cn(
                  "font-bold",
                  item.is_stock_item
                    ? "text-emerald-600"
                    : "text-muted-foreground"
                )}
              />
              <StatCard
                label="Fixed Asset"
                value={item.is_fixed_asset ? "Yes" : "No"}
                valueClassName={cn(
                  "font-bold",
                  item.is_fixed_asset
                    ? "text-emerald-600"
                    : "text-muted-foreground"
                )}
              />
            </div>
          </InfoCard>
        </div>

        {/* Sidebar Panel */}
        <div className="lg:col-span-4 space-y-8">
          <InfoCard
            title={
              <>
                <Activity className="h-4 w-4" /> Stock Status
              </>
            }
            delay={300}
            variant="gradient"
            gradientFrom="from-indigo-50/50"
            gradientTo="to-purple-50/50"
          >
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Valuation Rate</span>
                <span className="font-mono text-lg font-bold">
                  {item.valuation_rate?.toFixed(2) || "0.00"}
                </span>
              </div>
              <div className="h-[1px] bg-border/50" />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Standard Rate</span>
                <span className="font-mono text-lg font-bold text-primary">
                  {item.standard_rate?.toFixed(2) || "0.00"}
                </span>
              </div>
            </div>
          </InfoCard>

          <InfoCard
            title={
              <>
                <Clock className="h-4 w-4" /> System Info
              </>
            }
            delay={400}
            variant="transparent"
          >
            <div className="space-y-4 text-sm text-muted-foreground/80">
              <div className="flex justify-between">
                <span>Created</span>
                <span className="font-mono">
                  {item.creation
                    ? new Date(item.creation).toLocaleDateString()
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Last Modified</span>
                <span className="font-mono">
                  {item.modified
                    ? new Date(item.modified).toLocaleDateString()
                    : "—"}
                </span>
              </div>
              {item.owner && (
                <div className="flex justify-between">
                  <span>Created By</span>
                  <span className="font-mono truncate max-w-[120px]">
                    {item.owner}
                  </span>
                </div>
              )}
            </div>
          </InfoCard>
        </div>
      </div>
    </div>
  );
}
