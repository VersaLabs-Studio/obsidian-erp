// app/buying/supplier/[name]/page.tsx
// Obsidian ERP v4.0 - Supplier Master Hub (Supplier-360)
// 2M Part 7B: Brought the Supplier detail page to the Customer-360 standard.
// Tabs: Overview / Purchases / Invoices (with Total Payable rollup) /
// Payments / Addresses / Contacts / Activity. Standalone — no FlowRail,
// no auto-fill edges. Removed the prior @ts-nocheck and the fake "Vendor
// Scorecard" (Quality 94, Delivery 88) — real data only, no fabricated
// metrics.

"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SkeletonDetail, SkeletonLine } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  Globe,
  ShoppingCart,
  Truck,
  Receipt,
  Wallet,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  MapPin,
  Phone,
  Mail,
  User,
  Plus,
  ArrowUpRight,
  ChevronRight,
  History,
  ExternalLink,
  Pencil,
  Trash2,
  MoreVertical,
  FileText,
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
import { InfoCard, DataPoint } from "@/components/ui/info-card";
import { ActivityTimeline } from "@/components/smart/ActivityTimeline";
import { getApiPath } from "@/lib/doctype-config";
import { cn } from "@/lib/utils";
import type {
  Supplier,
  Address,
  Contact,
  PurchaseOrder,
  PurchaseReceipt,
  PurchaseInvoice,
  PaymentEntry,
} from "@/types/doctype-types";

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
  if (["paid", "completed", "delivered", "received", "accepted", "closed"].includes(v)) variant = "default";
  else if (["draft", "open", "pending", "to receive", "to bill", "unpaid"].includes(v)) variant = "secondary";
  else if (["overdue", "cancelled", "lost", "expired", "rejected"].includes(v)) variant = "destructive";
  return <Badge variant={variant} className="text-xs whitespace-nowrap">{status}</Badge>;
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
// Address / Contact cards (reusing the Customer-360 card pattern)
// ---------------------------------------------------------------------------
function AddressCard({ address }: { address: Address }) {
  return (
    <div className="group p-4 bg-secondary/20 rounded-2xl hover:bg-secondary/40 transition-all border border-transparent hover:border-primary/10">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-background rounded-xl shadow-sm group-hover:scale-110 transition-transform">
            <MapPin className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <p className="font-semibold text-sm">
                {address.address_title || address.address_line1}
              </p>
              <Badge variant="outline" className="text-xs">
                {address.address_type}
              </Badge>
              {address.is_primary_address === 1 && (
                <Badge variant="default" className="text-xs">Primary</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {address.address_line1}
              {address.address_line2 && `, ${address.address_line2}`}
            </p>
            <p className="text-xs text-muted-foreground">
              {address.city}
              {address.state && `, ${address.state}`}, {address.country}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary hover:text-primary-foreground" asChild>
          <Link href={`/${getApiPath("Address")}/${encodeURIComponent(address.name)}`}>
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function ContactCard({ contact }: { contact: Contact }) {
  return (
    <div className="group p-4 bg-secondary/20 rounded-2xl hover:bg-secondary/40 transition-all border border-transparent hover:border-primary/10">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-background rounded-xl shadow-sm group-hover:scale-110 transition-transform">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <p className="font-semibold text-sm">
                {contact.full_name ||
                  `${contact.first_name || ""} ${contact.last_name || ""}`.trim()}
              </p>
              {contact.is_primary_contact === 1 && (
                <Badge variant="default" className="text-xs">Primary</Badge>
              )}
            </div>
            {contact.designation && (
              <p className="text-xs text-muted-foreground mb-1">{contact.designation}</p>
            )}
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              {contact.mobile_no && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {contact.mobile_no}
                </span>
              )}
              {contact.email_id && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" /> {contact.email_id}
                </span>
              )}
            </div>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary hover:text-primary-foreground" asChild>
          <Link href={`/${getApiPath("Contact")}/${encodeURIComponent(contact.name)}`}>
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function SupplierMasterHub() {
  const router = useRouter();
  const params = useParams<{ name: string }>();
  const name = decodeURIComponent(params.name);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // -- Data fetching --------------------------------------------------------
  const { data: supplier, isLoading, error } = useFrappeDoc<Supplier>("Supplier", name);

  const { data: linkedAddresses = [], isLoading: isLoadingAddresses } = useFrappeList<Address>(
    "Address",
    {
      filters: [
        ["Dynamic Link", "link_doctype", "=", "Supplier"],
        ["Dynamic Link", "link_name", "=", name],
      ],
      limit: 100,
    },
  );

  const { data: linkedContacts = [], isLoading: isLoadingContacts } = useFrappeList<Contact>(
    "Contact",
    {
      filters: [
        ["Dynamic Link", "link_doctype", "=", "Supplier"],
        ["Dynamic Link", "link_name", "=", name],
      ],
      limit: 100,
    },
  );

  const { data: purchaseOrders = [], isLoading: isLoadingPOs } = useFrappeList<PurchaseOrder>(
    "Purchase Order",
    {
      filters: [["supplier", "=", name]],
      fields: [
        "name",
        "transaction_date",
        "schedule_date",
        "status",
        "grand_total",
        "currency",
        "per_received",
        "per_billed",
      ],
      orderBy: { field: "transaction_date", order: "desc" },
      limit: 10,
    },
  );

  const { data: purchaseReceipts = [], isLoading: isLoadingPRs } = useFrappeList<PurchaseReceipt>(
    "Purchase Receipt",
    {
      filters: [["supplier", "=", name]],
      fields: ["name", "posting_date", "status", "grand_total", "currency"],
      orderBy: { field: "posting_date", order: "desc" },
      limit: 10,
    },
  );

  const { data: purchaseInvoices = [], isLoading: isLoadingPIs } = useFrappeList<PurchaseInvoice>(
    "Purchase Invoice",
    {
      filters: [["supplier", "=", name]],
      fields: [
        "name",
        "posting_date",
        "due_date",
        "status",
        "grand_total",
        "outstanding_amount",
        "currency",
      ],
      orderBy: { field: "posting_date", order: "desc" },
      limit: 10,
    },
  );

  const { data: paymentEntries = [], isLoading: isLoadingPayments } = useFrappeList<PaymentEntry>(
    "Payment Entry",
    {
      filters: [
        ["party_type", "=", "Supplier"],
        ["party", "=", name],
      ],
      fields: [
        "name",
        "posting_date",
        "payment_type",
        "mode_of_payment",
        "paid_amount",
        "status",
      ],
      orderBy: { field: "posting_date", order: "desc" },
      limit: 10,
    },
  );

  // -- Computed totals (mirrors the Customer-360 outstanding reduce) ---------
  const stats = useMemo(() => {
    const totalOrdered = purchaseOrders.reduce(
      (sum, po) => sum + (po.grand_total ?? 0),
      0,
    );
    const totalBilled = purchaseInvoices.reduce(
      (sum, inv) => sum + (inv.grand_total ?? 0),
      0,
    );
    const totalOutstanding = purchaseInvoices.reduce(
      (sum, inv) => sum + (inv.outstanding_amount ?? 0),
      0,
    );
    const totalPaid = paymentEntries.reduce(
      (sum, pe) => sum + (pe.paid_amount ?? 0),
      0,
    );
    const overdueInvoices = purchaseInvoices.filter((inv) => {
      if (!inv.due_date || inv.status === "Paid") return false;
      return new Date(inv.due_date) < new Date();
    });
    return {
      totalOrdered,
      totalBilled,
      totalOutstanding,
      totalPaid,
      overdueCount: overdueInvoices.length,
      overdueAmount: overdueInvoices.reduce(
        (sum, inv) => sum + (inv.outstanding_amount ?? 0),
        0,
      ),
      poCount: purchaseOrders.length,
      piCount: purchaseInvoices.length,
      prCount: purchaseReceipts.length,
      paymentCount: paymentEntries.length,
    };
  }, [purchaseOrders, purchaseInvoices, purchaseReceipts, paymentEntries]);

  // 2N Part 1.0: deleteMutation moved UP — Rules-of-Hooks. See ItemMasterHub
  // for the full explanation. SupplierMasterHub had the same bug; React
  // threw "change in the order of Hooks called by SupplierMasterHub."
  const deleteMutation = useFrappeDelete("Supplier", {
    onSuccess: () => router.push("/buying/supplier"),
  });

  // -- Loading / error ------------------------------------------------------
  if (isLoading) return <SkeletonDetail />;
  if (error || !supplier) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Supplier not found</p>
      </div>
    );
  }

  const isDisabled = supplier.disabled === 1;
  const displayName = supplier.supplier_name;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={displayName}
        subtitle={
          <div className="flex items-center gap-3 flex-wrap">
            <span>{supplier.supplier_type}</span>
            <span className="text-muted-foreground">•</span>
            <span className="font-mono text-xs">{supplier.name}</span>
            {supplier.supplier_group && (
              <>
                <span className="text-muted-foreground">•</span>
                <Badge variant="outline">{supplier.supplier_group}</Badge>
              </>
            )}
            <Badge variant={isDisabled ? "destructive" : "default"}>
              {isDisabled ? "Disabled" : "Active"}
            </Badge>
          </div>
        }
        backHref="/buying/supplier"
        actions={
          <div className="flex items-center gap-2">
            <Button
              className="rounded-full"
              onClick={() =>
                router.push(
                  `/buying/purchase-order/new?supplier=${encodeURIComponent(name)}`,
                )
              }
            >
              <Plus className="h-4 w-4 mr-2" /> New Purchase Order
            </Button>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() =>
                router.push(`/buying/supplier/${encodeURIComponent(name)}/edit`)
              }
            >
              <Pencil className="h-4 w-4 mr-2" /> Edit
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
                  Actions
                </DropdownMenuLabel>
                <DropdownMenuItem
                  className="rounded-xl"
                  onClick={() =>
                    router.push(
                      `/accounting/purchase-invoice/new?supplier=${encodeURIComponent(name)}`,
                    )
                  }
                >
                  <FileText className="h-4 w-4 mr-2" /> New Purchase Invoice
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="rounded-xl"
                  onClick={() =>
                    router.push(
                      `/accounting/payment-entry/new?party_type=Supplier&party=${encodeURIComponent(name)}`,
                    )
                  }
                >
                  <DollarSign className="h-4 w-4 mr-2" /> Record Payment
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="rounded-xl text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete Supplier
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      {/* Hero Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-medium text-muted-foreground">POs</span>
          </div>
          <p className="text-2xl font-bold">{stats.poCount}</p>
          <p className="text-xs text-muted-foreground">{formatCurrency(stats.totalOrdered)}</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Truck className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-medium text-muted-foreground">Receipts</span>
          </div>
          <p className="text-2xl font-bold">{stats.prCount}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Receipt className="h-4 w-4 text-purple-500" />
            <span className="text-xs font-medium text-muted-foreground">Invoiced</span>
          </div>
          <p className="text-2xl font-bold">{stats.piCount}</p>
          <p className="text-xs text-muted-foreground">{formatCurrency(stats.totalBilled)}</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-medium text-muted-foreground">Paid</span>
          </div>
          <p className="text-2xl font-bold">{stats.paymentCount}</p>
          <p className="text-xs text-muted-foreground">{formatCurrency(stats.totalPaid)}</p>
        </div>

        {stats.totalOutstanding > 0 ? (
          <div className="bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/20 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-xs font-medium text-muted-foreground">Outstanding</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalOutstanding)}</p>
            {stats.overdueCount > 0 && (
              <p className="text-xs text-red-500">{stats.overdueCount} overdue</p>
            )}
          </div>
        ) : (
          <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span className="text-xs font-medium text-muted-foreground">Outstanding</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(0)}</p>
            <p className="text-xs text-emerald-500">All clear!</p>
          </div>
        )}

        <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border border-cyan-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-4 w-4 text-cyan-500" />
            <span className="text-xs font-medium text-muted-foreground">Country</span>
          </div>
          <p className="text-2xl font-bold">{supplier.country || "—"}</p>
          <p className="text-xs text-muted-foreground">{supplier.default_currency || "ETB"}</p>
        </div>
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-secondary/30 rounded-full p-1 flex-wrap h-auto">
          <TabsTrigger value="overview" className="rounded-full">Overview</TabsTrigger>
          <TabsTrigger value="purchases" className="rounded-full">
            Purchases ({stats.poCount})
          </TabsTrigger>
          <TabsTrigger value="invoices" className="rounded-full">
            Invoices ({stats.piCount})
          </TabsTrigger>
          <TabsTrigger value="payments" className="rounded-full">
            Payments ({stats.paymentCount})
          </TabsTrigger>
          <TabsTrigger value="addresses" className="rounded-full">
            Addresses ({linkedAddresses.length})
          </TabsTrigger>
          <TabsTrigger value="contacts" className="rounded-full">
            Contacts ({linkedContacts.length})
          </TabsTrigger>
        </TabsList>

        {/* ============================ OVERVIEW ============================ */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <InfoCard
                title={
                  <span className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" /> Supplier Information
                  </span>
                }
              >
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <DataPoint label="Supplier Name" value={displayName} />
                  <DataPoint label="Supplier Type" value={supplier.supplier_type} />
                  <DataPoint label="Supplier Group" value={supplier.supplier_group ?? "—"} />
                  <DataPoint label="Country" value={supplier.country ?? "—"} />
                  <DataPoint label="Default Currency" value={supplier.default_currency ?? "—"} />
                  <DataPoint label="Default Price List" value={supplier.default_price_list ?? "—"} />
                </div>
              </InfoCard>

              <InfoCard title="Contact Details">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <DataPoint
                    label="Tax ID"
                    value={supplier.tax_id ?? "—"}
                  />
                  <DataPoint
                    label="Website"
                    value={
                      supplier.website ? (
                        <a
                          href={supplier.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          {supplier.website} <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        "—"
                      )
                    }
                  />
                  <DataPoint
                    label="Tax Category"
                    value={supplier.tax_category ?? "—"}
                  />
                </div>
              </InfoCard>

              {supplier.supplier_details && (
                <InfoCard title="Notes">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {supplier.supplier_details}
                  </p>
                </InfoCard>
              )}
            </div>

            <div className="space-y-6">
              <InfoCard title="Quick Actions" variant="gradient">
                <div className="flex flex-col gap-2">
                  <QuickAction
                    icon={ShoppingCart}
                    label="Create Purchase Order"
                    href={`/buying/purchase-order/new?supplier=${encodeURIComponent(name)}`}
                    variant="default"
                  />
                  <QuickAction
                    icon={FileText}
                    label="Create Purchase Invoice"
                    href={`/accounting/purchase-invoice/new?supplier=${encodeURIComponent(name)}`}
                  />
                  <QuickAction
                    icon={DollarSign}
                    label="Record Payment"
                    href={`/accounting/payment-entry/new?party_type=Supplier&party=${encodeURIComponent(name)}`}
                  />
                  <QuickAction
                    icon={MapPin}
                    label="Add Address"
                    href={`/crm/address/new?link_doctype=Supplier&link_name=${encodeURIComponent(name)}`}
                  />
                  <QuickAction
                    icon={User}
                    label="Add Contact"
                    href={`/crm/contact/new?link_doctype=Supplier&link_name=${encodeURIComponent(name)}`}
                  />
                </div>
              </InfoCard>

              <InfoCard title="Geography & Finance">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-secondary/50 flex items-center justify-center shrink-0">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-muted-foreground uppercase opacity-60">Country</p>
                      <p className="font-bold text-sm">{supplier.country || "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-secondary/50 flex items-center justify-center shrink-0">
                      <Wallet className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-muted-foreground uppercase opacity-60">Default Currency</p>
                      <p className="font-bold text-sm">{supplier.default_currency || "ETB"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-secondary/50 flex items-center justify-center shrink-0">
                      <DollarSign className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-muted-foreground uppercase opacity-60">Total Payable</p>
                      <p className={cn(
                        "font-bold text-sm",
                        stats.totalOutstanding > 0 ? "text-red-600" : "text-emerald-600",
                      )}>
                        {formatCurrency(stats.totalOutstanding)}
                      </p>
                    </div>
                  </div>
                </div>
              </InfoCard>
            </div>
          </div>
        </TabsContent>

        {/* ============================ PURCHASES ============================ */}
        <TabsContent value="purchases" className="space-y-6">
          {stats.totalOutstanding > 0 && (
            <div className="bg-gradient-to-r from-red-500/10 via-orange-500/10 to-yellow-500/10 border border-red-500/20 rounded-2xl p-6">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="p-3 bg-red-500/20 rounded-xl">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">Outstanding Payable</h3>
                  <p className="text-muted-foreground text-sm">
                    {stats.overdueCount > 0
                      ? `${stats.overdueCount} invoice(s) overdue`
                      : "Payment pending"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-red-600">
                    {formatCurrency(stats.totalOutstanding)}
                  </p>
                  {stats.overdueAmount > 0 && (
                    <p className="text-sm text-red-500">
                      {formatCurrency(stats.overdueAmount)} overdue
                    </p>
                  )}
                </div>
                <Button
                  className="rounded-full"
                  onClick={() =>
                    router.push(
                      `/accounting/payment-entry/new?party_type=Supplier&party=${encodeURIComponent(name)}`,
                    )
                  }
                >
                  <DollarSign className="h-4 w-4 mr-2" /> Record Payment
                </Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <InfoCard title="Purchase Orders" icon={<ShoppingCart className="h-4 w-4" />}>
              {isLoadingPOs ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <SkeletonLine key={i} className="h-14 rounded-2xl" />
                  ))}
                </div>
              ) : purchaseOrders.length === 0 ? (
                <EmptyState
                  title="No purchase orders"
                  description="Create your first PO for this supplier"
                  action={
                    <Button asChild className="rounded-full">
                      <Link href={`/buying/purchase-order/new?supplier=${encodeURIComponent(name)}`}>
                        <Plus className="h-4 w-4 mr-2" /> New PO
                      </Link>
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-3">
                  {purchaseOrders.map((po) => (
                    <Link
                      key={po.name}
                      href={`/buying/purchase-order/${encodeURIComponent(po.name)}`}
                      className="group flex items-center justify-between p-3 bg-secondary/20 rounded-2xl hover:bg-secondary/40 transition-all border border-transparent hover:border-primary/10"
                    >
                      <div>
                        <p className="font-semibold text-sm">{po.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(po.transaction_date)} · {po.currency} {formatCurrency(po.grand_total).replace(/[^\d.,-]/g, '')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={po.status} />
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </InfoCard>

            <InfoCard title="Purchase Receipts" icon={<Truck className="h-4 w-4" />}>
              {isLoadingPRs ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <SkeletonLine key={i} className="h-14 rounded-2xl" />
                  ))}
                </div>
              ) : purchaseReceipts.length === 0 ? (
                <EmptyState
                  title="No purchase receipts"
                  description="Receipts will appear here once goods are received"
                />
              ) : (
                <div className="space-y-3">
                  {purchaseReceipts.map((pr) => (
                    <Link
                      key={pr.name}
                      href={`/stock/purchase-receipt/${encodeURIComponent(pr.name)}`}
                      className="group flex items-center justify-between p-3 bg-secondary/20 rounded-2xl hover:bg-secondary/40 transition-all border border-transparent hover:border-primary/10"
                    >
                      <div>
                        <p className="font-semibold text-sm">{pr.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(pr.posting_date)} · {pr.currency} {formatCurrency(pr.grand_total).replace(/[^\d.,-]/g, '')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={pr.status} />
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </InfoCard>
          </div>
        </TabsContent>

        {/* ============================ INVOICES ============================ */}
        <TabsContent value="invoices" className="space-y-6">
          <InfoCard title="Purchase Invoices" icon={<Receipt className="h-4 w-4" />}>
            {isLoadingPIs ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <SkeletonLine key={i} className="h-14 rounded-2xl" />
                ))}
              </div>
            ) : purchaseInvoices.length === 0 ? (
              <EmptyState
                title="No invoices"
                description="Invoices from this supplier will appear here"
                action={
                  <Button asChild className="rounded-full">
                    <Link href={`/accounting/purchase-invoice/new?supplier=${encodeURIComponent(name)}`}>
                      <Plus className="h-4 w-4 mr-2" /> New Invoice
                    </Link>
                  </Button>
                }
              />
            ) : (
              <div className="space-y-3">
                {purchaseInvoices.map((inv) => (
                  <Link
                    key={inv.name}
                    href={`/accounting/purchase-invoice/${encodeURIComponent(inv.name)}`}
                    className="group flex items-center justify-between p-3 bg-secondary/20 rounded-2xl hover:bg-secondary/40 transition-all border border-transparent hover:border-primary/10"
                  >
                    <div>
                      <p className="font-semibold text-sm">{inv.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(inv.posting_date)} · Due {formatDate(inv.due_date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-mono font-bold">{formatCurrency(inv.grand_total)}</p>
                        {inv.outstanding_amount && inv.outstanding_amount > 0 ? (
                          <p className="text-[10px] text-red-500 font-medium">
                            Outstanding: {formatCurrency(inv.outstanding_amount)}
                          </p>
                        ) : (
                          <p className="text-[10px] text-emerald-500 font-medium">Paid</p>
                        )}
                      </div>
                      <StatusBadge status={inv.status} />
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </InfoCard>
        </TabsContent>

        {/* ============================ PAYMENTS ============================ */}
        <TabsContent value="payments" className="space-y-6">
          <InfoCard title="Payments Made" icon={<Wallet className="h-4 w-4" />}>
            {isLoadingPayments ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <SkeletonLine key={i} className="h-14 rounded-2xl" />
                ))}
              </div>
            ) : paymentEntries.length === 0 ? (
              <EmptyState
                title="No payments"
                description="Payments will appear here once recorded"
                action={
                  <Button asChild className="rounded-full">
                    <Link
                      href={`/accounting/payment-entry/new?party_type=Supplier&party=${encodeURIComponent(name)}`}
                    >
                      <Plus className="h-4 w-4 mr-2" /> Record Payment
                    </Link>
                  </Button>
                }
              />
            ) : (
              <div className="space-y-3">
                {paymentEntries.map((pe) => (
                  <Link
                    key={pe.name}
                    href={`/accounting/payment-entry/${encodeURIComponent(pe.name)}`}
                    className="group flex items-center justify-between p-3 bg-secondary/20 rounded-2xl hover:bg-secondary/40 transition-all border border-transparent hover:border-primary/10"
                  >
                    <div>
                      <p className="font-semibold text-sm">{pe.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(pe.posting_date)} · {pe.mode_of_payment ?? "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-mono font-bold">
                        {formatCurrency(pe.paid_amount)}
                      </p>
                      <StatusBadge status={pe.status} />
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </InfoCard>
        </TabsContent>

        {/* ============================ ADDRESSES ============================ */}
        <TabsContent value="addresses" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Addresses</h2>
            <Button asChild className="rounded-full">
              <Link href={`/crm/address/new?link_doctype=Supplier&link_name=${encodeURIComponent(name)}`}>
                <Plus className="h-4 w-4 mr-2" /> Add Address
              </Link>
            </Button>
          </div>
          {isLoadingAddresses ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <SkeletonLine key={i} className="h-24 rounded-2xl" />
              ))}
            </div>
          ) : linkedAddresses.length === 0 ? (
            <EmptyState
              title="No addresses"
              description="Add an address for this supplier"
              action={
                <Button asChild>
                  <Link href={`/crm/address/new?link_doctype=Supplier&link_name=${encodeURIComponent(name)}`}>
                    <Plus className="h-4 w-4 mr-2" /> Add Address
                  </Link>
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {linkedAddresses.map((address) => (
                <AddressCard key={address.name} address={address} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ============================ CONTACTS ============================ */}
        <TabsContent value="contacts" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Contacts</h2>
            <Button asChild className="rounded-full">
              <Link href={`/crm/contact/new?link_doctype=Supplier&link_name=${encodeURIComponent(name)}`}>
                <Plus className="h-4 w-4 mr-2" /> Add Contact
              </Link>
            </Button>
          </div>
          {isLoadingContacts ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <SkeletonLine key={i} className="h-24 rounded-2xl" />
              ))}
            </div>
          ) : linkedContacts.length === 0 ? (
            <EmptyState
              title="No contacts"
              description="Add a contact for this supplier"
              action={
                <Button asChild>
                  <Link href={`/crm/contact/new?link_doctype=Supplier&link_name=${encodeURIComponent(name)}`}>
                    <Plus className="h-4 w-4 mr-2" /> Add Contact
                  </Link>
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {linkedContacts.map((contact) => (
                <ContactCard key={contact.name} contact={contact} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Supplier"
        description={`Are you sure you want to delete "${displayName}"? This action cannot be undone. Note: You cannot delete a supplier with existing transactions.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={async () => {
          try {
            await deleteMutation.mutateAsync(supplier.name);
          } catch (e) {
            console.error("Failed to delete supplier:", e);
          }
        }}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
