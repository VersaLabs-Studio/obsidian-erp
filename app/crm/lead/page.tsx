// app/crm/lead/page.tsx
// Obsidian ERP v4.0 — Leads List Page (Golden Template)
// KPI cards, StatusBadge, search, filter pills, card grid.
// Premium UI: OKLCH semantic tokens only, Framer Motion, elevation-first surfaces.

"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Eye,
  UserPlus,
  Mail,
  Phone,
  Building2,
  MapPin,
  Users,
  UserCheck,
  TrendingUp,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFrappeList, useFrappeDelete } from "@/hooks/generic";
import {
  PageHeader,
  EmptyState,
  LoadingState,
  ConfirmDialog,
} from "@/components/smart";
import { KPICard } from "@/components/dashboard/KPICard";
import { StatusBadge } from "@/components/smart/status-badge";
import type { Lead } from "@/types/doctype-types";
import { cn } from "@/lib/utils";
import { ListErrorState } from "@/components/ui/list-error-state";

function LeadCard({
  lead,
  index,
  onView,
  onEdit,
  onDelete,
}: {
  lead: Lead;
  index: number;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        "group relative bg-card rounded-2xl border border-border/50",
        "hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5",
        "transition-all duration-300 cursor-pointer overflow-hidden",
        "animate-slide-up",
      )}
      style={{ animationDelay: `${index * 40}ms` }}
      onClick={onView}
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-foreground tracking-tight truncate">
                {lead.lead_name || lead.first_name || "Unnamed Lead"}
              </h3>
            </div>
            {lead.company_name && (
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Building2 className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{lead.company_name}</span>
              </p>
            )}
          </div>
          <StatusBadge status={lead.status} size="sm" />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          {lead.source && (
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
                Source
              </p>
              <p className="text-sm font-medium text-foreground">{lead.source}</p>
            </div>
          )}
          {lead.territory && (
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
                Territory
              </p>
              <p className="text-sm font-medium text-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                {lead.territory}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {lead.email_id && (
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                <span className="truncate max-w-[120px]">{lead.email_id}</span>
              </span>
            )}
            {lead.mobile_no && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {lead.mobile_no}
              </span>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="rounded-xl border-border/50 shadow-xl bg-popover/95 backdrop-blur-xl p-1.5 min-w-[160px]"
            >
              <DropdownMenuItem
                className="rounded-lg cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onView();
                }}
              >
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem
                className="rounded-lg cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="rounded-lg cursor-pointer text-destructive focus:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

export default function LeadListPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);

  const {
    data: leads,
    isLoading,
    error,
  } = useFrappeList<Lead>("Lead", {
    fields: [
      "name",
      "lead_name",
      "company_name",
      "email_id",
      "mobile_no",
      "phone",
      "source",
      "territory",
      "status",
      "industry",
      "creation",
    ],
    orderBy: { field: "creation", order: "desc" },
    search,
    limit: 100,
  });

  const deleteMutation = useFrappeDelete("Lead", {
    onSuccess: () => setDeleteTarget(null),
  });

  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    if (statusFilter === "all") return leads;
    return leads.filter((l) => l.status === statusFilter);
  }, [leads, statusFilter]);

  const statusCounts = useMemo(() => {
    if (!leads) return {};
    return leads.reduce(
      (acc, l) => {
        acc[l.status] = (acc[l.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [leads]);

  const kpis = useMemo(() => {
    if (!leads) return { total: 0, open: 0, qualified: 0, converted: 0 };
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    return {
      total: leads.length,
      open: leads.filter((l) => ["Lead", "Open", "Replied"].includes(l.status)).length,
      qualified: leads.filter((l) => l.status === "Interested" || l.status === "Opportunity").length,
      converted: leads.filter(
        (l) => l.status === "Converted" && l.creation && l.creation >= monthStart,
      ).length,
    };
  }, [leads]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.name);
  };

  if (isLoading) return <LoadingState type="cards" count={6} />;
  if (error)
    return (
      <ListErrorState
        error={error}
        label="leads"
      />
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        subtitle={`${filteredLeads.length} lead${filteredLeads.length !== 1 ? "s" : ""}`}
        showSearch
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name, company, email..."
        actions={
          <Button
            className="rounded-full shadow-lg shadow-primary/20"
            onClick={() => router.push("/crm/lead/new")}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Lead
          </Button>
        }
      />

      {/* KPI Bar */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KPICard
          title="Total Leads"
          value={kpis.total}
          icon={Users}
          isLoading={isLoading}
        />
        <KPICard
          title="Open"
          value={kpis.open}
          icon={UserPlus}
          variant="warning"
          isLoading={isLoading}
        />
        <KPICard
          title="Qualified"
          value={kpis.qualified}
          icon={TrendingUp}
          variant="default"
          isLoading={isLoading}
        />
        <KPICard
          title="Converted (Month)"
          value={kpis.converted}
          icon={UserCheck}
          variant="success"
          isLoading={isLoading}
        />
      </div>

      {/* Status Filter Pills */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: "all", label: "All", count: leads?.length || 0 },
          { key: "Lead", label: "Lead", count: statusCounts.Lead || 0 },
          { key: "Open", label: "Open", count: statusCounts.Open || 0 },
          { key: "Replied", label: "Replied", count: statusCounts.Replied || 0 },
          { key: "Interested", label: "Interested", count: statusCounts.Interested || 0 },
          { key: "Opportunity", label: "Opportunity", count: statusCounts.Opportunity || 0 },
          { key: "Converted", label: "Converted", count: statusCounts.Converted || 0 },
          { key: "Do Not Contact", label: "Do Not Contact", count: statusCounts["Do Not Contact"] || 0 },
        ].map((status) => (
          <Button
            key={status.key}
            variant={statusFilter === status.key ? "default" : "outline"}
            size="sm"
            className={cn(
              "rounded-full gap-2 transition-all",
              statusFilter === status.key
                ? "shadow-lg shadow-primary/20"
                : "hover:bg-secondary/80",
            )}
            onClick={() => setStatusFilter(status.key)}
          >
            {status.label}
            <Badge
              variant="secondary"
              className={cn(
                "h-5 min-w-[20px] px-1.5 text-[10px] font-bold",
                statusFilter === status.key
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-secondary",
              )}
            >
              {status.count}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Leads Grid */}
      {!leads || leads.length === 0 ? (
        <EmptyState
          title="No leads found"
          description="Create your first lead to start tracking prospects"
          action={
            <Button
              onClick={() => router.push("/crm/lead/new")}
              className="rounded-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Lead
            </Button>
          }
        />
      ) : filteredLeads.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">No leads match this filter</p>
          <p className="text-sm mt-1">Try selecting a different status</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredLeads.map((lead, index) => (
            <LeadCard
              key={lead.name}
              lead={lead}
              index={index}
              onView={() =>
                router.push(`/crm/lead/${encodeURIComponent(lead.name)}`)
              }
              onEdit={() =>
                router.push(`/crm/lead/${encodeURIComponent(lead.name)}/edit`)
              }
              onDelete={() => setDeleteTarget(lead)}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Lead"
        description={`Are you sure you want to delete "${deleteTarget?.lead_name || deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
