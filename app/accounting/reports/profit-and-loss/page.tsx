// app/accounting/reports/profit-and-loss/page.tsx
// Obsidian ERP v4.0 — Profit & Loss Statement (2N Part 3.2, 2O Part 2).
//
// 2O Part 2: now passes `reportKey` only — the view owns the period
// state + the `useFrappeReport` hook + the refetch on period change.

"use client";

import { TrendingUp } from "lucide-react";
import { FinancialReportView } from "@/components/accounting/FinancialReportView";

export default function ProfitAndLossPage() {
  return (
    <FinancialReportView
      title="Profit & Loss"
      subtitle="Revenue, costs, and net profit for the period."
      icon={TrendingUp}
      reportKey="profit-and-loss"
      indented
    />
  );
}
