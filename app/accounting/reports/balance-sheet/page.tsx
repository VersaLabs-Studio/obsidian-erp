// app/accounting/reports/balance-sheet/page.tsx
// Obsidian ERP v4.0 — Balance Sheet (2N Part 3.2, 2O Part 2).
//
// 2O Part 2: now passes `reportKey` only — the view owns the period
// state + the `useFrappeReport` hook + the refetch on period change.

"use client";

import { Scale } from "lucide-react";
import { FinancialReportView } from "@/components/accounting/FinancialReportView";

export default function BalanceSheetPage() {
  return (
    <FinancialReportView
      title="Balance Sheet"
      subtitle="Assets, liabilities, and equity as of today."
      icon={Scale}
      reportKey="balance-sheet"
      indented
    />
  );
}
