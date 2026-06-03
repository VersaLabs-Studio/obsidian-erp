// app/crm/lead/page.tsx
// Obsidian ERP v4.0 - Leads List Page
// @ts-nocheck

"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  UserPlus,
  Mail,
  Phone,
  Building2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// v3.0 Imports
import { useFrappeList, useFrappeDelete } from "@/hooks/generic";
import {
  PageHeader,
  EmptyState,
  LoadingState,
  ConfirmDialog,
} from "@/components/smart";
import type { Lead } from "@/types/doctype-types";

// Status badge variant mapping
function getStatusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "Converted":
      return "default";
    case "Interested":
    case "Opportunity":
    case "Quotation":
      return "secondary";
    case "Do Not Contact":
    case "Lost Quotation":
      return "destructive";
    default:
      return "outline";
  }
}

// Lead Row Component
function LeadRow({
  lead,
  index,
  onView,
  onEdit,
  onDelete,
  onConvert,
}: {
  lead: Lead;
  index: number;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onConvert: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group relative flex items-start justify-between p-4 mb-2 bg-card hover:bg-card/80 hover:shadow-lg transition-all duration-300 rounded-2xl cursor-pointer"
      onClick={onView}
    >
      {/* Lead Avatar & Info */}
      <div className="flex items-start gap-4 min-w-0 flex-1">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
          {lead.lead_name?.slice(0, 2).toUpperCase() || "LD"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground truncate">
              {lead.lead_name || lead.first_name || "Unnamed Lead"}
            </h3>
            <Badge variant={getStatusVariant(lead.status)}>{lead.status}</Badge>
          </div>

          {lead.company_name && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
              <Building2 className="h-3 w-3" />
              <span className="truncate">{lead.company_name}</span>
            </div>
          )}

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {lead.email_id && (
              <div className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                <span className="truncate max-w-[150px]">{lead.email_id}</span>
              </div>
            )}
            {lead.mobile_no && (
              <div className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                <span>{lead.mobile_no}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="rounded-xl border-none shadow-xl bg-popover/95 backdrop-blur-xl p-1"
        >
          <DropdownMenuItem
            className="rounded-lg"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <Pencil className="h-4 w-4 mr-2" /> Edit
          </DropdownMenuItem>
          {lead.status !== "Converted" && (
            <DropdownMenuItem
              className="rounded-lg"
              onClick={(e) => {
                e.stopPropagation();
                onConvert();
              }}
            >
              <UserPlus className="h-4 w-4 mr-2" /> Convert to Customer
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="rounded-lg text-destructive focus:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </motion.div>
  );
}

// Main Page Component
export default function LeadsListPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);

  // Fetch leads
  const {
    data: leads,
    isLoading,
    error,
  } = useFrappeList<Lead>("Lead", {
    orderBy: { field: "`tabLead`.creation", order: "desc" },
    search,
    limit: 100,
  });

  // Delete mutation
  const deleteMutation = useFrappeDelete("Lead", {
    onSuccess: () => setDeleteTarget(null),
  });

  // Filter by status
  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    let result = leads;

    if (statusFilter !== "all") {
      result = result.filter((l) => l.status === statusFilter);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.lead_name?.toLowerCase().includes(searchLower) ||
          l.company_name?.toLowerCase().includes(searchLower) ||
          l.email_id?.toLowerCase().includes(searchLower),
      );
    }

    return result;
  }, [leads, search, statusFilter]);

  // Handlers
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.name);
  };

  const handleConvertToCustomer = (lead: Lead) => {
    // Navigate to Customer create page with pre-filled Lead data
    const params = new URLSearchParams({
      from_lead: lead.name,
      customer_name: lead.company_name || lead.lead_name || "",
      mobile_no: lead.mobile_no || "",
      email_id: lead.email_id || "",
      territory: lead.territory || "",
    });
    router.push(`/crm/customer/new?${params.toString()}`);
  };

  // Loading state
  if (isLoading) {
    return <LoadingState type="list" count={6} />;
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Failed to load leads</p>
      </div>
    );
  }

  // Status options for filter
  const statusOptions = [
    { value: "all", label: "All Statuses" },
    { value: "Open", label: "Open" },
    { value: "Replied", label: "Replied" },
    { value: "Interested", label: "Interested" },
    { value: "Opportunity", label: "Opportunity" },
    { value: "Quotation", label: "Quotation" },
    { value: "Converted", label: "Converted" },
    { value: "Do Not Contact", label: "Do Not Contact" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        subtitle={`${filteredLeads.length} total`}
        showSearch
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search leads..."
        actions={
          <Button
            className="rounded-full"
            onClick={() => router.push("/crm/lead/new")}
          >
            <Plus className="h-4 w-4 mr-2" /> New Lead
          </Button>
        }
      />

      {/* Status Filter Pills */}
      <div className="flex gap-2 flex-wrap">
        {statusOptions.map((opt) => (
          <Button
            key={opt.value}
            variant={statusFilter === opt.value ? "default" : "outline"}
            size="sm"
            className="rounded-full"
            onClick={() => setStatusFilter(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {/* Lead List */}
      {filteredLeads.length === 0 ? (
        <EmptyState
          title="No leads found"
          description={
            search || statusFilter !== "all"
              ? "Try adjusting your filters"
              : "Create your first lead to get started"
          }
          action={
            <Button onClick={() => router.push("/crm/lead/new")}>
              <Plus className="h-4 w-4 mr-2" /> New Lead
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {filteredLeads.map((lead, index) => (
            <LeadRow
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
              onConvert={() => handleConvertToCustomer(lead)}
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
