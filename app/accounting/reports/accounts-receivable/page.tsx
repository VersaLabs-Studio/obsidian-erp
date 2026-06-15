// app/accounting/reports/accounts-receivable/page.tsx
// Obsidian ERP v4.0 — Accounts Receivable (2N Part 3.2, 2O Part 2).
//
// 2O Part 2: now passes `reportKey` only — the view owns the period
// state + the `useFrappeReport` hook + the refetch on period change.

"use client";

import { ArrowDownLeft } from "lucide-react";
import { FinancialReportView } from "@/components/accounting/FinancialReportView";

export default function AccountsReceivablePage() {
  return (
    <FinancialReportView
      title="Accounts Receivable"
      subtitle="Outstanding customer invoices with aging buckets."
      icon={ArrowDownLeft}
      reportKey="accounts-receivable"
      showAgingBuckets
    />
  );
}
