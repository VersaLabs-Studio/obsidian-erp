// app/sales/quotation/[name]/page.tsx
// Obsidian ERP v4.0 - Quotation Detail View (Professional Invoice Layout)
// @ts-nocheck

"use client";

import { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Printer,
  Share2,
  Edit,
  Trash2,
  Send,
  Ban,
  ShoppingCart,
  Building2,
  Phone,
  Mail,
  MoreVertical,
  Copy,
  Check,
  ExternalLink,
  AlertTriangle,
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
import type {
  Quotation,
  Address,
  Contact,
  Company,
} from "@/types/doctype-types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface QuotationItem {
  item_code: string;
  item_name?: string;
  description: string;
  qty: number;
  rate: number;
  amount: number;
  uom?: string;
}

// Status badge styles
const getStatusBadgeClasses = (status: string) => {
  switch (status) {
    case "Draft":
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
    case "Open":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300";
    case "Ordered":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300";
    case "Expired":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300";
    case "Cancelled":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
};

export default function QuotationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(params.name as string);
  const printRef = useRef<HTMLDivElement>(null);

  // Dialog States
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch Quotation
  const {
    data: quote,
    isLoading,
    refetch,
  } = useFrappeDoc<Quotation>("Quotation", name);

  // Fetch Company Details for print
  const { data: company } = useFrappeDoc<Company>(
    "Company",
    quote?.company || "",
    { enabled: !!quote?.company },
  );

  // Fetch Address Details
  const { data: addressDoc } = useFrappeDoc<Address>(
    "Address",
    quote?.customer_address || "",
    { enabled: !!quote?.customer_address },
  );

  // Fetch Contact Details
  const { data: contactDoc } = useFrappeDoc<Contact>(
    "Contact",
    quote?.contact_person || "",
    { enabled: !!quote?.contact_person },
  );

  // Mutations
  const updateMutation = useFrappeUpdate<{ data: Quotation }, any>(
    "Quotation",
    {
      onSuccess: () => {
        refetch();
        setShowSubmitDialog(false);
        setShowCancelDialog(false);
      },
    },
  );

  const deleteMutation = useFrappeDelete("Quotation", {
    onSuccess: () => router.push("/sales/quotation"),
  });

  // Loading State
  if (isLoading) return <LoadingState type="detail" />;
  if (!quote)
    return (
      <div className="p-8 text-center text-destructive">
        Quotation not found
      </div>
    );

  // Format Helpers
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ET", {
      style: "currency",
      currency: quote.currency || "ETB",
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

  // Status Logic
  const isExpired = quote.valid_till && new Date(quote.valid_till) < new Date();
  const displayStatus =
    quote.docstatus === 2
      ? "Cancelled"
      : isExpired && quote.status === "Open"
        ? "Expired"
        : quote.status || "Draft";

  const isDraft = quote.docstatus === 0;
  const isSubmitted = quote.docstatus === 1;
  const isCancelled = quote.docstatus === 2;
  const isOpen = quote.status === "Open" && isSubmitted;
  const isOrdered = quote.status === "Ordered";

  // Action Handlers
  const handleSubmit = async () => {
    await updateMutation.mutateAsync({
      name: quote.name,
      data: { docstatus: 1 },
    });
    toast.success("Quotation submitted successfully");
  };

  const handleCancel = async () => {
    await updateMutation.mutateAsync({
      name: quote.name,
      data: { docstatus: 2 },
    });
    toast.success("Quotation cancelled");
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(quote.name);
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
          <title>Quotation - ${quote.name}</title>
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
            .quote-info { text-align: right; }
            .quote-info h2 { font-size: 28px; font-weight: 700; color: #3b82f6; margin-bottom: 8px; }
            .quote-info p { font-size: 12px; color: #666; }
            .quote-info .quote-id { font-size: 14px; font-weight: 600; color: #1a1a1a; }
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
            .validity { background: #fff3cd; padding: 8px 12px; border-radius: 4px; font-size: 11px; color: #856404; display: inline-block; margin-top: 8px; }
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

  const handleCreateSalesOrder = () => {
    router.push(
      `/sales/sales-order/new?quotation=${encodeURIComponent(quote.name)}`,
    );
  };

  // Get items array
  const items = (quote.items || []) as unknown as QuotationItem[];

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title={quote.name}
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
            {isExpired && !isCancelled && displayStatus !== "Expired" && (
              <span className="text-amber-600 text-sm flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Expired
              </span>
            )}
          </div>
        }
        backHref="/sales/quotation"
        actions={
          <div className="flex gap-2 flex-wrap">
            {/* Draft Actions */}
            {isDraft && (
              <>
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() =>
                    router.push(
                      `/sales/quotation/${encodeURIComponent(name)}/edit`,
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

            {/* Submitted/Open Actions */}
            {isOpen && (
              <Button className="rounded-full" onClick={handleCreateSalesOrder}>
                <ShoppingCart className="h-4 w-4 mr-2" />
                Create Sales Order
              </Button>
            )}

            {/* Ordered */}
            {isOrdered && (
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => toast.info("View linked Sales Order")}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Sales Order
              </Button>
            )}

            {/* More Actions Dropdown (3 dots) */}
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
                      Cancel Quotation
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

      {/* Professional Invoice Card */}
      <div className="bg-card md:rounded-2xl shadow-lg border-y md:border border-border overflow-hidden mx-[-1rem] md:mx-0">
        {/* Invoice Header */}
        <div className="p-4 md:p-8 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6">
            <div className="w-full md:w-auto flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 relative overflow-hidden rounded-2xl shadow-sm border border-border bg-white p-2">
                  <img
                    src="/pana-logo.png"
                    alt="Obsidian ERP"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                    QUOTATION
                  </h1>
                  <p className="text-base md:text-lg font-mono text-primary mt-1">
                    {quote.name}
                  </p>
                </div>
              </div>
              {company && (
                <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <p className="font-semibold text-foreground text-base">
                    {company.company_name || "Obsidian ERP"}
                  </p>
                  {company.address && <p>{company.address}</p>}
                  {company.phone_no && <p>Tel: {company.phone_no}</p>}
                  {company.email && <p>Email: {company.email}</p>}
                </div>
              )}
            </div>
            <div className="w-full md:w-auto md:text-right">
              <div className="bg-secondary/50 rounded-xl p-4 w-full md:inline-block">
                <DataPoint
                  label="Date"
                  value={formatDate(quote.transaction_date)}
                />
                <div className="mt-3">
                  <DataPoint
                    label="Valid Till"
                    value={
                      <span
                        className={
                          isExpired ? "text-amber-600 font-semibold" : ""
                        }
                      >
                        {formatDate(quote.valid_till)}
                      </span>
                    }
                  />
                </div>
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
                {quote.customer_name || quote.party_name}
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
                {formatCurrency(quote.total || 0)}
              </span>
            </div>
            {quote.total_taxes_and_charges > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Tax ({quote.taxes_and_charges || "Applied"})
                </span>
                <span className="font-medium">
                  {formatCurrency(quote.total_taxes_and_charges)}
                </span>
              </div>
            )}
            {quote.discount_amount > 0 && (
              <div className="flex justify-between text-sm text-emerald-600">
                <span>Discount</span>
                <span>-{formatCurrency(quote.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-xl font-bold text-foreground border-t-2 border-foreground pt-3 mt-3">
              <span>Grand Total</span>
              <span className="text-primary">
                {formatCurrency(quote.grand_total || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Terms & Conditions */}
        {quote.terms && (
          <div className="p-4 md:p-8 border-t border-border">
            <h3 className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-3">
              Terms & Conditions
            </h3>
            <div className="text-sm text-muted-foreground whitespace-pre-wrap bg-secondary/20 p-4 rounded-xl">
              {quote.terms}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-8 border-t border-border text-center text-xs text-muted-foreground">
          <p>Thank you for your business!</p>
          <p className="mt-1">
            This quotation is valid until {formatDate(quote.valid_till)}.
          </p>
        </div>
      </div>

      {/* Hidden Print Template */}
      <div ref={printRef} className="hidden">
        <div className="print-container">
          <div className="header">
            <div className="flex items-start gap-4">
              <img
                src="/pana-logo.png"
                style={{ height: "60px", width: "60px", objectFit: "contain" }}
              />
              <div className="company-info">
                <h1>{company?.company_name || "Obsidian ERP"}</h1>
                {company?.address && <p>{company.address}</p>}
                {company?.phone_no && <p>Tel: {company.phone_no}</p>}
                {company?.email && <p>Email: {company.email}</p>}
              </div>
            </div>
            <div className="quote-info">
              <h2>QUOTATION</h2>
              <p className="quote-id">{quote.name}</p>
              <p>Date: {formatDate(quote.transaction_date)}</p>
              <p>Valid Until: {formatDate(quote.valid_till)}</p>
              {isExpired && (
                <p className="validity">⚠ This quotation has expired</p>
              )}
            </div>
          </div>

          <div className="parties">
            <div className="party">
              <p className="party-label">Bill To</p>
              <h3>{quote.customer_name || quote.party_name}</h3>
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
              <span>{formatCurrency(quote.total || 0)}</span>
            </div>
            {quote.total_taxes_and_charges > 0 && (
              <div className="totals-row">
                <span>Tax</span>
                <span>{formatCurrency(quote.total_taxes_and_charges)}</span>
              </div>
            )}
            <div className="totals-row grand">
              <span>Grand Total</span>
              <span>{formatCurrency(quote.grand_total || 0)}</span>
            </div>
          </div>

          {quote.terms && (
            <div className="terms">
              <h4>Terms & Conditions</h4>
              <p>{quote.terms}</p>
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
        title="Submit Quotation"
        description="Once submitted, this quotation will be locked and sent to the client. You won't be able to edit it. Continue?"
        confirmText="Submit"
        onConfirm={handleSubmit}
        loading={updateMutation.isPending}
      />

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        title="Cancel Quotation"
        description="This action is permanent. The quotation will be cancelled and cannot be recovered. Continue?"
        confirmText="Cancel Quotation"
        variant="destructive"
        onConfirm={handleCancel}
        loading={updateMutation.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Quotation"
        description={`Are you sure you want to delete "${quote.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
