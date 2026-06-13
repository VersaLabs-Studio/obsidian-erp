// app/accounting/reports/accounts-payable/page.tsx
// Obsidian ERP v4.0 — Accounts Payable (2N Part 3.2, 2O Part 2).
//
// 2O Part 2: now passes `reportKey` only — the view owns the period
// state + the `useFrappeReport` hook + the refetch on period change.

"use client";

import { ArrowUpRight } from "lucide-react";
import { FinancialReportView } from "@/components/accounting/FinancialReportView";

export default function AccountsPayablePage() {
  return (
    <FinancialReportView
      title="Accounts Payable"
      subtitle="Outstanding supplier bills with aging buckets."
      icon={ArrowUpRight}
      reportKey="accounts-payable"
      showAgingBuckets
    />
  );
}
