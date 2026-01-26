"use client";

import { PageHeader } from "@/components/smart/page-header";
import { AccountingDashboard } from "@/components/accounting/accounting-dashboard";
import { Button } from "@/components/ui/button";
import { Plus, Download, Filter } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AccountingDashboardPage() {
  const router = useRouter();

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      <PageHeader
        label="Accounting"
        title="Financial Command Center"
        subtitle="Real-time financial performance and control"
        actions={
          <div className="flex items-center gap-3">
            <Button variant="outline" className="rounded-full bg-card">
              <Download className="w-4 h-4 mr-2" /> Export
            </Button>
            <Button
              className="rounded-full"
              onClick={() => router.push("/accounting/sales-invoice/new")}
            >
              <Plus className="w-4 h-4 mr-2" /> New Invoice
            </Button>
          </div>
        }
      />

      <AccountingDashboard />
    </div>
  );
}
