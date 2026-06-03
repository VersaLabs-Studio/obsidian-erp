// app/crm/contact/[name]/page.tsx
// Obsidian ERP v4.0 - Contact Detail Page
"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Edit,
  Trash2,
  MoreVertical,
  Mail,
  Phone,
  User,
  MapPin,
  Building2,
  ArrowUpRight,
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
import { getApiPath } from "@/lib/doctype-config";
import Link from "next/link";
import { InfoCard } from "@/components/ui/info-card";
import { DataPoint } from "@/components/ui/info-card"; // CRITICAL: Use DataPoint
import type { Contact } from "@/types/doctype-types";

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(params.name as string);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch contact data
  const {
    data: contact,
    isLoading,
    error,
  } = useFrappeDoc<Contact>("Contact", name);

  // Delete mutation
  const deleteMutation = useFrappeDelete("Contact", {
    onSuccess: () => router.push("/crm/contact"),
  });

  const handleDeleteConfirm = async () => {
    await deleteMutation.mutateAsync(name);
  };

  // Loading state
  if (isLoading) {
    return <LoadingState type="detail" />;
  }

  // Error state
  if (error || !contact) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Contact not found</p>
      </div>
    );
  }

  const displayName =
    contact.full_name ||
    `${contact.first_name || ""} ${contact.last_name || ""}`.trim() ||
    "Contact";

  return (
    <div className="space-y-6">
      <PageHeader
        title={displayName}
        subtitle={`ID: ${name}`}
        backHref="/crm/contact"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() =>
                router.push(`/crm/contact/${encodeURIComponent(name)}/edit`)
              }
            >
              <Edit className="h-4 w-4 mr-2" /> Edit
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="rounded-xl border-none shadow-xl bg-popover/95 backdrop-blur-xl p-1"
              >
                <DropdownMenuItem
                  className="rounded-lg text-destructive focus:text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Info */}
          <InfoCard title="Personal Information" icon="user">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DataPoint label="Full Name" value={contact.full_name} />
              <DataPoint label="Salutation" value={contact.salutation} />
              <DataPoint label="First Name" value={contact.first_name} />
              <DataPoint label="Middle Name" value={contact.middle_name} />
              <DataPoint label="Last Name" value={contact.last_name} />
              <DataPoint label="Gender" value={contact.gender} />
            </div>
          </InfoCard>

          {/* Contact Details */}
          <InfoCard title="Contact Details" icon="contact">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <DataPoint label="Email" value={contact.email_id} />
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <DataPoint label="Phone" value={contact.phone} />
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <DataPoint label="Mobile No" value={contact.mobile_no} />
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <DataPoint label="Address" value={contact.address} />
              </div>
            </div>
          </InfoCard>

          {/* Business Info */}
          <InfoCard title="Business Information" icon="briefcase">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <DataPoint label="Company Name" value={contact.company_name} />
              </div>
              <DataPoint label="Designation" value={contact.designation} />
              <DataPoint label="Department" value={contact.department} />
            </div>
          </InfoCard>
        </div>

        {/* Sidebar - 1 column */}
        <div className="space-y-6">
          {/* Status */}
          <InfoCard title="Status" variant="gradient">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge
                  variant={contact.status === "Open" ? "default" : "outline"}
                >
                  {contact.status}
                </Badge>
              </div>
              {contact.is_primary_contact === 1 && (
                <div className="p-3 bg-primary/10 rounded-xl text-center">
                  <p className="text-sm font-medium text-primary">
                    Primary Contact
                  </p>
                </div>
              )}
            </div>
          </InfoCard>

          {/* Linked Entities */}
          {contact.links && contact.links.length > 0 && (
            <InfoCard title="Linked To" icon="link">
              <div className="space-y-3">
                {(contact.links as any[]).map((link, idx) => {
                  const linkName = link.link_name;
                  const linkDoctype = link.link_doctype;
                  const apiPath = getApiPath(linkDoctype);
                  const href = `/${apiPath}/${encodeURIComponent(linkName)}`;

                  return (
                    <div
                      key={idx}
                      className="group flex items-center justify-between p-4 bg-secondary/20 rounded-2xl hover:bg-secondary/40 transition-all duration-300 border border-transparent hover:border-primary/10"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-background rounded-xl shadow-sm group-hover:scale-110 transition-transform duration-300">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-0.5">
                            {linkDoctype}
                          </p>
                          <p className="font-semibold text-sm">{linkName}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full hover:bg-primary hover:text-primary-foreground transform active:scale-90 transition-all"
                        asChild
                      >
                        <Link href={href}>
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  );
                })}
              </div>
            </InfoCard>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Contact"
        description={`Are you sure you want to delete "${displayName}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
