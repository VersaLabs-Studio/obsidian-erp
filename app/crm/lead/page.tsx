// app/crm/lead/page.tsx
// @ts-nocheck
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFrappeList } from "@/hooks/generic";
import { PageHeader, EmptyState, LoadingState, StatusBadge } from "@/components/smart";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { Lead } from "@/types/doctype-types";

// ... Row Component (Standard Golden Template pattern) ...

export default function LeadsListPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const { data: leads, isLoading } = useFrappeList<Lead>("Lead", {
    filters: statusFilter ? [["status", "=", statusFilter]] : undefined,
    orderBy: { field: "creation", order: "desc" },
  });

  if (isLoading) return <LoadingState type="table" count={8} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        subtitle="Manage your potential customers"
        actions={
          <Button className="rounded-full" onClick={() => router.push("/crm/lead/new")}>
            <Plus className="h-4 w-4 mr-2" /> Add Lead
          </Button>
        }
      >
        {/* Status Filters */}
        <div className="flex gap-2 mt-4">
           {["Open", "Interested", "Converted"].map((status) => (
             <button
               key={status}
               onClick={() => setStatusFilter(status === statusFilter ? null : status)}
               className={`px-3 py-1 rounded-full text-sm transition-colors ${
                 statusFilter === status 
                   ? "bg-primary text-primary-foreground" 
                   : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
               }`}
             >
               {status}
             </button>
           ))}
        </div>
      </PageHeader>

      {/* List Implementation */}
      {leads && leads.length === 0 && <EmptyState title="No leads found" />}
      {/* Map leads to rows... use StatusBadge for status column */}
    </div>
  );
}