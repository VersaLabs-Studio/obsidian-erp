// app/srm/quotation/page.tsx
// Pana ERP v3.0 - Quotations List Page
// @ts-nocheck

"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Calendar, CalendarDays } from "lucide-react";
import { useFrappeList } from "@/hooks/generic";
import { PageHeader, EmptyState, LoadingState } from "@/components/smart";
import type { Quotation } from "@/types/doctype-types";

// Status Badge Colors
const getStatusVariant = (
  status: string
): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "Draft":
      return "secondary";
    case "Open":
      return "default";
    case "Ordered":
      return "default";
    case "Lost":
      return "destructive";
    case "Expired":
      return "outline";
    default:
      return "outline";
  }
};

export default function QuotationsListPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const {
    data: quotations,
    isLoading,
    error,
  } = useFrappeList<Quotation>("Quotation", {
    orderBy: { field: "transaction_date", order: "desc" },
    search,
    limit: 100,
  });

  // Filter
  const filteredQuotations = useMemo(() => {
    if (!quotations) return [];
    let result = quotations;
    if (statusFilter !== "all") {
      result = result.filter((q) => q.status === statusFilter);
    }
    return result;
  }, [quotations, statusFilter]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ET", {
      style: "currency",
      currency: "ETB",
    }).format(amount || 0);
  };

  if (isLoading) return <LoadingState type="list" count={6} />;
  if (error)
    return (
      <div className="p-4 text-destructive">Failed to load quotations</div>
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quotations"
        subtitle={`${filteredQuotations.length} total`}
        showSearch
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search ID, customer..."
        actions={
          <Button
            className="rounded-full"
            onClick={() => router.push("/sales/quotation/new")}
          >
            <Plus className="h-4 w-4 mr-2" /> New Quotation
          </Button>
        }
      />

      {/* Status Filter */}
      <div className="flex gap-2 flex-wrap">
        {["all", "Draft", "Open", "Ordered", "Lost", "Expired"].map(
          (status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              className="rounded-full capitalize"
              onClick={() => setStatusFilter(status)}
            >
              {status === "all" ? "All" : status}
            </Button>
          )
        )}
      </div>

      {!quotations || quotations.length === 0 ? (
        <EmptyState
          title="No quotations found"
          description="Create a new quotation for your customer"
          action={
            <Button onClick={() => router.push("/sales/quotation/new")}>
              Create Quotation
            </Button>
          }
        />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/30 border-b border-border">
              <tr>
                <th className="p-4 font-semibold text-foreground">ID</th>
                <th className="p-4 font-semibold text-foreground">Customer</th>
                <th className="p-4 font-semibold text-foreground">Date</th>
                <th className="p-4 font-semibold text-foreground">
                  Valid Till
                </th>
                <th className="p-4 font-semibold text-foreground text-right">
                  Total
                </th>
                <th className="p-4 font-semibold text-foreground">Status</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotations.map((q) => (
                <tr
                  key={q.name}
                  className="border-b border-border hover:bg-card/50 transition-colors cursor-pointer"
                  onClick={() =>
                    router.push(
                      `/sales/quotation/${encodeURIComponent(q.name)}`
                    )
                  }
                >
                  <td className="p-4 font-medium text-primary">{q.name}</td>
                  <td className="p-4">{q.customer_name}</td>
                  <td className="p-4">{q.transaction_date}</td>
                  <td className="p-4 flex items-center gap-2">
                    <CalendarDays className="h-3 w-3 text-muted-foreground" />
                    {q.valid_till}
                  </td>
                  <td className="p-4 text-right font-medium">
                    {formatCurrency(q.grand_total)}
                  </td>
                  <td className="p-4">
                    <Badge variant={getStatusVariant(q.status)}>
                      {q.status}
                    </Badge>
                  </td>
                  <td className="p-4 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(
                          `/sales/quotation/${encodeURIComponent(q.name)}/edit`
                        );
                      }}
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
