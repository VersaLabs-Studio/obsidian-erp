// app/sales/sales-order/[name]/page.tsx
// Obsidian ERP v4.0 - Sales Order Detail View (Professional Invoice Layout)

"use client";

import { useState, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Printer,
  Share2,
  Edit,
  Trash2,
  Send,
  Ban,
  Phone,
  Mail,
  MoreVertical,
  Check,
  Truck,
  FileCheck,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useFrappeDoc,
  useFrappeUpdate,
  useFrappeDelete,
} from "@/hooks/generic";
import { PageHeader, LoadingState, ConfirmDialog } from "@/components/smart";
import { DataPoint } from "@/components/ui/info-card";
import { FlowTracker } from "@/components/flows/FlowTracker";
import { resolveFlowChain } from "@/lib/flows/flow-chain-resolver";
import { WhatsNext } from "@/components/smart/WhatsNext";
import { ActivityTimeline } from "@/components/smart/ActivityTimeline";
import type {
  SalesOrder,
  Address,
  Contact,
  Company,
} from "@/types/doctype-types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SalesOrderItem {
  item_code: string;
  item_name?: string;
  description: string;
  qty: number;
  rate: number;
  amount: number;
  uom?: string;
}

const getStatusBadgeClasses = (status: string) => {
  switch (status) {
    case "Draft":
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
    case "To Deliver and Bill":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300";
    case "To Deliver":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300";
    case "To Bill":
      return "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300";
    case "Completed":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300";
    case "On Hold":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300";
    case "Cancelled":
      return "bg-muted text-muted-foreground";
    case "Closed":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
};

export default function SalesOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(params.name as string);
  const printRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  const {
    data: order,
    isLoading,
    refetch,
  } = useFrappeDoc<SalesOrder>("Sales Order", name);

  const { data: company } = useFrappeDoc<Company>(
    "Company",
    order?.company || "",
    { enabled: !!order?.company },
  );

  const { data: addressDoc } = useFrappeDoc<Address>(
    "Address",
    order?.customer_address || "",
    { enabled: !!order?.customer_address },
  );

  const { data: contactDoc } = useFrappeDoc<Contact>(
    "Contact",
    order?.contact_person || "",
    { enabled: !!order?.contact_person },
  );

  const updateMutation = useFrappeUpdate<{ data: SalesOrder }, { name: string; data: Record<string, unknown> }>(
    "Sales Order",
    {
      onSuccess: () => {
        refetch();
        setShowSubmitDialog(false);
        setShowCancelDialog(false);
      },
    },
  );

  const deleteMutation = useFrappeDelete("Sales Order", {
    onSuccess: () => router.push("/sales/sales-order"),
  });

  const flowResult = useMemo(() => {
    if (!order) return null;
    const so = order as SalesOrder;
    const soRecord = order as unknown as Record<string, unknown>;
    const quotationName = soRecord.against_quotation as string | undefined;

    const stageStatuses: Record<
      string,
      { status: "completed" | "current" | "pending"; documentName?: string; documentUrl?: string }
    > = {
      "Sales Order": {
        status: "current",
        documentName: name,
        documentUrl: `/sales/sales-order/${name}`,
      },
      "Delivery Note": {
        status: (so.per_delivered ?? 0) >= 100 ? "completed" : "pending",
      },
      "Sales Invoice": {
        status: (so.per_billed ?? 0) >= 100 ? "completed" : "pending",
      },
      "Payment Entry": { status: "pending" },
    };

    if (quotationName) {
      stageStatuses["Quotation"] = {
        status: "completed",
        documentName: quotationName,
        documentUrl: `/sales/quotation/${quotationName}`,
      };
    }

    return resolveFlowChain("Sales Order", name, stageStatuses);
  }, [order, name]);

  const whatsNextActions = useMemo(() => {
    if (!order) return [];
    const so = order as SalesOrder;
    const actions = [];

    if (so.docstatus === 0) {
      actions.push({
        label: "Submit Order",
        description: "Submit this order for processing",
        onClick: () => setShowSubmitDialog(true),
        isPrimary: true,
      });
    }

    if (so.docstatus === 1) {
      actions.push({
        label: "Create Work Order",
        description: "Start manufacturing for this order",
        onClick: () => {},
        disabled: true,
        disabledReason: "Available in Phase 2 — Module Completeness",
      });
    }

    if (so.docstatus === 1 && (so.per_delivered ?? 0) < 100) {
      actions.push({
        label: "Create Delivery Note",
        description: "Ship items to customer",
        onClick: () => {},
        disabled: true,
        disabledReason: "Available in Phase 2 — Module Completeness",
      });
    }

    if (so.docstatus === 1 && (so.per_billed ?? 0) < 100) {
      actions.push({
        label: "Create Sales Invoice",
        description: "Generate invoice for this order",
        onClick: () => {},
        disabled: true,
        disabledReason: "Available in Phase 2 — Module Completeness",
      });
    }

    return actions;
  }, [order]);

  const activityItems = useMemo(() => {
    if (!order) return [];
    const so = order as unknown as Record<string, unknown>;
    return [
      {
        id: "1",
        type: "created" as const,
        description: `Sales Order ${name} created`,
        user: String(so.owner || "Administrator"),
        timestamp: String(so.creation || new Date().toISOString()),
      },
      ...((so.docstatus as number) === 1
        ? [
            {
              id: "2",
              type: "submitted" as const,
              description: "Order submitted for processing",
              user: String(so.modified_by || "Administrator"),
              timestamp: String(so.modified || new Date().toISOString()),
            },
          ]
        : []),
    ];
  }, [order, name]);

  if (isLoading) return <LoadingState type="detail" />;
  if (!order)
    return (
      <div className="p-8 text-center text-destructive">
        Sales Order not found
      </div>
    );

  const so = order as SalesOrder;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ET", {
      style: "currency",
      currency: so.currency || "ETB",
    }).format(amount || 0);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const displayStatus =
    so.docstatus === 2 ? "Cancelled" : so.status || "Draft";

  const isDraft = so.docstatus === 0;
  const isSubmitted = so.docstatus === 1;
  const isCancelled = so.docstatus === 2;

  const handleSubmit = async () => {
    await updateMutation.mutateAsync({
      name: so.name,
      data: { docstatus: 1 },
    });
    // Toast is driven by the mutation's onSuccess/onError (showToast: true by default)
  };

  const handleCancel = async () => {
    await updateMutation.mutateAsync({
      name: so.name,
      data: { docstatus: 2 },
    });
    // Toast is driven by the mutation's onSuccess/onError (showToast: true by default)
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(so.name);
  };

  const handleShare = async () => {
    const url = window.location.href;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Sales Order - ${so.name}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              color: #1a1a1a;
              line-height: 1.6;
              padding: 40px;
            }
            .print-container { max-width: 800px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #e5e5e5; }
            .company-info h1 { font-size: 24px; font-weight: 700; color: #1a1a1a; }
            .company-info p { font-size: 12px; color: #666; margin-top: 4px; }
            .order-info { text-align: right; }
            .order-info h2 { font-size: 28px; font-weight: 700; color: #3b82f6; margin-bottom: 8px; }
            .order-info p { font-size: 12px; color: #666; }
            .order-info .order-id { font-size: 14px; font-weight: 600; color: #1a1a1a; }
            .parties { display: flex; gap: 40px; margin-bottom: 40px; }
            .party { flex: 1; }
            .party-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #999; letter-spacing: 1px; margin-bottom: 8px; }
            .party h3 { font-size: 16px; font-weight: 600; margin-bottom: 4px; }
            .party p { font-size: 12px; color: #666; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
            .items-table th { background: #f8f9fa; padding: 12px; font-size: 10px; font-weight: 700; text-transform: uppercase; color: #666; letter-spacing: 0.5px; text-align: left; border-bottom: 2px solid #e5e5e5; }
            .items-table th.right { text-align: right; }
            .items-table td { padding: 12px; font-size: 12px; border-bottom: 1px solid #eee; vertical-align: top; }
            .items-table td.right { text-align: right; }
            .items-table .item-name { font-weight: 600; }
            .items-table .description { color: #666; font-size: 11px; margin-top: 4px; white-space: pre-wrap; }
            .totals { margin-left: auto; width: 280px; }
            .totals-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; }
            .totals-row.subtotal { border-bottom: 1px solid #eee; }
            .totals-row.grand { font-size: 18px; font-weight: 700; color: #1a1a1a; border-top: 2px solid #1a1a1a; padding-top: 12px; margin-top: 8px; }
            .terms { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; }
            .terms h4 { font-size: 12px; font-weight: 700; text-transform: uppercase; color: #999; letter-spacing: 1px; margin-bottom: 12px; }
            .terms p { font-size: 11px; color: #666; white-space: pre-wrap; }
            .footer { margin-top: 60px; text-align: center; font-size: 11px; color: #999; }
            @media print {
              body { padding: 20px; }
              .print-container { max-width: 100%; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const items = (so.items || []) as unknown as SalesOrderItem[];

  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0 }}
      animate={prefersReducedMotion ? {} : { opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 pb-10"
    >
      <PageHeader
        title={so.name}
        subtitle={
          <div className="flex items-center gap-2">
            <Badge
              className={cn(
                "text-xs font-semibold border-0",
                getStatusBadgeClasses(displayStatus),
              )}
            >
              {displayStatus}
            </Badge>
          </div>
        }
        backHref="/sales/sales-order"
        actions={
          <div className="flex gap-2 flex-wrap">
            {isDraft && (
              <>
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() =>
                    router.push(
                      `/sales/sales-order/${encodeURIComponent(name)}/edit`,
                    )
                  }
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  className="rounded-full"
                  onClick={() => setShowSubmitDialog(true)}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Submit
                </Button>
              </>
            )}

            {isSubmitted && (
              <Button
                variant="outline"
                className="rounded-full"
                disabled
                title="Available in Phase 2"
              >
                <Truck className="h-4 w-4 mr-2" />
                Create DN
              </Button>
            )}

            {isSubmitted && (
              <Button
                variant="outline"
                className="rounded-full"
                disabled
                title="Available in Phase 2"
              >
                <FileCheck className="h-4 w-4 mr-2" />
                Create Invoice
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-full">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="rounded-xl shadow-xl bg-popover/95 backdrop-blur-xl p-1.5 min-w-[180px]"
              >
                <DropdownMenuItem
                  className="rounded-lg cursor-pointer"
                  onClick={handlePrint}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="rounded-lg cursor-pointer"
                  onClick={handleShare}
                >
                  {copied ? (
                    <Check className="h-4 w-4 mr-2" />
                  ) : (
                    <Share2 className="h-4 w-4 mr-2" />
                  )}
                  {copied ? "Copied!" : "Share Link"}
                </DropdownMenuItem>
                {isSubmitted && !isCancelled && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="rounded-lg cursor-pointer text-destructive focus:text-destructive"
                      onClick={() => setShowCancelDialog(true)}
                    >
                      <Ban className="h-4 w-4 mr-2" />
                      Cancel Order
                    </DropdownMenuItem>
                  </>
                )}
                {isDraft && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="rounded-lg cursor-pointer text-destructive focus:text-destructive"
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      {/* Flow Tracker */}
      {flowResult && (
        <FlowTracker
          result={flowResult}
          compact={false}
          onCreateAction={() => {
            // Downstream creation (WO, DN, Invoice) is Phase 2 scope
            // Buttons in WhatsNext are disabled with Phase 2 tooltip
          }}
        />
      )}

      {/* Professional Invoice Card */}
      <div className="bg-card md:rounded-2xl shadow-lg border-y md:border border-border overflow-hidden mx-[-1rem] md:mx-0">
        {/* Invoice Header */}
        <div className="p-4 md:p-8 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6">
            <div className="w-full md:w-auto flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 relative overflow-hidden rounded-2xl shadow-sm border border-border bg-card p-2">
                  <img
                    src="/logo.png"
                    alt="Obsidian ERP"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                    SALES ORDER
                  </h1>
                  <p className="text-base md:text-lg font-mono text-primary mt-1">
                    {so.name}
                  </p>
                </div>
              </div>
              {company && (
                <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <p className="font-semibold text-foreground text-base">
                    {company.company_name || "Obsidian ERP"}
                  </p>
                  {company.address_html && <p>{company.address_html}</p>}
                  {company.phone_no && <p>Tel: {company.phone_no}</p>}
                  {company.email && <p>Email: {company.email}</p>}
                </div>
              )}
            </div>
            <div className="w-full md:w-auto md:text-right">
              <div className="bg-secondary/50 rounded-xl p-4 w-full md:inline-block">
                <DataPoint
                  label="Order Date"
                  value={formatDate(so.transaction_date)}
                />
                {so.delivery_date && (
                  <div className="mt-3">
                    <DataPoint
                      label="Delivery Date"
                      value={formatDate(so.delivery_date)}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bill To Section */}
        <div className="p-4 md:p-8 border-b border-border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-3">
                Bill To
              </p>
              <h3 className="font-bold text-xl text-foreground">
                {so.customer_name || so.customer}
              </h3>
              {addressDoc && (
                <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                  {addressDoc.address_line1 && (
                    <p>{addressDoc.address_line1}</p>
                  )}
                  {addressDoc.address_line2 && (
                    <p>{addressDoc.address_line2}</p>
                  )}
                  <p>
                    {[addressDoc.city, addressDoc.state, addressDoc.pincode]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  {addressDoc.country && <p>{addressDoc.country}</p>}
                </div>
              )}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-3">
                Contact Person
              </p>
              {contactDoc ? (
                <div className="space-y-2">
                  <h4 className="font-semibold text-foreground">
                    {contactDoc.first_name} {contactDoc.last_name}
                  </h4>
                  {contactDoc.email_id && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Mail className="h-3 w-3" />
                      {contactDoc.email_id}
                    </p>
                  )}
                  {(contactDoc.phone || contactDoc.mobile_no) && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Phone className="h-3 w-3" />
                      {contactDoc.phone || contactDoc.mobile_no}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No contact specified
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Items Section */}
        <div className="border-t border-border">
          {/* Mobile Items View (Card-based) */}
          <div className="p-4 space-y-4 md:hidden">
            <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest px-1">
              Items & Services
            </p>
            {items.map((item, idx) => (
              <div
                key={idx}
                className="bg-secondary/20 rounded-2xl p-4 border border-border/50 shadow-sm"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-primary">
                      #{idx + 1}
                    </span>
                    <h4 className="font-bold text-foreground">
                      {item.item_code}
                    </h4>
                  </div>
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    {item.qty} {item.uom || "Nos"}
                  </Badge>
                </div>

                {item.item_name && item.item_name !== item.item_code && (
                  <p className="text-xs text-foreground/80 mb-2">
                    {item.item_name}
                  </p>
                )}

                {item.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 italic mb-3">
                    {item.description}
                  </p>
                )}

                <div className="flex justify-between items-end pt-3 border-t border-border/50">
                  <div className="space-y-0.5">
                    <p className="text-[9px] uppercase text-muted-foreground font-bold tracking-tighter">
                      Rate
                    </p>
                    <p className="text-sm font-medium">
                      {formatCurrency(item.rate)}
                    </p>
                  </div>
                  <div className="text-right space-y-0.5">
                    <p className="text-[9px] uppercase text-muted-foreground font-bold tracking-tighter">
                      Total
                    </p>
                    <p className="text-base font-bold text-foreground">
                      {formatCurrency(item.amount || item.qty * item.rate)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Items Table */}
          <div className="hidden md:block p-8">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-border text-muted-foreground">
                  <th className="py-3 text-left font-bold uppercase text-[10px] tracking-wider">
                    #
                  </th>
                  <th className="py-3 text-left font-bold uppercase text-[10px] tracking-wider">
                    Item / Service
                  </th>
                  <th className="py-3 text-left font-bold uppercase text-[10px] tracking-wider">
                    Description / Specs
                  </th>
                  <th className="py-3 text-right font-bold uppercase text-[10px] tracking-wider">
                    Qty
                  </th>
                  <th className="py-3 text-right font-bold uppercase text-[10px] tracking-wider">
                    Rate
                  </th>
                  <th className="py-3 text-right font-bold uppercase text-[10px] tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-border/50 hover:bg-secondary/20 transition-colors"
                  >
                    <td className="py-4 text-muted-foreground">{idx + 1}</td>
                    <td className="py-4">
                      <span className="font-semibold text-foreground">
                        {item.item_code}
                      </span>
                      {item.item_name && item.item_name !== item.item_code && (
                        <p className="text-xs text-muted-foreground">
                          {item.item_name}
                        </p>
                      )}
                    </td>
                    <td className="py-4 text-muted-foreground max-w-xs">
                      <p className="whitespace-pre-wrap text-xs">
                        {item.description || "—"}
                      </p>
                    </td>
                    <td className="py-4 text-right font-medium">
                      {item.qty} {item.uom || "Nos"}
                    </td>
                    <td className="py-4 text-right">
                      {formatCurrency(item.rate)}
                    </td>
                    <td className="py-4 text-right font-semibold text-foreground">
                      {formatCurrency(item.amount || item.qty * item.rate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="p-4 md:p-8 bg-secondary/10 border-t border-border">
          <div className="ml-auto w-full md:w-80 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">
                {formatCurrency(so.total || 0)}
              </span>
            </div>
            {(so.total_taxes_and_charges ?? 0) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Tax ({so.taxes_and_charges || "Applied"})
                </span>
                <span className="font-medium">
                  {formatCurrency(so.total_taxes_and_charges ?? 0)}
                </span>
              </div>
            )}
            {(so.discount_amount ?? 0) > 0 && (
              <div className="flex justify-between text-sm text-emerald-600">
                <span>Discount</span>
                <span>-{formatCurrency(so.discount_amount ?? 0)}</span>
              </div>
            )}
            <div className="flex justify-between text-xl font-bold text-foreground border-t-2 border-foreground pt-3 mt-3">
              <span>Grand Total</span>
              <span className="text-primary">
                {formatCurrency(so.grand_total || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Terms & Conditions */}
        {so.terms && (
          <div className="p-4 md:p-8 border-t border-border">
            <h3 className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-3">
              Terms & Conditions
            </h3>
            <div className="text-sm text-muted-foreground whitespace-pre-wrap bg-secondary/20 p-4 rounded-xl">
              {so.terms}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-8 border-t border-border text-center text-xs text-muted-foreground">
          <p>Thank you for your business!</p>
          <p className="mt-1">
            This sales order was created on {formatDate(so.transaction_date)}.
          </p>
        </div>
      </div>

      {/* What's Next */}
      <WhatsNext actions={whatsNextActions} />

      {/* Activity Timeline */}
      <ActivityTimeline items={activityItems} />

      {/* Hidden Print Template */}
      <div ref={printRef} className="hidden">
        <div className="print-container">
          <div className="header">
            <div className="flex items-start gap-4">
              <img
                src="/logo.png"
                style={{ height: "60px", width: "60px", objectFit: "contain" }}
              />
              <div className="company-info">
                <h1>{company?.company_name || "Obsidian ERP"}</h1>
                {company?.address_html && <p>{company.address_html}</p>}
                {company?.phone_no && <p>Tel: {company.phone_no}</p>}
                {company?.email && <p>Email: {company.email}</p>}
              </div>
            </div>
            <div className="order-info">
              <h2>SALES ORDER</h2>
              <p className="order-id">{so.name}</p>
              <p>Date: {formatDate(so.transaction_date)}</p>
              {so.delivery_date && (
                <p>Delivery: {formatDate(so.delivery_date)}</p>
              )}
            </div>
          </div>

          <div className="parties">
            <div className="party">
              <p className="party-label">Bill To</p>
              <h3>{so.customer_name || so.customer}</h3>
              {addressDoc && (
                <>
                  {addressDoc.address_line1 && (
                    <p>{addressDoc.address_line1}</p>
                  )}
                  {addressDoc.address_line2 && (
                    <p>{addressDoc.address_line2}</p>
                  )}
                  <p>
                    {[addressDoc.city, addressDoc.state, addressDoc.pincode]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  {addressDoc.country && <p>{addressDoc.country}</p>}
                </>
              )}
            </div>
            <div className="party">
              <p className="party-label">Contact</p>
              {contactDoc ? (
                <>
                  <h3>
                    {contactDoc.first_name} {contactDoc.last_name}
                  </h3>
                  {contactDoc.email_id && <p>Email: {contactDoc.email_id}</p>}
                  {(contactDoc.phone || contactDoc.mobile_no) && (
                    <p>Phone: {contactDoc.phone || contactDoc.mobile_no}</p>
                  )}
                </>
              ) : (
                <p>—</p>
              )}
            </div>
          </div>

          <table className="items-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Item / Service</th>
                <th>Description</th>
                <th className="right">Qty</th>
                <th className="right">Rate</th>
                <th className="right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  <td>
                    <span className="item-name">{item.item_code}</span>
                    {item.item_name && item.item_name !== item.item_code && (
                      <div className="description">{item.item_name}</div>
                    )}
                  </td>
                  <td>
                    <span className="description">
                      {item.description || "—"}
                    </span>
                  </td>
                  <td className="right">
                    {item.qty} {item.uom || ""}
                  </td>
                  <td className="right">{formatCurrency(item.rate)}</td>
                  <td className="right">
                    {formatCurrency(item.amount || item.qty * item.rate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="totals">
            <div className="totals-row subtotal">
              <span>Subtotal</span>
              <span>{formatCurrency(so.total || 0)}</span>
            </div>
            {(so.total_taxes_and_charges ?? 0) > 0 && (
              <div className="totals-row">
                <span>Tax</span>
                <span>{formatCurrency(so.total_taxes_and_charges ?? 0)}</span>
              </div>
            )}
            <div className="totals-row grand">
              <span>Grand Total</span>
              <span>{formatCurrency(so.grand_total || 0)}</span>
            </div>
          </div>

          {so.terms && (
            <div className="terms">
              <h4>Terms & Conditions</h4>
              <p>{so.terms}</p>
            </div>
          )}

          <div className="footer">
            <p>Thank you for your business!</p>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Dialog */}
      <ConfirmDialog
        open={showSubmitDialog}
        onOpenChange={setShowSubmitDialog}
        title="Submit Sales Order"
        description="Once submitted, this order will be locked and processed. You won't be able to edit it. Continue?"
        confirmText="Submit"
        onConfirm={handleSubmit}
        loading={updateMutation.isPending}
      />

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        title="Cancel Sales Order"
        description="This action is permanent. The order will be cancelled and cannot be recovered. Continue?"
        confirmText="Cancel Order"
        variant="destructive"
        onConfirm={handleCancel}
        loading={updateMutation.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Sales Order"
        description={`Are you sure you want to delete "${so.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
      />
    </motion.div>
  );
}
