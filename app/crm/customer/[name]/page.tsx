// app/crm/customer/[name]/page.tsx
// Obsidian ERP v4.0 - Customer Master Hub
// Complete Customer 360° View with all linked transactions
// @ts-nocheck

"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Edit,
  Trash2,
  MoreVertical,
  FileDown,
  Plus,
  MapPin,
  User,
  ArrowUpRight,
  FileText,
  ShoppingCart,
  Package,
  DollarSign,
  Wallet,
  AlertTriangle,
  TrendingUp,
  Clock,
  Building,
  Phone,
  Mail,
  Globe,
  CreditCard,
  Receipt,
  Factory,
  Truck,
  BarChart3,
  History,
  ExternalLink,
  ChevronRight,
  CalendarDays,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// v3.0 Imports
import { useFrappeDoc, useFrappeList, useFrappeDelete } from "@/hooks/generic";
import {
  PageHeader,
  LoadingState,
  ConfirmDialog,
  EmptyState,
} from "@/components/smart";
import { InfoCard, DataPoint, StatCard } from "@/components/ui/info-card";
import { getApiPath } from "@/lib/doctype-config";
import type {
  Customer,
  Address,
  Contact,
  Quotation,
  SalesOrder,
  SalesInvoice,
  PaymentEntry,
  DeliveryNote,
} from "@/types/doctype-types";

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

// Format currency
function formatCurrency(amount: number | undefined | null, currency = "ETB") {
  if (amount === undefined || amount === null) return "—";
  return new Intl.NumberFormat("en-ET", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

// Format date
function formatDate(date: string | undefined | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Status badge with colors
function StatusBadge({
  status,
  type = "default",
}: {
  status: string;
  type?: "quotation" | "order" | "invoice" | "payment" | "delivery" | "default";
}) {
  const getVariant = () => {
    const statusLower = status?.toLowerCase() || "";

    // Success states
    if (
      ["paid", "completed", "delivered", "accepted", "closed"].includes(
        statusLower,
      )
    ) {
      return "default";
    }

    // Warning states
    if (
      [
        "open",
        "draft",
        "pending",
        "to deliver",
        "to deliver and bill",
        "to bill",
        "partly paid",
        "unpaid",
      ].includes(statusLower)
    ) {
      return "secondary";
    }

    // Danger states
    if (
      ["overdue", "cancelled", "lost", "expired", "rejected"].includes(
        statusLower,
      )
    ) {
      return "destructive";
    }

    return "outline";
  };

  return (
    <Badge variant={getVariant()} className="text-xs whitespace-nowrap">
      {status}
    </Badge>
  );
}

// ============================================================================
// TRANSACTION CARD COMPONENTS
// ============================================================================

// Generic Transaction Row
function TransactionRow({
  icon: Icon,
  title,
  subtitle,
  amount,
  status,
  date,
  href,
  statusType = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  amount?: number;
  status?: string;
  date?: string;
  href: string;
  statusType?: "quotation" | "order" | "invoice" | "payment" | "delivery";
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between p-4 bg-secondary/20 rounded-2xl hover:bg-secondary/40 transition-all duration-300 border border-transparent hover:border-primary/10"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="p-2.5 bg-background rounded-xl shadow-sm group-hover:scale-110 transition-transform duration-300 shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate">{title}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-4">
        {date && (
          <span className="text-xs text-muted-foreground hidden sm:block">
            {formatDate(date)}
          </span>
        )}
        {status && <StatusBadge status={status} type={statusType} />}
        {amount !== undefined && (
          <span className="font-mono text-sm font-medium min-w-[80px] text-right">
            {formatCurrency(amount)}
          </span>
        )}
        <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </Link>
  );
}

// Address Card Component
function AddressCard({ address }: { address: Address }) {
  return (
    <div className="group p-4 bg-secondary/20 rounded-2xl hover:bg-secondary/40 transition-all duration-300 border border-transparent hover:border-primary/10">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-background rounded-xl shadow-sm group-hover:scale-110 transition-transform duration-300">
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
                <Badge variant="default" className="text-xs">
                  Primary
                </Badge>
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
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full hover:bg-primary hover:text-primary-foreground transform active:scale-95 transition-all"
          asChild
        >
          <Link
            href={`/${getApiPath("Address")}/${encodeURIComponent(
              address.name,
            )}`}
          >
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

// Contact Card Component
function ContactCard({ contact }: { contact: Contact }) {
  return (
    <div className="group p-4 bg-secondary/20 rounded-2xl hover:bg-secondary/40 transition-all duration-300 border border-transparent hover:border-primary/10">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-background rounded-xl shadow-sm group-hover:scale-110 transition-transform duration-300">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <p className="font-semibold text-sm">
                {contact.full_name ||
                  `${contact.first_name || ""} ${
                    contact.last_name || ""
                  }`.trim()}
              </p>
              {contact.is_primary_contact === 1 && (
                <Badge variant="default" className="text-xs">
                  Primary
                </Badge>
              )}
            </div>
            {contact.designation && (
              <p className="text-xs text-muted-foreground mb-1">
                {contact.designation}
              </p>
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
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full hover:bg-primary hover:text-primary-foreground transform active:scale-95 transition-all"
          asChild
        >
          <Link
            href={`/${getApiPath("Contact")}/${encodeURIComponent(
              contact.name,
            )}`}
          >
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

// Quick Action Button
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

// Section Header with View All link
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
            <span className="text-muted-foreground ml-2 font-normal">
              ({count})
            </span>
          )}
        </h3>
      </div>
      {viewAllHref && (
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full gap-1"
          asChild
        >
          <Link href={viewAllHref}>
            View All <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      )}
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function CustomerMasterHub() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(params.name as string);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // =========================================================================
  // DATA FETCHING
  // =========================================================================

  // Fetch customer
  const {
    data: customer,
    isLoading,
    error,
  } = useFrappeDoc<Customer>("Customer", name);

  // Fetch linked addresses using server-side filtering
  const { data: linkedAddresses = [], isLoading: isLoadingAddresses } =
    useFrappeList<Address>("Address", {
      filters: [
        ["Dynamic Link", "link_doctype", "=", "Customer"],
        ["Dynamic Link", "link_name", "=", name],
      ],
      limit: 100,
    });

  // Fetch linked contacts using server-side filtering
  const { data: linkedContacts = [], isLoading: isLoadingContacts } =
    useFrappeList<Contact>("Contact", {
      filters: [
        ["Dynamic Link", "link_doctype", "=", "Customer"],
        ["Dynamic Link", "link_name", "=", name],
      ],
      limit: 100,
    });

  // Fetch Quotations
  const { data: quotations = [], isLoading: isLoadingQuotations } =
    useFrappeList<Quotation>("Quotation", {
      filters: [["party_name", "=", name]],
      fields: [
        "name",
        "transaction_date",
        "valid_till",
        "status",
        "grand_total",
        "currency",
      ],
      orderBy: { field: "transaction_date", order: "desc" },
      limit: 10,
    });

  // Fetch Sales Orders
  const { data: salesOrders = [], isLoading: isLoadingSalesOrders } =
    useFrappeList<SalesOrder>("Sales Order", {
      filters: [["customer", "=", name]],
      fields: [
        "name",
        "transaction_date",
        "delivery_date",
        "status",
        "grand_total",
        "currency",
        "per_delivered",
        "per_billed",
      ],
      orderBy: { field: "transaction_date", order: "desc" },
      limit: 10,
    });

  // Fetch Delivery Notes
  const { data: deliveryNotes = [], isLoading: isLoadingDeliveryNotes } =
    useFrappeList<DeliveryNote>("Delivery Note", {
      filters: [["customer", "=", name]],
      fields: ["name", "posting_date", "status", "grand_total", "currency"],
      orderBy: { field: "posting_date", order: "desc" },
      limit: 10,
    });

  // Fetch Sales Invoices
  const { data: salesInvoices = [], isLoading: isLoadingSalesInvoices } =
    useFrappeList<SalesInvoice>("Sales Invoice", {
      filters: [["customer", "=", name]],
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
    });

  // Fetch Payment Entries
  const { data: paymentEntries = [], isLoading: isLoadingPayments } =
    useFrappeList<PaymentEntry>("Payment Entry", {
      filters: [
        ["party_type", "=", "Customer"],
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
    });

  // =========================================================================
  // COMPUTED VALUES
  // =========================================================================

  // Calculate totals
  const stats = useMemo(() => {
    const totalQuoted = quotations.reduce(
      (sum, q) => sum + (q.grand_total || 0),
      0,
    );
    const totalOrdered = salesOrders.reduce(
      (sum, so) => sum + (so.grand_total || 0),
      0,
    );
    const totalInvoiced = salesInvoices.reduce(
      (sum, inv) => sum + (inv.grand_total || 0),
      0,
    );
    const totalOutstanding = salesInvoices.reduce(
      (sum, inv) => sum + (inv.outstanding_amount || 0),
      0,
    );
    const totalPaid = paymentEntries.reduce(
      (sum, pe) => sum + (pe.paid_amount || 0),
      0,
    );

    const overdueInvoices = salesInvoices.filter((inv) => {
      if (!inv.due_date || inv.status === "Paid") return false;
      return new Date(inv.due_date) < new Date();
    });

    const pendingOrders = salesOrders.filter(
      (so) => !["Completed", "Cancelled", "Closed"].includes(so.status || ""),
    );

    return {
      totalQuoted,
      totalOrdered,
      totalInvoiced,
      totalOutstanding,
      totalPaid,
      overdueCount: overdueInvoices.length,
      overdueAmount: overdueInvoices.reduce(
        (sum, inv) => sum + (inv.outstanding_amount || 0),
        0,
      ),
      pendingOrdersCount: pendingOrders.length,
      quotationCount: quotations.length,
      orderCount: salesOrders.length,
      invoiceCount: salesInvoices.length,
      deliveryCount: deliveryNotes.length,
      paymentCount: paymentEntries.length,
    };
  }, [quotations, salesOrders, salesInvoices, paymentEntries, deliveryNotes]);

  // Delete mutation
  const deleteMutation = useFrappeDelete("Customer", {
    onSuccess: () => router.push("/crm/customer"),
  });

  const handleDeleteConfirm = async () => {
    await deleteMutation.mutateAsync(name);
  };

  // =========================================================================
  // LOADING STATE
  // =========================================================================

  if (isLoading) {
    return <LoadingState type="detail" />;
  }

  if (error || !customer) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Customer not found</p>
      </div>
    );
  }

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={customer.customer_name}
        subtitle={
          <div className="flex items-center gap-3 flex-wrap">
            <span>{customer.customer_type}</span>
            <span className="text-muted-foreground">•</span>
            <span className="font-mono text-xs">{customer.name}</span>
            {customer.customer_group && (
              <>
                <span className="text-muted-foreground">•</span>
                <Badge variant="outline">{customer.customer_group}</Badge>
              </>
            )}
            <Badge variant={customer.disabled ? "destructive" : "default"}>
              {customer.disabled ? "Disabled" : "Active"}
            </Badge>
          </div>
        }
        backHref="/crm/customer"
        actions={
          <div className="flex items-center gap-2">
            <Button
              className="rounded-full"
              onClick={() =>
                router.push(
                  `/sales/quotation/new?party_name=${encodeURIComponent(name)}`,
                )
              }
            >
              <Plus className="h-4 w-4 mr-2" /> New Quotation
            </Button>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() =>
                router.push(`/crm/customer/${encodeURIComponent(name)}/edit`)
              }
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
                <DropdownMenuItem
                  className="rounded-xl"
                  onClick={() =>
                    router.push(
                      `/sales/sales-order/new?customer=${encodeURIComponent(
                        name,
                      )}`,
                    )
                  }
                >
                  <ShoppingCart className="h-4 w-4 mr-2" /> New Sales Order
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="rounded-xl"
                  onClick={() =>
                    router.push(
                      `/accounting/sales-invoice/new?customer=${encodeURIComponent(
                        name,
                      )}`,
                    )
                  }
                >
                  <Receipt className="h-4 w-4 mr-2" /> New Invoice
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="rounded-xl"
                  onClick={() =>
                    router.push(
                      `/accounting/payment-entry/new?party_type=Customer&party=${encodeURIComponent(
                        name,
                      )}`,
                    )
                  }
                >
                  <DollarSign className="h-4 w-4 mr-2" /> Receive Payment
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="rounded-xl">
                  <FileDown className="h-4 w-4 mr-2" /> Export Data
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="rounded-xl text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete Customer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      {/* Hero Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-medium text-muted-foreground">
              Quotations
            </span>
          </div>
          <p className="text-2xl font-bold">{stats.quotationCount}</p>
          <p className="text-xs text-muted-foreground">
            {formatCurrency(stats.totalQuoted)}
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart className="h-4 w-4 text-purple-500" />
            <span className="text-xs font-medium text-muted-foreground">
              Orders
            </span>
          </div>
          <p className="text-2xl font-bold">{stats.orderCount}</p>
          <p className="text-xs text-muted-foreground">
            {formatCurrency(stats.totalOrdered)}
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Truck className="h-4 w-4 text-green-500" />
            <span className="text-xs font-medium text-muted-foreground">
              Deliveries
            </span>
          </div>
          <p className="text-2xl font-bold">{stats.deliveryCount}</p>
        </div>

        <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Receipt className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-medium text-muted-foreground">
              Invoiced
            </span>
          </div>
          <p className="text-2xl font-bold">{stats.invoiceCount}</p>
          <p className="text-xs text-muted-foreground">
            {formatCurrency(stats.totalInvoiced)}
          </p>
        </div>

        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-medium text-muted-foreground">
              Paid
            </span>
          </div>
          <p className="text-2xl font-bold">{stats.paymentCount}</p>
          <p className="text-xs text-muted-foreground">
            {formatCurrency(stats.totalPaid)}
          </p>
        </div>

        {stats.totalOutstanding > 0 ? (
          <div className="bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/20 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-xs font-medium text-muted-foreground">
                Outstanding
              </span>
            </div>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(stats.totalOutstanding)}
            </p>
            {stats.overdueCount > 0 && (
              <p className="text-xs text-red-500">
                {stats.overdueCount} overdue
              </p>
            )}
          </div>
        ) : (
          <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span className="text-xs font-medium text-muted-foreground">
                Outstanding
              </span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">
              {formatCurrency(0)}
            </p>
            <p className="text-xs text-emerald-500">All clear!</p>
          </div>
        )}
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-secondary/30 rounded-full p-1 flex-wrap h-auto">
          <TabsTrigger value="overview" className="rounded-full">
            Overview
          </TabsTrigger>
          <TabsTrigger value="transactions" className="rounded-full">
            Transactions
          </TabsTrigger>
          <TabsTrigger value="invoices" className="rounded-full">
            Invoices & Payments
          </TabsTrigger>
          <TabsTrigger value="addresses" className="rounded-full">
            Addresses ({linkedAddresses.length})
          </TabsTrigger>
          <TabsTrigger value="contacts" className="rounded-full">
            Contacts ({linkedContacts.length})
          </TabsTrigger>
        </TabsList>

        {/* ================================================================ */}
        {/* OVERVIEW TAB */}
        {/* ================================================================ */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Customer Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Customer Information Card */}
              <InfoCard title="Customer Information" icon="user">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <DataPoint
                    label="Customer Name"
                    value={customer.customer_name}
                  />
                  <DataPoint
                    label="Customer Type"
                    value={customer.customer_type}
                  />
                  <DataPoint
                    label="Customer Group"
                    value={customer.customer_group}
                  />
                  <DataPoint label="Territory" value={customer.territory} />
                  <DataPoint label="Industry" value={customer.industry} />
                  <DataPoint
                    label="Market Segment"
                    value={customer.market_segment}
                  />
                </div>
              </InfoCard>

              {/* Contact Details Card */}
              <InfoCard title="Contact Details" icon="contact">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <DataPoint
                    label="Email"
                    value={
                      customer.email_id ? (
                        <a
                          href={`mailto:${customer.email_id}`}
                          className="text-primary hover:underline"
                        >
                          {customer.email_id}
                        </a>
                      ) : (
                        "—"
                      )
                    }
                  />
                  <DataPoint
                    label="Mobile"
                    value={
                      customer.mobile_no ? (
                        <a
                          href={`tel:${customer.mobile_no}`}
                          className="text-primary hover:underline"
                        >
                          {customer.mobile_no}
                        </a>
                      ) : (
                        "—"
                      )
                    }
                  />
                  <DataPoint
                    label="Website"
                    value={
                      customer.website ? (
                        <a
                          href={customer.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          {customer.website}{" "}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        "—"
                      )
                    }
                  />
                  <DataPoint label="Tax ID (TIN)" value={customer.tax_id} />
                  <DataPoint
                    label="Default Currency"
                    value={customer.default_currency}
                  />
                  <DataPoint
                    label="Default Price List"
                    value={customer.default_price_list}
                  />
                </div>
              </InfoCard>

              {/* Recent Activity */}
              <InfoCard
                title="Recent Activity"
                icon={<History className="h-4 w-4" />}
              >
                <div className="space-y-3">
                  {[...quotations.slice(0, 2), ...salesOrders.slice(0, 2)]
                    .sort(
                      (a, b) =>
                        new Date(
                          b.transaction_date || b.posting_date || 0,
                        ).getTime() -
                        new Date(
                          a.transaction_date || a.posting_date || 0,
                        ).getTime(),
                    )
                    .slice(0, 4)
                    .map((item) => {
                      const isQuotation = "valid_till" in item;
                      return (
                        <TransactionRow
                          key={item.name}
                          icon={isQuotation ? FileText : ShoppingCart}
                          title={item.name}
                          subtitle={isQuotation ? "Quotation" : "Sales Order"}
                          amount={item.grand_total}
                          status={item.status}
                          date={item.transaction_date}
                          href={`/${isQuotation ? "sales/quotation" : "sales/sales-order"}/${encodeURIComponent(item.name)}`}
                          statusType={isQuotation ? "quotation" : "order"}
                        />
                      );
                    })}
                  {quotations.length === 0 && salesOrders.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No recent activity
                    </p>
                  )}
                </div>
              </InfoCard>
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <InfoCard title="Quick Actions" variant="gradient">
                <div className="flex flex-col gap-2">
                  <QuickAction
                    icon={FileText}
                    label="Create Quotation"
                    href={`/sales/quotation/new?party_name=${encodeURIComponent(name)}`}
                    variant="default"
                  />
                  <QuickAction
                    icon={ShoppingCart}
                    label="Create Sales Order"
                    href={`/sales/sales-order/new?customer=${encodeURIComponent(name)}`}
                  />
                  <QuickAction
                    icon={Receipt}
                    label="Create Invoice"
                    href={`/accounting/sales-invoice/new?customer=${encodeURIComponent(name)}`}
                  />
                  <QuickAction
                    icon={DollarSign}
                    label="Receive Payment"
                    href={`/accounting/payment-entry/new?party_type=Customer&party=${encodeURIComponent(name)}`}
                  />
                  <QuickAction
                    icon={MapPin}
                    label="Add Address"
                    href={`/crm/address/new?link_doctype=Customer&link_name=${encodeURIComponent(name)}`}
                  />
                  <QuickAction
                    icon={User}
                    label="Add Contact"
                    href={`/crm/contact/new?link_doctype=Customer&link_name=${encodeURIComponent(name)}`}
                  />
                </div>
              </InfoCard>

              {/* Credit & Billing Info */}
              <InfoCard title="Credit & Billing">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Credit Limit</span>
                    <span className="font-semibold">
                      {formatCurrency(customer.credit_limit)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Outstanding</span>
                    <span
                      className={`font-semibold ${
                        stats.totalOutstanding > 0 ? "text-red-600" : ""
                      }`}
                    >
                      {formatCurrency(stats.totalOutstanding)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment Terms</span>
                    <span className="font-semibold">
                      {customer.payment_terms || "—"}
                    </span>
                  </div>
                </div>
              </InfoCard>

              {/* Converted From Lead */}
              {customer.lead_name && (
                <InfoCard title="Converted From" icon="link">
                  <TransactionRow
                    icon={FileText}
                    title={customer.lead_name}
                    subtitle="Lead"
                    href={`/${getApiPath("Lead")}/${encodeURIComponent(
                      customer.lead_name,
                    )}`}
                  />
                </InfoCard>
              )}

              {/* Additional Details */}
              {customer.customer_details && (
                <InfoCard title="Notes" icon="info">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {customer.customer_details}
                  </p>
                </InfoCard>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ================================================================ */}
        {/* TRANSACTIONS TAB */}
        {/* ================================================================ */}
        <TabsContent value="transactions" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quotations */}
            <InfoCard
              title="Quotations"
              icon={<FileText className="h-4 w-4" />}
            >
              <SectionHeader
                title=""
                count={quotations.length}
                viewAllHref={`/sales/quotation?customer=${encodeURIComponent(name)}`}
              />
              {isLoadingQuotations ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 rounded-2xl" />
                  ))}
                </div>
              ) : quotations.length === 0 ? (
                <EmptyState
                  title="No quotations"
                  description="Create your first quotation for this customer"
                  action={
                    <Button
                      size="sm"
                      onClick={() =>
                        router.push(
                          `/sales/quotation/new?party_name=${encodeURIComponent(name)}`,
                        )
                      }
                    >
                      <Plus className="h-4 w-4 mr-2" /> New Quotation
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-3">
                  {quotations.map((q) => (
                    <TransactionRow
                      key={q.name}
                      icon={FileText}
                      title={q.name}
                      subtitle={`Valid till ${formatDate(q.valid_till)}`}
                      amount={q.grand_total}
                      status={q.status}
                      date={q.transaction_date}
                      href={`/sales/quotation/${encodeURIComponent(q.name)}`}
                      statusType="quotation"
                    />
                  ))}
                </div>
              )}
            </InfoCard>

            {/* Sales Orders */}
            <InfoCard
              title="Sales Orders"
              icon={<ShoppingCart className="h-4 w-4" />}
            >
              <SectionHeader
                title=""
                count={salesOrders.length}
                viewAllHref={`/sales/sales-order?customer=${encodeURIComponent(name)}`}
              />
              {isLoadingSalesOrders ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 rounded-2xl" />
                  ))}
                </div>
              ) : salesOrders.length === 0 ? (
                <EmptyState
                  title="No sales orders"
                  description="Create your first sales order for this customer"
                  action={
                    <Button
                      size="sm"
                      onClick={() =>
                        router.push(
                          `/sales/sales-order/new?customer=${encodeURIComponent(name)}`,
                        )
                      }
                    >
                      <Plus className="h-4 w-4 mr-2" /> New Sales Order
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-3">
                  {salesOrders.map((so) => (
                    <TransactionRow
                      key={so.name}
                      icon={ShoppingCart}
                      title={so.name}
                      subtitle={`Delivery: ${formatDate(so.delivery_date)}`}
                      amount={so.grand_total}
                      status={so.status}
                      date={so.transaction_date}
                      href={`/sales/sales-order/${encodeURIComponent(so.name)}`}
                      statusType="order"
                    />
                  ))}
                </div>
              )}
            </InfoCard>

            {/* Delivery Notes */}
            <InfoCard
              title="Delivery Notes"
              icon={<Truck className="h-4 w-4" />}
            >
              <SectionHeader
                title=""
                count={deliveryNotes.length}
                viewAllHref={`/stock/delivery-note?customer=${encodeURIComponent(name)}`}
              />
              {isLoadingDeliveryNotes ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 rounded-2xl" />
                  ))}
                </div>
              ) : deliveryNotes.length === 0 ? (
                <EmptyState
                  title="No delivery notes"
                  description="Deliveries will appear here once created"
                />
              ) : (
                <div className="space-y-3">
                  {deliveryNotes.map((dn) => (
                    <TransactionRow
                      key={dn.name}
                      icon={Truck}
                      title={dn.name}
                      amount={dn.grand_total}
                      status={dn.status}
                      date={dn.posting_date}
                      href={`/stock/delivery-note/${encodeURIComponent(dn.name)}`}
                      statusType="delivery"
                    />
                  ))}
                </div>
              )}
            </InfoCard>

            {/* Work Orders placeholder - if you have manufacturing linked to customer */}
            <InfoCard
              title="Work Orders"
              icon={<Factory className="h-4 w-4" />}
            >
              <EmptyState
                title="Coming soon"
                description="Manufacturing orders linked to this customer's sales orders will appear here"
              />
            </InfoCard>
          </div>
        </TabsContent>

        {/* ================================================================ */}
        {/* INVOICES & PAYMENTS TAB */}
        {/* ================================================================ */}
        <TabsContent value="invoices" className="space-y-6">
          {/* Outstanding Summary */}
          {stats.totalOutstanding > 0 && (
            <div className="bg-gradient-to-r from-red-500/10 via-orange-500/10 to-yellow-500/10 border border-red-500/20 rounded-2xl p-6">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="p-3 bg-red-500/20 rounded-xl">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">Outstanding Balance</h3>
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
                      `/accounting/payment-entry/new?party_type=Customer&party=${encodeURIComponent(name)}`,
                    )
                  }
                >
                  <DollarSign className="h-4 w-4 mr-2" /> Receive Payment
                </Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Invoices */}
            <InfoCard
              title="Sales Invoices"
              icon={<Receipt className="h-4 w-4" />}
            >
              <SectionHeader
                title=""
                count={salesInvoices.length}
                viewAllHref={`/accounting/sales-invoice?customer=${encodeURIComponent(name)}`}
              />
              {isLoadingSalesInvoices ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 rounded-2xl" />
                  ))}
                </div>
              ) : salesInvoices.length === 0 ? (
                <EmptyState
                  title="No invoices"
                  description="Create your first invoice for this customer"
                  action={
                    <Button
                      size="sm"
                      onClick={() =>
                        router.push(
                          `/accounting/sales-invoice/new?customer=${encodeURIComponent(name)}`,
                        )
                      }
                    >
                      <Plus className="h-4 w-4 mr-2" /> New Invoice
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-3">
                  {salesInvoices.map((inv) => (
                    <TransactionRow
                      key={inv.name}
                      icon={Receipt}
                      title={inv.name}
                      subtitle={
                        inv.outstanding_amount && inv.outstanding_amount > 0
                          ? `Outstanding: ${formatCurrency(inv.outstanding_amount)}`
                          : `Due: ${formatDate(inv.due_date)}`
                      }
                      amount={inv.grand_total}
                      status={inv.status}
                      date={inv.posting_date}
                      href={`/accounting/sales-invoice/${encodeURIComponent(inv.name)}`}
                      statusType="invoice"
                    />
                  ))}
                </div>
              )}
            </InfoCard>

            {/* Payment Entries */}
            <InfoCard
              title="Payments Received"
              icon={<Wallet className="h-4 w-4" />}
            >
              <SectionHeader
                title=""
                count={paymentEntries.length}
                viewAllHref={`/accounting/payment-entry?party=${encodeURIComponent(name)}`}
              />
              {isLoadingPayments ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 rounded-2xl" />
                  ))}
                </div>
              ) : paymentEntries.length === 0 ? (
                <EmptyState
                  title="No payments"
                  description="Payments will appear here once recorded"
                  action={
                    <Button
                      size="sm"
                      onClick={() =>
                        router.push(
                          `/accounting/payment-entry/new?party_type=Customer&party=${encodeURIComponent(name)}`,
                        )
                      }
                    >
                      <Plus className="h-4 w-4 mr-2" /> Receive Payment
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-3">
                  {paymentEntries.map((pe) => (
                    <TransactionRow
                      key={pe.name}
                      icon={DollarSign}
                      title={pe.name}
                      subtitle={pe.mode_of_payment || pe.payment_type}
                      amount={pe.paid_amount}
                      status={pe.status}
                      date={pe.posting_date}
                      href={`/accounting/payment-entry/${encodeURIComponent(pe.name)}`}
                      statusType="payment"
                    />
                  ))}
                </div>
              )}
            </InfoCard>
          </div>
        </TabsContent>

        {/* ================================================================ */}
        {/* ADDRESSES TAB */}
        {/* ================================================================ */}
        <TabsContent value="addresses" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Addresses</h2>
            <Button
              className="rounded-full"
              onClick={() =>
                router.push(
                  `/crm/address/new?link_doctype=Customer&link_name=${encodeURIComponent(name)}`,
                )
              }
            >
              <Plus className="h-4 w-4 mr-2" /> Add Address
            </Button>
          </div>
          {isLoadingAddresses ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-24 rounded-2xl" />
              ))}
            </div>
          ) : linkedAddresses.length === 0 ? (
            <EmptyState
              title="No addresses"
              description="Add an address for this customer"
              action={
                <Button
                  onClick={() =>
                    router.push(
                      `/crm/address/new?link_doctype=Customer&link_name=${encodeURIComponent(name)}`,
                    )
                  }
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Address
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

        {/* ================================================================ */}
        {/* CONTACTS TAB */}
        {/* ================================================================ */}
        <TabsContent value="contacts" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Contacts</h2>
            <Button
              className="rounded-full"
              onClick={() =>
                router.push(
                  `/crm/contact/new?link_doctype=Customer&link_name=${encodeURIComponent(name)}`,
                )
              }
            >
              <Plus className="h-4 w-4 mr-2" /> Add Contact
            </Button>
          </div>
          {isLoadingContacts ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-24 rounded-2xl" />
              ))}
            </div>
          ) : linkedContacts.length === 0 ? (
            <EmptyState
              title="No contacts"
              description="Add a contact for this customer"
              action={
                <Button
                  onClick={() =>
                    router.push(
                      `/crm/contact/new?link_doctype=Customer&link_name=${encodeURIComponent(name)}`,
                    )
                  }
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Contact
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
        title="Delete Customer"
        description={`Are you sure you want to delete "${customer.customer_name}"? This action cannot be undone. Note: You cannot delete a customer with existing transactions.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
