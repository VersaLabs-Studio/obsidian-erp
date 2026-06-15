// app/accounting/dashboard/page.tsx
// Obsidian ERP v4.0 — Accounting Hub (master §4.1, 2N Part 2.2,
// 2P-FINAL Part B).
//
// 2P-FINAL Part B — ONE SHELL, SIX CONFIGS. The hub renders through
// `DashboardShell` (via the `ModuleHub` compat shim) and passes the
// 2P-Part-4 AR/AP aging-bars chart as the `children` chart slot.
// The 2P-Part-4 chart logic is preserved; the wrapper just changes.
// The legacy `actions` quick-action grid is preserved for the 2N
// ship look.

"use client";

import { useMemo } from "react";
import {
  Calculator,
  FileText,
  CreditCard,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  BookOpen,
  type LucideIcon,
} from "lucide-react";
import { useFrappeList } from "@/hooks/generic";
import {
  ModuleHub,
  type HubKpi,
  type HubAction,
  type HubRecentItem,
  type HubAlert,
} from "@/components/dashboard/ModuleHub";
import { AgingBars, type AgingRow } from "@/components/dashboard/aging-bars";

const ETB = new Intl.NumberFormat("en-ET", {
  style: "currency",
  currency: "ETB",
  maximumFractionDigits: 0,
});

export default function AccountingDashboardPage() {
  // KPIs
  const { data: receivablesRows = [] } = useFrappeList<{
    outstanding_amount: number;
    due_date?: string;
    customer?: string;
  }>("Sales Invoice", {
    fields: ["outstanding_amount", "due_date", "customer"],
    filters: [["docstatus", "=", 1]],
    limit: 1000,
  });
  const { data: payablesRows = [] } = useFrappeList<{
    outstanding_amount: number;
    due_date?: string;
    supplier?: string;
  }>("Purchase Invoice", {
    fields: ["outstanding_amount", "due_date", "supplier"],
    filters: [["docstatus", "=", 1]],
    limit: 1000,
  });
  const { data: draftSIs = [] } = useFrappeList<{ name: string }>(
    "Sales Invoice",
    { fields: ["name"], filters: [["docstatus", "=", 0]], limit: 1 },
  );
  const { data: draftPEs = [] } = useFrappeList<{ name: string }>(
    "Payment Entry",
    { fields: ["name"], filters: [["docstatus", "=", 0]], limit: 1 },
  );

  // Recent
  const { data: recentPEs = [] } = useFrappeList<{
    name: string;
    party_type?: string;
    party?: string;
    payment_type: string;
    paid_amount: number;
    creation: string;
  }>("Payment Entry", {
    fields: ["name", "party_type", "party", "payment_type", "paid_amount", "creation"],
    orderBy: { field: "creation", order: "desc" },
    limit: 5,
  });

  const receivables = receivablesRows.reduce(
    (s, i) => s + (Number(i.outstanding_amount) || 0),
    0,
  );
  const payables = payablesRows.reduce(
    (s, i) => s + (Number(i.outstanding_amount) || 0),
    0,
  );

  const kpis: HubKpi[] = [
    {
      title: "Receivables",
      value: ETB.format(receivables),
      icon: ArrowDownLeft,
      variant: "success",
      href: "/accounting/sales-invoice",
    },
    {
      title: "Payables",
      value: ETB.format(payables),
      icon: ArrowUpRight,
      variant: "warning",
      href: "/accounting/purchase-invoice",
    },
    {
      title: "Draft Sales Invoices",
      value: draftSIs.length,
      icon: FileText,
      variant: "warning",
      href: "/accounting/sales-invoice",
    },
    {
      title: "Draft Payment Entries",
      value: draftPEs.length,
      icon: CreditCard,
      variant: "warning",
      href: "/accounting/payment-entry",
    },
  ];

  const actions: HubAction[] = [
    {
      label: "Sales Invoices",
      description: "Customer bills.",
      icon: FileText,
      href: "/accounting/sales-invoice",
    },
    {
      label: "Purchase Invoices",
      description: "Supplier bills.",
      icon: FileText,
      href: "/accounting/purchase-invoice",
    },
    {
      label: "Payment Entries",
      description: "Cash receipts and payments.",
      icon: CreditCard,
      href: "/accounting/payment-entry",
    },
    {
      label: "New Sales Invoice",
      description: "Bill a customer.",
      icon: Plus,
      href: "/accounting/sales-invoice/new",
      primary: true,
    },
  ];

  const recent: HubRecentItem[] = recentPEs.slice(0, 5).map((pe) => ({
    name: pe.name,
    subtitle: `${pe.party_type ?? ""}: ${pe.party ?? ""} · ${ETB.format(pe.paid_amount || 0)}`,
    badge: pe.payment_type,
    badgeVariant:
      pe.payment_type === "Receive" ? ("default" as const) : ("secondary" as const),
    href: `/accounting/payment-entry/${encodeURIComponent(pe.name)}`,
  }));

  const alerts: HubAlert[] = [
    {
      label: "Draft Sales Invoices",
      count: draftSIs.length,
      href: "/accounting/sales-invoice",
      variant: "warning",
    },
    {
      label: "Draft Payment Entries",
      count: draftPEs.length,
      href: "/accounting/payment-entry",
      variant: "warning",
    },
  ];

  // 2P-FINAL Part B — AR/AP aging stays as the chart (the handoff
  // table says "keep the AR/AP aging-bars (already built) — move it
  // into the shell"). The logic is preserved verbatim from 2P Part
  // 4; only the rendering location changes.
  const today = new Date().toISOString().split("T")[0] ?? "";
  const agingData = useMemo<AgingRow[]>(() => {
    function bucketFor(due: string | undefined): 0 | 1 | 2 | 3 {
      if (!due) return 0;
      const ms = new Date(today).getTime() - new Date(due).getTime();
      const days = Math.floor(ms / 86_400_000);
      if (days <= 30) return 0;
      if (days <= 60) return 1;
      if (days <= 90) return 2;
      return 3;
    }
    function topN<T extends { name: string; v: number }>(
      rows: T[],
      n: number,
    ): T[] {
      return [...rows]
        .sort((a, b) => b.v - a.v)
        .slice(0, n)
        .map((r) => r);
    }
    // Aggregate per-customer outstanding into the 4 buckets
    type Agg = { name: string; v: number; b0: number; b1: number; b2: number; b3: number };
    const recMap = new Map<string, Agg>();
    for (const r of receivablesRows) {
      const k = String(r.customer ?? "—");
      const amt = Number(r.outstanding_amount) || 0;
      if (amt <= 0) continue;
      const cur = recMap.get(k) ?? { name: k, v: 0, b0: 0, b1: 0, b2: 0, b3: 0 };
      cur.v += amt;
      const b = bucketFor(r.due_date);
      if (b === 0) cur.b0 += amt;
      else if (b === 1) cur.b1 += amt;
      else if (b === 2) cur.b2 += amt;
      else cur.b3 += amt;
      recMap.set(k, cur);
    }
    const supMap = new Map<string, Agg>();
    for (const r of payablesRows) {
      const k = String(r.supplier ?? "—");
      const amt = Number(r.outstanding_amount) || 0;
      if (amt <= 0) continue;
      const cur = supMap.get(k) ?? { name: k, v: 0, b0: 0, b1: 0, b2: 0, b3: 0 };
      cur.v += amt;
      const b = bucketFor(r.due_date);
      if (b === 0) cur.b0 += amt;
      else if (b === 1) cur.b1 += amt;
      else if (b === 2) cur.b2 += amt;
      else cur.b3 += amt;
      supMap.set(k, cur);
    }
    const top5Rec = topN([...recMap.values()], 5);
    const top5Sup = topN([...supMap.values()], 5);
    const rows: AgingRow[] = [];
    for (const a of top5Rec) {
      rows.push({
        label: a.name,
        bucket1: a.b0,
        bucket2: a.b1,
        bucket3: a.b2,
        bucket4: a.b3,
      });
    }
    for (const a of top5Sup) {
      rows.push({
        label: a.name,
        bucket1: a.b0,
        bucket2: a.b1,
        bucket3: a.b2,
        bucket4: a.b3,
      });
    }
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receivablesRows, payablesRows, today]);

  return (
    <ModuleHub
      title="Accounting Hub"
      subtitle="Invoices, payments, and reports."
      icon={Calculator}
      primaryAction={{
        label: "New Sales Invoice",
        href: "/accounting/sales-invoice/new",
      }}
      kpis={kpis}
      actions={actions}
      recent={recent}
      recentTitle="Recent payment entries"
      alerts={alerts}
    >
      {/* 2P-FINAL Part B — AR/AP aging chart, moved into the shell.
          Same AgingBars component (2P Part 4) — just relocated from
          a sibling div into the shell's children slot. The
          testid-on-page matches the other 5 hubs (the AgingBars
          component also carries `data-testid="aging-bars"`). */}
      <div data-testid="aging-chart">
        <AgingBars
          data={agingData}
          isLoading={false}
          title="Aging"
          subtitle="Top 5 customers + top 5 suppliers · outstanding"
        />
      </div>
      {/* 2N Part 3: Financial Reporting links (visible from the hub for
          easy navigation; the report pages themselves land in Part 3.2). */}
      <div className="mt-6 rounded-2xl border border-border/40 bg-card p-5 shadow-sm shadow-black/5 sm:p-6">
        <div className="mb-3 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">
            Financial reports
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Profit & Loss", href: "/accounting/reports/profit-and-loss" },
            { label: "Balance Sheet", href: "/accounting/reports/balance-sheet" },
            {
              label: "Accounts Receivable",
              href: "/accounting/reports/accounts-receivable",
            },
            {
              label: "Accounts Payable",
              href: "/accounting/reports/accounts-payable",
            },
          ].map((r) => (
            <a
              key={r.href}
              href={r.href}
              className="group flex items-center justify-between gap-2 rounded-xl border border-border/30 bg-secondary/20 px-3 py-2.5 text-xs font-medium text-foreground transition-all hover:border-primary/20 hover:bg-secondary/40"
            >
              {r.label}
              <Clock className="h-3 w-3 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
            </a>
          ))}
        </div>
      </div>
    </ModuleHub>
  );
}
