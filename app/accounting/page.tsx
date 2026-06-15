"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Calculator,
  Receipt,
  CreditCard,
  BookOpen,
  Settings,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowRight,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Wallet,
  Building,
  PieChart,
  History,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader, LoadingState } from "@/components/smart";
import { useFrappeList } from "@/hooks/generic";
import type {
  SalesInvoice,
  PurchaseInvoice,
  PaymentEntry,
} from "@/types/doctype-types";
import { cn } from "@/lib/utils";

const SHORTCUTS = [
  {
    title: "Sales Invoice",
    href: "/accounting/sales-invoice/new",
    icon: Receipt,
    color: "text-blue-600",
    bg: "bg-blue-100",
  },
  {
    title: "Purchase Invoice",
    href: "/accounting/purchase-invoice/new",
    icon: Receipt,
    color: "text-rose-600",
    bg: "bg-rose-100",
  },
  {
    title: "Payment Entry",
    href: "/accounting/payment-entry/new",
    icon: CreditCard,
    color: "text-emerald-600",
    bg: "bg-emerald-100",
  },
  {
    title: "Journal Entry",
    href: "/accounting/journal-entry/new",
    icon: BookOpen,
    color: "text-amber-600",
    bg: "bg-amber-100",
  },
];

export default function AccountingDashboardPage() {
  const router = useRouter();

  // Fetch data for stats
  const { data: salesInvoices, isLoading: loadingSales } =
    useFrappeList<SalesInvoice>("Sales Invoice", {
      fields: ["status", "outstanding_amount", "grand_total", "docstatus"],
    });

  const { data: purchaseInvoices, isLoading: loadingPurchase } =
    useFrappeList<PurchaseInvoice>("Purchase Invoice", {
      fields: ["status", "outstanding_amount", "grand_total", "docstatus"],
    });

  const { data: payments, isLoading: loadingPayments } =
    useFrappeList<PaymentEntry>("Payment Entry", {
      fields: ["payment_type", "paid_amount", "received_amount", "docstatus"],
      limit: 5,
      orderBy: { field: "posting_date", order: "desc" },
    });

  const stats = useMemo(() => {
    const receivable =
      salesInvoices?.reduce(
        (sum, inv) => sum + (inv.outstanding_amount || 0),
        0,
      ) || 0;
    const payable =
      purchaseInvoices?.reduce(
        (sum, inv) => sum + (inv.outstanding_amount || 0),
        0,
      ) || 0;
    const draftSales =
      salesInvoices?.filter((i) => i.docstatus === 0).length || 0;
    const draftPurchase =
      purchaseInvoices?.filter((i) => i.docstatus === 0).length || 0;

    return {
      receivable,
      payable,
      liquidity: receivable - payable,
      drafts: draftSales + draftPurchase,
    };
  }, [salesInvoices, purchaseInvoices]);

  if (loadingSales || loadingPurchase || loadingPayments)
    return <LoadingState type="detail" />;

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-20">
      <PageHeader
        title="Accounting Command Center"
        subtitle="Real-time financial visibility and operations"
        actions={
          <Button
            className="rounded-full shadow-lg h-10 px-6 font-bold bg-primary shadow-primary/20"
            onClick={() => router.push("/accounting/setup")}
          >
            <Settings className="h-4 w-4 mr-2" />
            Accounting Setup
          </Button>
        }
      />

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card rounded-2xl border border-border/50 p-8 shadow-sm flex flex-col justify-between group hover:shadow-xl transition-all duration-500">
          <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform">
            <ArrowDownLeft className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">
              Total Receivables
            </p>
            <h3 className="text-2xl font-black text-blue-600">
              ETB {stats.receivable.toLocaleString()}
            </h3>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border/50 p-8 shadow-sm flex flex-col justify-between group hover:shadow-xl transition-all duration-500">
          <div className="h-12 w-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-600 mb-6 group-hover:scale-110 transition-transform">
            <ArrowUpRight className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">
              Total Payables
            </p>
            <h3 className="text-2xl font-black text-rose-600">
              ETB {stats.payable.toLocaleString()}
            </h3>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border/50 p-8 shadow-sm flex flex-col justify-between group hover:shadow-xl transition-all duration-500">
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 mb-6 group-hover:scale-110 transition-transform">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">
              Net Position
            </p>
            <h3
              className={cn(
                "text-2xl font-black",
                stats.liquidity >= 0 ? "text-emerald-600" : "text-rose-600",
              )}
            >
              ETB {stats.liquidity.toLocaleString()}
            </h3>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border/50 p-8 shadow-sm flex flex-col justify-between group hover:shadow-xl transition-all duration-500">
          <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 mb-6 group-hover:scale-110 transition-transform">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">
              Pending Drafts
            </p>
            <h3 className="text-2xl font-black text-amber-600">
              {stats.drafts}
            </h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Quick Actions & Recent */}
        <div className="lg:col-span-8 space-y-10">
          <div className="space-y-6">
            <h3 className="font-black text-sm uppercase tracking-[0.2em] flex items-center gap-3">
              <Plus className="h-4 w-4 text-primary" /> Rapid Entry
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {SHORTCUTS.map((s) => (
                <button
                  key={s.href}
                  onClick={() => router.push(s.href)}
                  className="flex flex-col items-center gap-4 p-6 bg-card rounded-2xl border border-border/50 hover:border-primary/20 hover:shadow-xl transition-all group active:scale-95"
                >
                  <div
                    className={cn(
                      "h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform",
                      s.bg,
                    )}
                  >
                    <s.icon className={cn("h-7 w-7", s.color)} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-center leading-tight">
                    {s.title}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sm uppercase tracking-[0.2em] flex items-center gap-3">
                <History className="h-4 w-4 text-primary" /> Recent Payments
              </h3>
              <Button
                variant="link"
                className="text-xs font-bold"
                onClick={() => router.push("/accounting/payment-entry")}
              >
                View All Activity →
              </Button>
            </div>
            <div className="bg-card rounded-2xl border border-border/50 overflow-hidden shadow-sm">
              <div className="divide-y divide-border/50">
                {payments?.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground text-xs font-bold uppercase tracking-widest italic opacity-50">
                    No payment activity recorded yet
                  </div>
                ) : (
                  payments?.map((p, i) => (
                    <div
                      key={i}
                      className="p-6 flex items-center justify-between hover:bg-secondary/20 transition-colors cursor-pointer"
                      onClick={() =>
                        router.push(`/accounting/payment-entry/${p.name}`)
                      }
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={cn(
                            "h-10 w-10 rounded-xl flex items-center justify-center",
                            p.payment_type === "Receive"
                              ? "bg-emerald-100 text-emerald-600"
                              : "bg-rose-100 text-rose-600",
                          )}
                        >
                          {p.payment_type === "Receive" ? (
                            <ArrowDownLeft className="h-5 w-5" />
                          ) : (
                            <ArrowUpRight className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-sm tracking-tight">
                            {p.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-0.5">
                            {p.payment_type}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={cn(
                            "font-black",
                            p.payment_type === "Receive"
                              ? "text-emerald-600"
                              : "text-rose-600",
                          )}
                        >
                          {p.payment_type === "Receive" ? "+" : "-"} ETB{" "}
                          {(
                            p.received_amount ||
                            p.paid_amount ||
                            0
                          ).toLocaleString()}
                        </p>
                        <Badge
                          className={cn(
                            "text-[8px] font-black uppercase tracking-[0.1em] mt-1 border-0",
                            p.docstatus === 1
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-700",
                          )}
                        >
                          {p.docstatus === 1 ? "Finalized" : "Draft"}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Insights & Navigation */}
        <div className="lg:col-span-4 space-y-10">
          <div className="bg-primary text-primary-foreground rounded-2xl p-10 overflow-hidden relative group shadow-xl">
            <div className="absolute -right-20 -bottom-20 opacity-10 group-hover:scale-110 transition-transform duration-700">
              <PieChart className="w-64 h-64" />
            </div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary-foreground/40 mb-2">
              Accounting Setup
            </h3>
            <h2 className="text-2xl font-black mb-4">Centralized Control</h2>
            <p className="text-xs text-primary-foreground/60 leading-relaxed mb-8 font-medium">
              Configure your Chart of Accounts, Cost Centers, and Payment Terms
              from a single control point.
            </p>
            <Button
              className="w-full rounded-2xl bg-primary-foreground text-primary font-black hover:bg-primary-foreground/90 shadow-xl transition-all active:scale-[0.98]"
              onClick={() => router.push("/accounting/setup")}
            >
              Go to Settings →
            </Button>
          </div>

          <div className="space-y-6">
            <h3 className="font-black text-sm uppercase tracking-[0.2em] flex items-center gap-3">
              <PieChart className="h-4 w-4 text-primary" /> Reports
            </h3>
            <div className="space-y-3">
              {[
                {
                  title: "General Ledger",
                  desc: "Detailed account movements",
                  icon: BookOpen,
                },
                {
                  title: "Trial Balance",
                  desc: "Check ledger consistency",
                  icon: Calculator,
                },
                {
                  title: "Financial Statements",
                  desc: "Profit & Loss, Balance Sheet",
                  icon: Wallet,
                },
              ].map((r, i) => (
                <button
                  key={i}
                  className="w-full flex items-center gap-4 p-5 bg-card rounded-2xl border border-border/50 hover:border-primary/20 hover:shadow-lg transition-all text-left active:scale-[0.98]"
                >
                  <div className="h-10 w-10 rounded-xl bg-secondary/30 flex items-center justify-center text-primary shrink-0">
                    <r.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{r.title}</p>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                      {r.desc}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
