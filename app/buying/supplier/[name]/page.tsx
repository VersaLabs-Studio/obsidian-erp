// @ts-nocheck
"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useFrappeDoc, useFrappeList } from "@/hooks/generic";
import { PageHeader, LoadingState, EmptyState } from "@/components/smart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Tag,
  Globe,
  ShoppingCart,
  Clock,
  CheckCircle2,
  Pencil,
  Trash2,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  TrendingUp,
  FileSearch,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import type { Supplier, PurchaseOrder } from "@/types/doctype-types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function OrderListItem({ order }) {
  const router = useRouter();
  return (
    <div
      className="group flex items-center justify-between p-4 rounded-2xl bg-secondary/20 border border-border/50 hover:bg-secondary/40 transition-all cursor-pointer"
      onClick={() =>
        router.push(`/buying/purchase-order/${encodeURIComponent(order.name)}`)
      }
    >
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-xl bg-background flex items-center justify-center border border-border/50">
          <ShoppingCart className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        <div>
          <p className="font-bold text-sm tracking-tight">{order.name}</p>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
            <span>
              {format(parseISO(order.transaction_date), "MMM d, yyyy")}
            </span>
            <span>•</span>
            <span className="font-bold">
              {order.currency} {order.grand_total?.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
      <Badge
        variant="outline"
        className="rounded-lg text-[9px] font-black uppercase h-6 px-2 border-current/20"
      >
        {order.status}
      </Badge>
    </div>
  );
}

export default function SupplierDetailPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = use(params);
  const router = useRouter();

  const { data: supplier, isLoading } = useFrappeDoc<Supplier>(
    "Supplier",
    name,
  );

  const { data: orders, isLoading: ordersLoading } =
    useFrappeList<PurchaseOrder>("Purchase Order", {
      filters: [["supplier", "=", name]],
      fields: ["name", "status", "grand_total", "currency", "transaction_date"],
      limit: 5,
      orderBy: { field: "creation", order: "desc" },
    });

  if (isLoading) return <LoadingState type="detail" />;
  if (!supplier) return <EmptyState title="Supplier not found" />;

  const isDisabled = supplier.disabled === 1;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader
        title={supplier.supplier_name}
        subtitle={supplier.name}
        backHref="/buying/supplier"
        tags={
          <Badge
            className={cn(
              "rounded-full px-4 py-1.5 text-[10px] font-black tracking-widest uppercase border-0 shadow-sm",
              isDisabled
                ? "bg-red-500/10 text-red-600"
                : "bg-emerald-500/10 text-emerald-600",
            )}
          >
            {isDisabled ? (
              <ShieldAlert className="h-3 w-3 mr-2" />
            ) : (
              <ShieldCheck className="h-3 w-3 mr-2" />
            )}
            {isDisabled ? "DISABLED" : "ACTIVE VENDOR"}
          </Badge>
        }
      >
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="rounded-2xl h-11 px-6 font-bold"
            onClick={() =>
              router.push(`/buying/supplier/${encodeURIComponent(name)}/edit`)
            }
          >
            <Pencil className="h-4 w-4 mr-2" /> Edit Profile
          </Button>
          <Button
            className="rounded-2xl h-11 px-8 font-black uppercase tracking-widest text-[11px] shadow-lg shadow-primary/20"
            onClick={() =>
              router.push(
                `/buying/purchase-order/new?supplier=${encodeURIComponent(name)}`,
              )
            }
          >
            <Plus className="h-4 w-4 mr-2" /> New Purchase Order
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Supplier Info Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card rounded-[2.5rem] border border-border/50 p-8 shadow-sm space-y-6">
              <h4 className="font-bold text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" /> Corporate
                Identity
              </h4>
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase opacity-60 mb-1">
                    Supplier Group
                  </p>
                  <p className="font-bold text-sm">{supplier.supplier_group}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase opacity-60 mb-1">
                    Type
                  </p>
                  <p className="font-bold text-sm">{supplier.supplier_type}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase opacity-60 mb-1">
                    Registration Date
                  </p>
                  <p className="font-bold text-sm">
                    {format(parseISO(supplier.creation), "MMMM d, yyyy")}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-[2.5rem] border border-border/50 p-8 shadow-sm space-y-6">
              <h4 className="font-bold text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Globe className="h-4 w-4 text-blue-500" /> Geography & Finance
              </h4>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-secondary/50 flex items-center justify-center shrink-0">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase opacity-60">
                      Territory
                    </p>
                    <p className="font-bold text-sm">
                      {supplier.country || "Ethiopia"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-secondary/50 flex items-center justify-center shrink-0">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase opacity-60">
                      Default Currency
                    </p>
                    <p className="font-bold text-sm">
                      {supplier.default_currency || "ETB"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Orders Tabs */}
          <div className="bg-card rounded-[2.5rem] border border-border/50 overflow-hidden shadow-sm">
            <div className="p-8 border-b border-border/50 bg-secondary/10 flex justify-between items-center">
              <h3 className="font-bold text-lg tracking-tight flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-amber-500" /> Transaction
                History
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full text-[10px] font-black uppercase tracking-widest"
                onClick={() =>
                  router.push(
                    `/buying/purchase-order?supplier=${encodeURIComponent(name)}`,
                  )
                }
              >
                View All <ArrowUpRight className="h-3 w-3 ml-2" />
              </Button>
            </div>
            <div className="p-8">
              {ordersLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-16 rounded-2xl bg-secondary/20 animate-pulse"
                    />
                  ))}
                </div>
              ) : orders?.length === 0 ? (
                <div className="text-center py-10 opacity-40">
                  <FileSearch className="h-12 w-12 mx-auto mb-3" />
                  <p className="text-sm font-bold">
                    No purchase orders found with this supplier.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <OrderListItem key={order.name} order={order} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {/* Supplier Scorecard */}
          <div className="bg-card rounded-[2.5rem] border border-border/50 p-8 shadow-sm space-y-6">
            <h4 className="font-bold text-xs uppercase tracking-widest text-muted-foreground">
              Vendor Scorecard
            </h4>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-[11px] font-black uppercase tracking-tighter mb-2">
                  <span>Quality Rating</span>
                  <span className="text-emerald-600">94/100</span>
                </div>
                <div className="h-2 bg-secondary/50 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full w-[94%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[11px] font-black uppercase tracking-tighter mb-2">
                  <span>Delivery Reliability</span>
                  <span className="text-blue-600">88/100</span>
                </div>
                <div className="h-2 bg-secondary/50 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full w-[88%]" />
                </div>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-card rounded-[2.5rem] border border-border/50 p-8 shadow-sm space-y-6">
            <h4 className="font-bold text-xs uppercase tracking-widest text-muted-foreground">
              Communication
            </h4>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-secondary/20 border border-border/50">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-bold font-mono">
                  No number registered
                </span>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-secondary/20 border border-border/50">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-bold font-mono truncate">
                  No email registered
                </span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-primary shadow-2xl shadow-primary/20 rounded-[2.5rem] p-8 text-white space-y-6">
            <TrendingUp className="h-8 w-8 text-white/40" />
            <div>
              <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">
                Total Procurement Vol.
              </p>
              <p className="text-3xl font-black tabular-nums tracking-tighter">
                ETB 0.00
              </p>
            </div>
            <div className="pt-6 border-t border-white/10 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
              <span className="text-white/60">Active Contracts</span>
              <span>{orders?.length || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
