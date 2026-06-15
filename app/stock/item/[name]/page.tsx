// app/stock/item/[name]/page.tsx
// Obsidian ERP v4.0 - Item Master Hub (Item-360)
// 2M Part 7A: Brought the Item detail page to the Customer-360 standard.
// Tabs: Overview / Prices / Stock Levels / BOMs / Transactions / Activity.
// Reads via useFrappeList (read-only). Standalone — no FlowRail, no auto-fill.

"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SkeletonDetail, SkeletonLine } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Edit,
  Trash2,
  MoreVertical,
  Plus,
  Package,
  Boxes,
  Layers,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Factory,
  Truck,
  ShoppingCart,
  Receipt,
  ArrowUpRight,
  ChevronRight,
  History,
  ExternalLink,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useFrappeDoc, useFrappeList, useFrappeDelete } from "@/hooks/generic";
import {
  PageHeader,
  LoadingState,
  ConfirmDialog,
  EmptyState,
} from "@/components/smart";
import { InfoCard, DataPoint, StatCard } from "@/components/ui/info-card";
import { ActivityTimeline } from "@/components/smart/ActivityTimeline";
import { getApiPath } from "@/lib/doctype-config";
import { cn } from "@/lib/utils";
import type {
  Item,
  ItemPrice,
  Bom,
} from "@/types/doctype-types";

// 2M Part 7A: child-table row shape for the Transactions tab. The child
// doctype (Sales Order Item, Purchase Order Item, Delivery Note Item)
// has its own shape (qty, rate, amount, docstatus) and a `parent`
// pointer to the parent doc. The customer-360's TransactionRow
// pattern is reused.
interface ItemRowRef {
  name: string;
  parent: string;
  qty: number;
  rate: number;
  amount: number;
  docstatus?: 0 | 1 | 2;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const ETB = new Intl.NumberFormat("en-ET", {
  style: "currency",
  currency: "ETB",
  minimumFractionDigits: 2,
});

function formatCurrency(amount: number | undefined | null, currency = "ETB") {
  if (amount === undefined || amount === null) return "—";
  return ETB.format(amount);
}

function formatDate(date: string | undefined | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status?: string }) {
  if (!status) return null;
  const v = status.toLowerCase();
  let variant: "default" | "secondary" | "destructive" | "outline" = "outline";
  if (["paid", "completed", "delivered", "accepted", "closed"].includes(v)) variant = "default";
  else if (["draft", "open", "pending", "to deliver", "to bill", "unpaid"].includes(v))
    variant = "secondary";
  else if (["overdue", "cancelled", "lost", "expired", "rejected"].includes(v))
    variant = "destructive";
  return <Badge variant={variant} className="text-xs whitespace-nowrap">{status}</Badge>;
}

// Per Frappe's Bin: item_code + warehouse + actual_qty + valuation_rate.
interface BinRow {
  name: string;
  item_code: string;
  warehouse: string;
  actual_qty: number;
  reserved_qty?: number;
  ordered_qty?: number;
  projected_qty?: number;
  valuation_rate?: number;
}

function QuickAction({
  icon: Icon,
  label,
  href,
  variant = "outline",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  variant?: "default" | "outline" | "secondary";
}) {
  return (
    <Button
      variant={variant}
      className="rounded-full gap-2 justify-start"
      asChild
    >
      <Link href={href}>
        <Icon className="h-4 w-4" />
        {label}
      </Link>
    </Button>
  );
}

function SectionHeader({
  title,
  count,
  viewAllHref,
  icon: Icon,
}: {
  title: string;
  count?: number;
  viewAllHref?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-5 w-5 text-primary" />}
        <h3 className="font-semibold text-base">
          {title}
          {count !== undefined && (
            <span className="text-muted-foreground ml-2 font-normal">({count})</span>
          )}
        </h3>
      </div>
      {viewAllHref && (
        <Button variant="ghost" size="sm" className="rounded-full gap-1" asChild>
          <Link href={viewAllHref}>
            View All <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function ItemMasterHub() {
  const router = useRouter();
  const params = useParams<{ name: string }>();
  const itemName = decodeURIComponent(params.name);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // -- Data fetching --------------------------------------------------------
  const { data: item, isLoading, error } = useFrappeDoc<Item>("Item", itemName);

  // Item Prices for this item (read-only).
  const { data: itemPrices = [], isLoading: isLoadingPrices } = useFrappeList<ItemPrice>(
    "Item Price",
    {
      filters: [["item_code", "=", itemName]],
      fields: [
        "name",
        "price_list",
        "price_list_rate",
        "currency",
        "selling",
        "buying",
        "uom",
        "modified",
      ],
      orderBy: { field: "modified", order: "desc" },
      limit: 25,
    },
  );

  // Bin (Stock Levels) per warehouse.
  const { data: bins = [], isLoading: isLoadingBins } = useFrappeList<BinRow>(
    "Bin",
    {
      filters: [["item_code", "=", itemName]],
      fields: [
        "name",
        "warehouse",
        "actual_qty",
        "reserved_qty",
        "ordered_qty",
        "projected_qty",
        "valuation_rate",
      ],
      limit: 50,
    },
  );

  // BOMs where item is the production item.
  const { data: boms = [], isLoading: isLoadingBoms } = useFrappeList<Bom>(
    "BOM",
    {
      filters: [["item", "=", itemName]],
      fields: ["name", "item", "item_name", "is_active", "is_default", "modified"],
      orderBy: { field: "modified", order: "desc" },
      limit: 10,
    },
  );

  // Sales Order Item rows for this item.
  const { data: soRows = [], isLoading: isLoadingSORows } = useFrappeList<ItemRowRef>(
    "Sales Order Item",
    {
      filters: [["item_code", "=", itemName]],
      fields: ["name", "parent", "qty", "rate", "amount", "docstatus"],
      orderBy: { field: "modified", order: "desc" },
      limit: 25,
    },
  );

  // Purchase Order Item rows for this item.
  const { data: poRows = [], isLoading: isLoadingPORows } = useFrappeList<ItemRowRef>(
    "Purchase Order Item",
    {
      filters: [["item_code", "=", itemName]],
      fields: ["name", "parent", "qty", "rate", "amount", "docstatus"],
      orderBy: { field: "modified", order: "desc" },
      limit: 25,
    },
  );

  // Delivery Note Item rows for this item.
  const { data: dnRows = [], isLoading: isLoadingDNRows } = useFrappeList<ItemRowRef>(
    "Delivery Note Item",
    {
      filters: [["item_code", "=", itemName]],
      fields: ["name", "parent", "qty", "rate", "amount", "docstatus"],
      orderBy: { field: "modified", order: "desc" },
      limit: 25,
    },
  );

  // -- Computed KPIs --------------------------------------------------------
  const stockKpis = useMemo(() => {
    const onHand = bins.reduce((sum, b) => sum + (Number(b.actual_qty) || 0), 0);
    const projected = bins.reduce((sum, b) => sum + (Number(b.projected_qty) || 0), 0);
    const valuationValue = bins.reduce(
      (sum, b) => sum + (Number(b.actual_qty) || 0) * (Number(b.valuation_rate) || 0),
      0,
    );
    const warehouses = new Set(bins.map((b) => b.warehouse)).size;
    const lowStock = bins.some((b) => (Number(b.projected_qty) ?? 0) < 0);
    return { onHand, projected, valuationValue, warehouses, lowStock };
  }, [bins]);

  // 2N Part 1.0: deleteMutation moved UP — Rules-of-Hooks. Hooks must run
  // unconditionally on every render, before any branch that can `return`.
  // Previously the hook sat below the isLoading / error early returns, so
  // the first render returned before calling it and the next render called
  // it — React threw "change in the order of Hooks called by ItemMasterHub".
  const deleteMutation = useFrappeDelete("Item", {
    onSuccess: () => router.push("/stock/item"),
  });

  // -- Loading / error states ----------------------------------------------
  if (isLoading) return <SkeletonDetail />;
  if (error || !item) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Item not found</p>
      </div>
    );
  }

  const displayName = item.item_name || item.item_code;
  const isStock = item.is_stock_item === 1;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={displayName}
        subtitle={
          <div className="flex items-center gap-3 flex-wrap">
            <span>{item.item_group}</span>
            <span className="text-muted-foreground">•</span>
            <span className="font-mono text-xs">{item.item_code}</span>
            {item.brand && (
              <>
                <span className="text-muted-foreground">•</span>
                <Badge variant="outline">{item.brand}</Badge>
              </>
            )}
            <Badge variant={item.disabled ? "destructive" : "default"}>
              {item.disabled ? "Disabled" : "Active"}
            </Badge>
            {isStock ? (
              <Badge variant="secondary">Stock Item</Badge>
            ) : (
              <Badge variant="outline">Service Item</Badge>
            )}
          </div>
        }
        backHref="/stock/item"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => router.push(`/stock/item/${encodeURIComponent(itemName)}/edit`)}
            >
              <Edit className="h-4 w-4 mr-2" /> Edit
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="rounded-2xl border-none shadow-xl bg-popover/90 backdrop-blur-xl p-2"
              >
                <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                  Quick actions
                </DropdownMenuLabel>
                <DropdownMenuItem
                  className="rounded-xl"
                  onClick={() =>
                    router.push(
                      `/stock/settings/item-price/new?item_code=${encodeURIComponent(itemName)}`,
                    )
                  }
                >
                  <DollarSign className="h-4 w-4 mr-2" /> Create Item Price
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="rounded-xl"
                  onClick={() =>
                    router.push(`/manufacturing/bom/new?item=${encodeURIComponent(itemName)}`)
                  }
                >
                  <Layers className="h-4 w-4 mr-2" /> Create BOM
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="rounded-xl"
                  onClick={() =>
                    router.push(
                      `/stock/stock-reconciliation/new?item_code=${encodeURIComponent(itemName)}`,
                    )
                  }
                >
                  <Boxes className="h-4 w-4 mr-2" /> Adjust Stock
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="rounded-xl text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete Item
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      {/* Hero Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Boxes className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-medium text-muted-foreground">On-Hand Qty</span>
          </div>
          <p className="text-2xl font-bold tabular-nums">{stockKpis.onHand.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">
            across {stockKpis.warehouses} warehouse{stockKpis.warehouses === 1 ? "" : "s"}
          </p>
        </div>

        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-medium text-muted-foreground">Valuation</span>
          </div>
          <p className="text-2xl font-bold tabular-nums">
            {formatCurrency(stockKpis.valuationValue)}
          </p>
          <p className="text-xs text-muted-foreground">on-hand @ valuation rate</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-purple-500" />
            <span className="text-xs font-medium text-muted-foreground">Price Lists</span>
          </div>
          <p className="text-2xl font-bold">{itemPrices.length}</p>
          <p className="text-xs text-muted-foreground">across selling / buying lists</p>
        </div>

        <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Receipt className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-medium text-muted-foreground">Open Txns</span>
          </div>
          <p className="text-2xl font-bold">
            {soRows.length + poRows.length + dnRows.length}
          </p>
          <p className="text-xs text-muted-foreground">recent SO + PO + DN</p>
        </div>
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-secondary/30 rounded-full p-1 flex-wrap h-auto">
          <TabsTrigger value="overview" className="rounded-full">Overview</TabsTrigger>
          <TabsTrigger value="prices" className="rounded-full">
            Prices ({itemPrices.length})
          </TabsTrigger>
          <TabsTrigger value="stock" className="rounded-full">
            Stock Levels ({bins.length})
          </TabsTrigger>
          <TabsTrigger value="boms" className="rounded-full">
            BOMs ({boms.length})
          </TabsTrigger>
          <TabsTrigger value="transactions" className="rounded-full">
            Transactions
          </TabsTrigger>
          <TabsTrigger value="activity" className="rounded-full">Activity</TabsTrigger>
        </TabsList>

        {/* ============================ OVERVIEW ============================ */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <InfoCard
                title={
                  <span className="flex items-center gap-2">
                    <Package className="h-4 w-4" /> Item Information
                  </span>
                }
              >
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <DataPoint label="Item Code" value={item.item_code} />
                  <DataPoint label="Item Name" value={displayName} />
                  <DataPoint label="Item Group" value={item.item_group} />
                  <DataPoint label="Stock UOM" value={item.stock_uom} />
                  <DataPoint label="Brand" value={item.brand ?? "—"} />
                  <DataPoint label="Valuation Method" value={item.valuation_method ?? "—"} />
                  <DataPoint
                    label="Default Warehouse"
                    value={
                      (item as Item & { default_warehouse?: string }).default_warehouse ?? "—"
                    }
                  />
                  <DataPoint
                    label="Default BOM"
                    value={item.default_bom ?? "—"}
                  />
                  <DataPoint
                    label="Maintain Stock"
                    value={isStock ? "Yes" : "No"}
                  />
                </div>
              </InfoCard>

              <InfoCard title="Description">
                {item.description ? (
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {item.description}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No description provided.</p>
                )}
              </InfoCard>
            </div>

            <div className="space-y-6">
              <InfoCard title="Quick Actions" variant="gradient">
                <div className="flex flex-col gap-2">
                  <QuickAction
                    icon={DollarSign}
                    label="Create Item Price"
                    href={`/stock/settings/item-price/new?item_code=${encodeURIComponent(itemName)}`}
                    variant="default"
                  />
                  <QuickAction
                    icon={Layers}
                    label="Create BOM"
                    href={`/manufacturing/bom/new?item=${encodeURIComponent(itemName)}`}
                  />
                  <QuickAction
                    icon={Boxes}
                    label="Adjust Stock"
                    href={`/stock/stock-reconciliation/new?item_code=${encodeURIComponent(itemName)}`}
                  />
                </div>
              </InfoCard>

              <InfoCard title="Stock Status">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">Valuation Rate</span>
                    <span className="font-mono font-bold">
                      {item.valuation_rate?.toFixed(2) ?? "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">Standard Rate</span>
                    <span className="font-mono font-bold text-primary">
                      {item.standard_rate?.toFixed(2) ?? "—"}
                    </span>
                  </div>
                  {stockKpis.lowStock && (
                    <div className="mt-2 flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/5 px-3 py-2">
                      <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                      <span className="text-xs text-warning font-medium">
                        Projected qty is negative in at least one warehouse
                      </span>
                    </div>
                  )}
                </div>
              </InfoCard>
            </div>
          </div>
        </TabsContent>

        {/* ============================ PRICES ============================ */}
        <TabsContent value="prices" className="space-y-6">
          <InfoCard title="Item Prices">
            {isLoadingPrices ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <SkeletonLine key={i} className="h-14 rounded-2xl" />
                ))}
              </div>
            ) : itemPrices.length === 0 ? (
              <EmptyState
                title="No prices set"
                description="Add prices for this item across your price lists."
                action={
                  <Button asChild className="rounded-full">
                    <Link
                      href={`/stock/settings/item-price/new?item_code=${encodeURIComponent(itemName)}`}
                    >
                      <Plus className="h-4 w-4 mr-2" /> Create Item Price
                    </Link>
                  </Button>
                }
              />
            ) : (
              <div className="overflow-hidden rounded-xl border border-border/60">
                <table className="w-full text-sm">
                  <thead className="border-b border-border/60 bg-secondary/20 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2.5 text-left font-semibold">Price List</th>
                      <th className="px-3 py-2.5 text-left font-semibold">Side</th>
                      <th className="px-3 py-2.5 text-left font-semibold">UOM</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Rate</th>
                      <th className="px-3 py-2.5 text-left font-semibold">Currency</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {itemPrices.map((p) => (
                      <tr key={p.name} className="hover:bg-secondary/20">
                        <td className="px-3 py-2.5 font-medium">{p.price_list}</td>
                        <td className="px-3 py-2.5">
                          {p.selling === 1 ? (
                            <Badge variant="secondary">Selling</Badge>
                          ) : p.buying === 1 ? (
                            <Badge variant="outline">Buying</Badge>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-3 py-2.5">{p.uom ?? "—"}</td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold tabular-nums">
                          {Number(p.price_list_rate ?? 0).toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5">{p.currency}</td>
                        <td className="px-2 py-2 text-center">
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <Link href={`/stock/settings/item-price/${encodeURIComponent(p.name)}`}>
                              <ArrowUpRight className="h-4 w-4" />
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </InfoCard>
        </TabsContent>

        {/* ============================ STOCK LEVELS ============================ */}
        <TabsContent value="stock" className="space-y-6">
          <InfoCard title="Stock Levels (per warehouse)">
            {isLoadingBins ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <SkeletonLine key={i} className="h-14 rounded-2xl" />
                ))}
              </div>
            ) : bins.length === 0 ? (
              <EmptyState
                title="No stock recorded"
                description="This item has no Bin entries yet. Adjust stock via Stock Reconciliation."
                action={
                  <Button asChild className="rounded-full">
                    <Link
                      href={`/stock/stock-reconciliation/new?item_code=${encodeURIComponent(itemName)}`}
                    >
                      <Plus className="h-4 w-4 mr-2" /> Adjust Stock
                    </Link>
                  </Button>
                }
              />
            ) : (
              <div className="overflow-hidden rounded-xl border border-border/60">
                <table className="w-full text-sm">
                  <thead className="border-b border-border/60 bg-secondary/20 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2.5 text-left font-semibold">Warehouse</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Actual</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Reserved</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Ordered</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Projected</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Valuation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {bins.map((b) => {
                      const projected = Number(b.projected_qty ?? 0);
                      return (
                        <tr key={b.name} className="hover:bg-secondary/20">
                          <td className="px-3 py-2.5 font-medium">{b.warehouse}</td>
                          <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                            {Number(b.actual_qty ?? 0).toLocaleString()}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono tabular-nums text-muted-foreground">
                            {Number(b.reserved_qty ?? 0).toLocaleString()}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono tabular-nums text-muted-foreground">
                            {Number(b.ordered_qty ?? 0).toLocaleString()}
                          </td>
                          <td
                            className={cn(
                              "px-3 py-2.5 text-right font-mono font-bold tabular-nums",
                              projected < 0 ? "text-destructive" : "text-foreground",
                            )}
                          >
                            {projected.toLocaleString()}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                            {formatCurrency(
                              (Number(b.actual_qty) || 0) * (Number(b.valuation_rate) || 0),
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </InfoCard>
        </TabsContent>

        {/* ============================ BOMs ============================ */}
        <TabsContent value="boms" className="space-y-6">
          <InfoCard title="Bill of Materials" icon={<Layers className="h-4 w-4" />}>
            {isLoadingBoms ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <SkeletonLine key={i} className="h-14 rounded-2xl" />
                ))}
              </div>
            ) : boms.length === 0 ? (
              <EmptyState
                title="No BOMs"
                description="Create a BOM if this item is manufactured."
                action={
                  <Button asChild className="rounded-full">
                    <Link href={`/manufacturing/bom/new?item=${encodeURIComponent(itemName)}`}>
                      <Plus className="h-4 w-4 mr-2" /> Create BOM
                    </Link>
                  </Button>
                }
              />
            ) : (
              <div className="space-y-3">
                {boms.map((b) => (
                  <Link
                    key={b.name}
                    href={`/manufacturing/bom/${encodeURIComponent(b.name)}`}
                    className="group flex items-center justify-between p-4 bg-secondary/20 rounded-2xl hover:bg-secondary/40 transition-all border border-transparent hover:border-primary/10"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2.5 bg-background rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                        <Layers className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{b.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          Modified {formatDate(b.modified)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {b.is_default === 1 && <Badge>Default</Badge>}
                      <Badge variant={b.is_active === 1 ? "secondary" : "outline"}>
                        {b.is_active === 1 ? "Active" : "Inactive"}
                      </Badge>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </InfoCard>
        </TabsContent>

        {/* ============================ TRANSACTIONS ============================ */}
        <TabsContent value="transactions" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <InfoCard title="Sales Orders" icon={<ShoppingCart className="h-4 w-4" />}>
              {isLoadingSORows ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <SkeletonLine key={i} className="h-12 rounded-2xl" />
                  ))}
                </div>
              ) : soRows.length === 0 ? (
                <EmptyState
                  title="No sales orders"
                  description="This item has not appeared in any sales orders yet."
                />
              ) : (
                <div className="space-y-2">
                  {soRows.slice(0, 8).map((row) => (
                    <Link
                      key={row.name}
                      href={`/sales/sales-order/${encodeURIComponent(row.parent)}`}
                      className="group flex items-center justify-between p-3 rounded-xl hover:bg-secondary/40 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium">{row.parent}</p>
                        <p className="text-[10px] text-muted-foreground">Sales Order</p>
                      </div>
                      <span className="text-sm font-mono tabular-nums">
                        {Number(row.qty ?? 0).toLocaleString()} × {formatCurrency(row.rate)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </InfoCard>

            <InfoCard title="Purchase Orders" icon={<Truck className="h-4 w-4" />}>
              {isLoadingPORows ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <SkeletonLine key={i} className="h-12 rounded-2xl" />
                  ))}
                </div>
              ) : poRows.length === 0 ? (
                <EmptyState
                  title="No purchase orders"
                  description="This item has not appeared in any purchase orders yet."
                />
              ) : (
                <div className="space-y-2">
                  {poRows.slice(0, 8).map((row) => (
                    <Link
                      key={row.name}
                      href={`/buying/purchase-order/${encodeURIComponent(row.parent)}`}
                      className="group flex items-center justify-between p-3 rounded-xl hover:bg-secondary/40 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium">{row.parent}</p>
                        <p className="text-[10px] text-muted-foreground">Purchase Order</p>
                      </div>
                      <span className="text-sm font-mono tabular-nums">
                        {Number(row.qty ?? 0).toLocaleString()} × {formatCurrency(row.rate)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </InfoCard>

            <InfoCard title="Delivery Notes" icon={<Receipt className="h-4 w-4" />}>
              {isLoadingDNRows ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <SkeletonLine key={i} className="h-12 rounded-2xl" />
                  ))}
                </div>
              ) : dnRows.length === 0 ? (
                <EmptyState
                  title="No delivery notes"
                  description="This item has not appeared in any delivery notes yet."
                />
              ) : (
                <div className="space-y-2">
                  {dnRows.slice(0, 8).map((row) => (
                    <Link
                      key={row.name}
                      href={`/stock/delivery-note/${encodeURIComponent(row.parent)}`}
                      className="group flex items-center justify-between p-3 rounded-xl hover:bg-secondary/40 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium">{row.parent}</p>
                        <p className="text-[10px] text-muted-foreground">Delivery Note</p>
                      </div>
                      <span className="text-sm font-mono tabular-nums">
                        {Number(row.qty ?? 0).toLocaleString()} × {formatCurrency(row.rate)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </InfoCard>
          </div>
        </TabsContent>

        {/* ============================ ACTIVITY ============================ */}
        <TabsContent value="activity" className="space-y-6">
          <InfoCard title="Activity" icon={<History className="h-4 w-4" />}>
            <ActivityTimeline
              items={[
                {
                  id: "created",
                  type: "created",
                  description: "Item created",
                  user: item.owner,
                  timestamp: item.creation ?? new Date().toISOString(),
                },
                {
                  id: "modified",
                  type: "updated",
                  description: "Last modified",
                  user: item.modified_by,
                  timestamp: item.modified ?? new Date().toISOString(),
                },
              ]}
            />
          </InfoCard>
        </TabsContent>
      </Tabs>

      {/* Delete Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Item"
        description={`Are you sure you want to delete "${displayName}"? This action cannot be undone. Note: You cannot delete an item with existing transactions.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={async () => {
          try {
            await deleteMutation.mutateAsync(item.name);
          } catch (e) {
            console.error("Failed to delete item:", e);
          }
        }}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
