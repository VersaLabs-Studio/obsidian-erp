// app/crm/lead/[name]/page.tsx
// Obsidian ERP v4.0 - Lead Detail Page (Schema-Driven Architecture)
"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Edit,
  Trash2,
  MoreVertical,
  UserPlus,
  Mail,
  Phone,
  Building2,
  MapPin,
  Globe,
  Calendar,
  User,
  Hash,
  Activity,
  Tag,
  ShieldAlert,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// v3.0 Imports
import { useFrappeDoc, useFrappeDelete } from "@/hooks/generic";
import { PageHeader, LoadingState, ConfirmDialog } from "@/components/smart";
import { InfoCard, DataPoint, StatCard } from "@/components/ui/info-card";
import type { Lead } from "@/types/doctype-types";
import { cn } from "@/lib/utils";

/**
 * Lead status badge variant mapping
 */
function getStatusVariant(
  status: string
): "success" | "warning" | "destructive" | "default" {
  switch (status) {
    case "Converted":
      return "success";
    case "Interested":
    case "Opportunity":
    case "Quotation":
      return "warning";
    case "Do Not Contact":
    case "Lost Quotation":
      return "destructive";
    default:
      return "default";
  }
}

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(params.name as string);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch lead data
  const { data: lead, isLoading, error } = useFrappeDoc<Lead>("Lead", name);

  // Delete mutation
  const deleteMutation = useFrappeDelete("Lead", {
    onSuccess: () => router.push("/crm/lead"),
    successMessage: "Lead deleted successfully",
  });

  const handleDeleteConfirm = async () => {
    await deleteMutation.mutateAsync(name);
  };

  const handleConvertToCustomer = () => {
    if (!lead) return;

    // Navigate to Customer create page with pre-filled Lead data
    const queryParams = new URLSearchParams({
      from_lead: lead.name,
      customer_name: lead.company_name || lead.lead_name || "",
      mobile_no: lead.mobile_no || "",
      email_id: lead.email_id || "",
      territory: lead.territory || "",
    });
    router.push(`/crm/customer/new?${queryParams.toString()}`);
  };

  // Loading state
  if (isLoading) {
    return <LoadingState type="detail" />;
  }

  // Error state
  if (error || !lead) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive font-bold">Lead not found</p>
      </div>
    );
  }

  const isConverted = lead.status === "Converted";
  const displayName = lead.lead_name || lead.name;
  const statusVariant = getStatusVariant(lead.status);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <PageHeader
        title={displayName}
        subtitle={`ID: ${lead.name}`}
        backUrl="/crm/lead"
        status={{
          label: lead.status,
          variant: statusVariant,
        }}
        actions={
          <div className="flex items-center gap-2">
            {/* Convert to Customer - Primary Action */}
            {!isConverted && (
              <Button
                className="rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300"
                onClick={handleConvertToCustomer}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Create Customer
              </Button>
            )}

            <Button
              variant="outline"
              className="rounded-full hover:bg-secondary transition-colors"
              onClick={() =>
                router.push(`/crm/lead/${encodeURIComponent(name)}/edit`)
              }
            >
              <Edit className="h-4 w-4 mr-2" /> Edit
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full hover:bg-secondary"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="rounded-2xl border-none shadow-xl bg-popover/90 backdrop-blur-xl p-2 w-48"
              >
                <DropdownMenuItem
                  className="rounded-xl text-destructive focus:bg-destructive/10 focus:text-destructive transition-colors"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete Lead
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Content - 8 columns */}
        <div className="lg:col-span-8 space-y-8">
          {/* Lead Information */}
          <InfoCard
            title={
              <span className="flex items-center gap-2">
                <User className="h-4 w-4" /> Personal Information
              </span>
            }
            delay={100}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
              <DataPoint label="Full Name" value={lead.lead_name} />
              <DataPoint label="Job Title" value={lead.job_title} />
              <DataPoint label="First Name" value={lead.first_name} />
              <DataPoint label="Last Name" value={lead.last_name} />
            </div>
          </InfoCard>

          {/* Organization */}
          <InfoCard
            title={
              <span className="flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Organization Details
              </span>
            }
            delay={200}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
              <DataPoint label="Company" value={lead.company_name} />
              <DataPoint label="Industry" value={lead.industry} />
              <DataPoint label="Territory" value={lead.territory} />
              <DataPoint
                label="No. of Employees"
                value={lead.no_of_employees}
              />
            </div>
          </InfoCard>

          {/* Contact Information */}
          <InfoCard
            title={
              <span className="flex items-center gap-2">
                <Mail className="h-4 w-4" /> Contact & Location
              </span>
            }
            delay={300}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
              <DataPoint
                label="Email Address"
                value={lead.email_id}
                className="col-span-1"
              />
              <DataPoint label="Mobile Number" value={lead.mobile_no} />
              <DataPoint label="Phone" value={lead.phone} />
              <DataPoint label="Website" value={lead.website} />

              <div className="md:col-span-2 pt-4 border-t border-border/50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <DataPoint label="City" value={lead.city} />
                  <DataPoint label="State" value={lead.state} />
                  <DataPoint label="Country" value={lead.country} />
                </div>
              </div>
            </div>
          </InfoCard>
        </div>

        {/* Sidebar - 4 columns */}
        <div className="lg:col-span-4 space-y-8">
          {/* Status Card */}
          <InfoCard
            title={
              <span className="flex items-center gap-2">
                <Activity className="h-4 w-4" /> Current Status
              </span>
            }
            variant="gradient"
            delay={400}
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Lead Lifecycle
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    "rounded-full px-4 py-1 border-none font-bold uppercase tracking-tighter",
                    statusVariant === "success" &&
                      "bg-emerald-500/10 text-emerald-600",
                    statusVariant === "warning" &&
                      "bg-amber-500/10 text-amber-600",
                    statusVariant === "destructive" &&
                      "bg-destructive/10 text-destructive",
                    statusVariant === "default" &&
                      "bg-secondary text-muted-foreground"
                  )}
                >
                  {lead.status}
                </Badge>
              </div>
              {isConverted && (
                <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/20 text-center animate-in fade-in zoom-in-95 duration-500">
                  <ShieldAlert className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-bold text-emerald-700">
                    Converted to Customer
                  </p>
                </div>
              )}
            </div>
          </InfoCard>

          {/* Classification */}
          <InfoCard
            title={
              <span className="flex items-center gap-2">
                <Tag className="h-4 w-4" /> Classification
              </span>
            }
            delay={500}
          >
            <div className="space-y-6">
              <StatCard
                label="Lead Type"
                value={lead.type}
                valueClassName="text-sm font-bold"
              />
              <div className="grid grid-cols-1 gap-4">
                <DataPoint label="Request Type" value={lead.request_type} />
                <DataPoint label="Source" value={lead.source} />
                <DataPoint label="Campaign" value={lead.campaign_name} />
              </div>
            </div>
          </InfoCard>

          {/* System Info */}
          <InfoCard
            title={
              <span className="flex items-center gap-2 text-xs">
                <Hash className="h-3 w-3" /> System Trace
              </span>
            }
            variant="transparent"
            delay={600}
          >
            <div className="space-y-4 text-xs text-muted-foreground/80">
              <div className="flex justify-between items-center bg-secondary/20 p-2 rounded-lg">
                <span className="flex items-center gap-1.5 font-medium">
                  <Calendar className="h-3 w-3" /> Created
                </span>
                <span className="font-mono">
                  {lead.creation
                    ? new Date(lead.creation).toLocaleDateString()
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center bg-secondary/10 p-2 rounded-lg">
                <span className="flex items-center gap-1.5 font-medium">
                  <Activity className="h-3 w-3" /> Modified
                </span>
                <span className="font-mono">
                  {lead.modified
                    ? new Date(lead.modified).toLocaleDateString()
                    : "—"}
                </span>
              </div>
              <DataPoint
                label="Lead Owner"
                value={lead.lead_owner}
                className="pt-2"
              />
            </div>
          </InfoCard>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Lead"
        description={`Are you sure you want to delete "${displayName}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
