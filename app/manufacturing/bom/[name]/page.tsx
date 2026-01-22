// @ts-nocheck
"use client";

import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Pencil,
  Trash2,
  Layers as BOMIcon,
  Package,
  Cog,
  DollarSign,
  CheckCircle2,
  Star,
  Copy,
  Play,
  FileText,
  Clock,
} from "lucide-react";
import {
  useFrappeDoc,
  useFrappeDelete,
  useFrappeUpdate,
} from "@/hooks/generic";
import {
  PageHeader,
  LoadingState,
  EmptyState,
  ConfirmDialog,
} from "@/components/smart";
import { InfoCard, DataPoint } from "@/components/ui/info-card";
import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import type { Bom } from "@/types/doctype-types";
import { cn } from "@/lib/utils";

export default function BOMDetailPage() {
  const { name } = useParams();
  const router = useRouter();
  const bomName = decodeURIComponent(name as string);
  const [showDelete, setShowDelete] = useState(false);

  const {
    data: bom,
    isLoading,
    refetch,
    error,
  } = useFrappeDoc<Bom>("BOM", bomName);

  const deleteMutation = useFrappeDelete("BOM", {
    onSuccess: () => {
      toast.success("BOM deleted successfully");
      router.push("/manufacturing/bom");
    },
    onError: (err) =>
      toast.error("Failed to delete BOM", { description: err.message }),
  });

  const submitMutation = useFrappeUpdate("BOM", {
    onSuccess: () => {
      toast.success("BOM submitted successfully");
      refetch();
    },
    onError: (err) =>
      toast.error("Failed to submit BOM", { description: err.message }),
  });

  if (isLoading) return <LoadingState type="detail" />;
  if (error || !bom)
    return (
      <EmptyState
        icon={BOMIcon}
        title="BOM not found"
        description="The requested BOM could not be loaded."
      />
    );

  const isSubmitted = bom.docstatus === 1;
  const isDefault = bom.is_default === 1;
  const isActive = bom.is_active === 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title={bom.item_name || bom.item}
        subtitle={bom.name}
        backHref="/manufacturing/bom"
        icon={<BOMIcon className="h-5 w-5 text-primary" />}
        actions={
          <div className="flex gap-2">
            {!isSubmitted && (
              <>
                <Button
                  variant="outline"
                  onClick={() =>
                    router.push(
                      `/manufacturing/bom/${encodeURIComponent(bomName)}/edit`,
                    )
                  }
                  className="rounded-full h-9"
                >
                  <Pencil className="h-4 w-4 mr-2" /> Edit
                </Button>
                <Button
                  onClick={() =>
                    submitMutation.mutate({
                      name: bomName,
                      data: { docstatus: 1 },
                    })
                  }
                  className="rounded-full h-9 shadow-lg shadow-primary/10"
                  disabled={submitMutation.isPending}
                >
                  {submitMutation.isPending ? (
                    <Clock className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Submit
                </Button>
              </>
            )}
            <Button
              variant="outline"
              onClick={() =>
                router.push(
                  `/manufacturing/bom/new?copy=${encodeURIComponent(bomName)}`,
                )
              }
              className="rounded-full h-9"
            >
              <Copy className="h-4 w-4 mr-2" /> Duplicate
            </Button>
            {isSubmitted && (
              <Button
                onClick={() =>
                  router.push(
                    `/manufacturing/work-order/new?bom=${encodeURIComponent(bomName)}`,
                  )
                }
                className="rounded-full h-9 shadow-lg shadow-primary/10"
              >
                <Play className="h-4 w-4 mr-2" /> Create Work Order
              </Button>
            )}
            {!isSubmitted && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDelete(true)}
                className="rounded-full h-9 w-9 text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        }
      />

      {/* Status Badges */}
      <div className="flex gap-2 flex-wrap animate-in fade-in slide-in-from-left-4 duration-500">
        <Badge
          className={cn(
            "px-3 py-1 rounded-full border-none",
            isSubmitted
              ? "bg-emerald-500/10 text-emerald-600"
              : "bg-amber-500/10 text-amber-600",
          )}
        >
          <div
            className={cn(
              "h-1.5 w-1.5 rounded-full mr-2",
              isSubmitted ? "bg-emerald-500" : "bg-amber-500",
            )}
          />
          {isSubmitted ? "Submitted" : "Draft"}
        </Badge>
        {isDefault && (
          <Badge className="bg-blue-500/10 text-blue-600 px-3 py-1 rounded-full border-none">
            <Star className="h-3.5 w-3.5 mr-1.5 fill-blue-600" /> Default
          </Badge>
        )}
        {isActive ? (
          <Badge className="bg-indigo-500/10 text-indigo-600 px-3 py-1 rounded-full border-none">
            Active
          </Badge>
        ) : (
          <Badge variant="outline" className="px-3 py-1 rounded-full">
            Inactive
          </Badge>
        )}
        {bom.with_operations === 1 && (
          <Badge className="bg-violet-500/10 text-violet-600 px-3 py-1 rounded-full border-none">
            <Cog className="h-3.5 w-3.5 mr-1.5" /> With Operations
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Product Info */}
          <InfoCard
            title="Product Information"
            icon={<Package className="h-5 w-5" />}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <DataPoint
                label="Item"
                value={bom.item}
                link={`/stock/item/${encodeURIComponent(bom.item)}`}
              />
              <DataPoint label="Item Name" value={bom.item_name || "—"} />
              <DataPoint
                label="Batch Quantity"
                value={`${bom.quantity} ${bom.uom || "Nos"}`}
              />
              <DataPoint label="Company" value={bom.company} />
            </div>
          </InfoCard>

          {/* Materials Table */}
          <InfoCard
            title={`Raw Materials (${bom.items?.length || 0})`}
            icon={<Package className="h-5 w-5 text-emerald-500" />}
          >
            {bom.items?.length > 0 ? (
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-muted-foreground">
                      <th className="text-left py-3 px-2 font-medium">Item</th>
                      <th className="text-right py-3 px-2 font-medium">
                        Quantity
                      </th>
                      <th className="text-right py-3 px-2 font-medium">Rate</th>
                      <th className="text-right py-3 px-2 font-medium">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {bom.items.map((item: any, idx: number) => (
                      <tr
                        key={idx}
                        className="border-b border-border/20 hover:bg-muted/30 transition-colors group"
                      >
                        <td className="py-4 px-2">
                          <Link
                            href={`/stock/item/${encodeURIComponent(item.item_code)}`}
                            className="text-primary font-medium hover:underline flex items-center gap-2"
                          >
                            {item.item_name || item.item_code}
                          </Link>
                          <span className="text-[10px] text-muted-foreground block mt-0.5">
                            {item.item_code}
                          </span>
                        </td>
                        <td className="text-right py-4 px-2 font-medium">
                          {item.qty} {item.uom || "Nos"}
                        </td>
                        <td className="text-right py-4 px-2 text-muted-foreground">
                          {bom.currency}{" "}
                          {item.rate?.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="text-right py-4 px-2 font-bold text-foreground">
                          {bom.currency}{" "}
                          {item.amount?.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-10 opacity-40">
                <Package className="h-10 w-10 mx-auto mb-2" />
                <p>No materials defined for this BOM</p>
              </div>
            )}
          </InfoCard>
          {/* Operations Table */}
          {bom.with_operations === 1 && (
            <InfoCard
              title={`Operations (${bom.operations?.length || 0})`}
              icon={<Cog className="h-5 w-5 text-blue-500" />}
            >
              {bom.operations?.length > 0 ? (
                <div className="overflow-x-auto -mx-2">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50 text-muted-foreground">
                        <th className="text-left py-3 px-2 font-medium">
                          Operation
                        </th>
                        <th className="text-left py-3 px-2 font-medium">
                          Workstation
                        </th>
                        <th className="text-right py-3 px-2 font-medium">
                          Time
                        </th>
                        <th className="text-right py-3 px-2 font-medium">
                          Cost
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {bom.operations.map((op: any, idx: number) => (
                        <tr
                          key={idx}
                          className="border-b border-border/20 hover:bg-muted/30 transition-colors"
                        >
                          <td className="py-4 px-2 font-medium">
                            {op.operation}
                          </td>
                          <td className="py-4 px-2">
                            <Link
                              href={`/manufacturing/workstation/${encodeURIComponent(op.workstation)}`}
                              className="text-muted-foreground hover:text-primary transition-colors"
                            >
                              {op.workstation}
                            </Link>
                          </td>
                          <td className="text-right py-4 px-2 font-medium">
                            {op.time_in_mins} min
                          </td>
                          <td className="text-right py-4 px-2 font-bold text-foreground">
                            {bom.currency}{" "}
                            {op.operating_cost?.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-10 opacity-40">
                  <Cog className="h-10 w-10 mx-auto mb-2" />
                  <p>No operations defined for this BOM</p>
                </div>
              )}
            </InfoCard>
          )}

          {/* Scrap Table */}
          <InfoCard
            title={`Scrap & Waste (${bom.scrap_items?.length || 0})`}
            icon={<Trash2 className="h-5 w-5 text-amber-500" />}
          >
            {bom.scrap_items?.length > 0 ? (
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-muted-foreground">
                      <th className="text-left py-3 px-2 font-medium">Item</th>
                      <th className="text-right py-3 px-2 font-medium">
                        Quantity
                      </th>
                      <th className="text-right py-3 px-2 font-medium">Rate</th>
                      <th className="text-right py-3 px-2 font-medium">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {bom.scrap_items.map((item: any, idx: number) => (
                      <tr
                        key={idx}
                        className="border-b border-border/20 hover:bg-muted/30 transition-colors"
                      >
                        <td className="py-4 px-2 font-medium">
                          {item.item_name || item.item_code}
                          <span className="text-[10px] text-muted-foreground block mt-0.5">
                            {item.item_code}
                          </span>
                        </td>
                        <td className="text-right py-4 px-2 font-medium">
                          {item.qty} {item.uom || "Nos"}
                        </td>
                        <td className="text-right py-4 px-2 text-muted-foreground">
                          {bom.currency}{" "}
                          {item.rate?.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="text-right py-4 px-2 font-bold text-foreground">
                          {bom.currency}{" "}
                          {item.amount?.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-10 opacity-40">
                <Trash2 className="h-10 w-10 mx-auto mb-2" />
                <p>No scrap or waste items defined</p>
              </div>
            )}
          </InfoCard>
        </div>

        {/* Right Column - Cost Summary / Sticky Sidebar */}
        <div className="space-y-6 sticky top-24 self-start">
          <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-lg shadow-primary/5">
            <div className="flex items-center gap-2 font-semibold text-lg mb-6">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              Cost Breakdown
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-border/30">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Raw Materials</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Direct Cost
                  </span>
                </div>
                <span className="font-semibold text-sm">
                  {bom.currency}{" "}
                  {bom.raw_material_cost?.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>

              {bom.with_operations === 1 && (
                <div className="flex justify-between items-center py-2 border-b border-border/30">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">Operations</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      Processing Cost
                    </span>
                  </div>
                  <span className="font-semibold text-sm">
                    {bom.currency}{" "}
                    {bom.operating_cost?.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              )}

              <div className="pt-4 space-y-4">
                <div className="flex justify-between items-end">
                  <span className="font-bold text-foreground">Total Cost</span>
                  <div className="text-right">
                    <span className="text-2xl font-bold font-mono text-primary">
                      {bom.currency}{" "}
                      {bom.total_cost?.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20 space-y-1">
                  <span className="text-[10px] text-primary/60 uppercase font-bold tracking-widest">
                    Calculated Cost Per Unit
                  </span>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xl font-bold text-primary">
                      {bom.currency}{" "}
                      {(
                        (bom.total_cost || 0) / (bom.quantity || 1)
                      ).toLocaleString(undefined, { minimumFractionDigits: 4 })}
                    </span>
                  </div>
                </div>
              </div>

              {!isSubmitted && (isActive || isDefault) && (
                <div className="mt-6 flex items-start gap-2 p-3 bg-amber-500/5 rounded-xl border border-amber-500/10 text-[11px] text-amber-700">
                  <Clock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <p>
                    Changes to material rates or operations won't update until
                    you re-save or submit the document.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Metadata */}
          <InfoCard
            title="Recipe Insights"
            icon={<FileText className="h-5 w-5" />}
          >
            <div className="space-y-4">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
                  Source Information
                </p>
                <div className="space-y-3">
                  <DataPoint label="Created by" value={bom.owner} />
                  <DataPoint
                    label="Last Modified"
                    value={
                      bom.modified
                        ? new Date(bom.modified).toLocaleString()
                        : "—"
                    }
                  />
                  <DataPoint
                    label="Doc Status"
                    value={
                      isSubmitted ? "Locked (Submitted)" : "Draft (Editable)"
                    }
                  />
                </div>
              </div>

              {bom.rm_cost_as_per && (
                <div className="pt-4 border-t border-border/50">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
                    Costing Logic
                  </p>
                  <p className="text-xs font-medium bg-secondary/50 p-2 rounded-lg">
                    Rates based on:{" "}
                    <span className="text-primary">{bom.rm_cost_as_per}</span>
                  </p>
                </div>
              )}
            </div>
          </InfoCard>
        </div>
      </div>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete Bill of Materials?"
        description={`Are you sure you want to delete "${bom.name}"? This action cannot be undone and may affect pending Work Orders.`}
        onConfirm={() => deleteMutation.mutateAsync(bomName)}
        isLoading={deleteMutation.isPending}
        variant="destructive"
      />
    </div>
  );
}
