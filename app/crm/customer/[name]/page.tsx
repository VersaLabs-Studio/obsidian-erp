// app/crm/customer/[name]/page.tsx
// Pana ERP v3.0 - Customer Hub (Detail Page with Linked Addresses & Contacts)
// @ts-nocheck

"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Edit,
  Trash2,
  MoreVertical,
  FileDown,
  Plus,
  MapPin,
  User,
  ArrowUpRight,
  FileText,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// v3.0 Imports
import { useFrappeDoc, useFrappeList, useFrappeDelete } from "@/hooks/generic";
import {
  PageHeader,
  LoadingState,
  ConfirmDialog,
  EmptyState,
} from "@/components/smart";
import { InfoCard, DataPoint } from "@/components/ui/info-card";
import { getApiPath } from "@/lib/doctype-config";
import type { Customer, Address, Contact } from "@/types/doctype-types";

// Address Card Component
function AddressCard({ address }: { address: Address }) {
  return (
    <div className="group p-4 bg-secondary/20 rounded-2xl hover:bg-secondary/40 transition-all duration-300 border border-transparent hover:border-primary/10">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-background rounded-xl shadow-sm group-hover:scale-110 transition-transform duration-300">
            <MapPin className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="font-semibold text-sm">
                {address.address_title || address.address_line1}
              </p>
              <Badge variant="outline" className="text-xs">
                {address.address_type}
              </Badge>
              {address.is_primary_address === 1 && (
                <Badge variant="default" className="text-xs">
                  Primary
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {address.address_line1}
              {address.address_line2 && `, ${address.address_line2}`}
            </p>
            <p className="text-xs text-muted-foreground">
              {address.city}, {address.state && `${address.state}, `}
              {address.country}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full hover:bg-primary hover:text-primary-foreground"
          asChild
        >
          <Link
            href={`/${getApiPath("Address")}/${encodeURIComponent(
              address.name
            )}`}
          >
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

// Contact Card Component
function ContactCard({ contact }: { contact: Contact }) {
  return (
    <div className="group p-4 bg-secondary/20 rounded-2xl hover:bg-secondary/40 transition-all duration-300 border border-transparent hover:border-primary/10">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-background rounded-xl shadow-sm group-hover:scale-110 transition-transform duration-300">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="font-semibold text-sm">
                {contact.full_name ||
                  `${contact.first_name || ""} ${
                    contact.last_name || ""
                  }`.trim()}
              </p>
              {contact.is_primary_contact === 1 && (
                <Badge variant="default" className="text-xs">
                  Primary
                </Badge>
              )}
            </div>
            {contact.designation && (
              <p className="text-xs text-muted-foreground mb-1">
                {contact.designation}
              </p>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full hover:bg-primary hover:text-primary-foreground"
          asChild
        >
          <Link
            href={`/${getApiPath("Contact")}/${encodeURIComponent(
              contact.name
            )}`}
          >
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

// Main Page Component
export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(params.name as string);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch customer
  const {
    data: customer,
    isLoading,
    error,
  } = useFrappeDoc<Customer>("Customer", name);

  // Fetch ALL addresses and contacts (client-side filtering for now)
  const { data: allAddresses } = useFrappeList<Address>("Address", {
    limit: 500,
  });
  const { data: allContacts } = useFrappeList<Contact>("Contact", {
    limit: 500,
  });

  // Filter addresses linked to this customer
  const linkedAddresses = useMemo(() => {
    if (!allAddresses || !customer) return [];
    return allAddresses.filter((addr) =>
      (addr.links as any[])?.some(
        (link) =>
          link.link_doctype === "Customer" && link.link_name === customer.name
      )
    );
  }, [allAddresses, customer]);

  // Filter contacts linked to this customer
  const linkedContacts = useMemo(() => {
    if (!allContacts || !customer) return [];
    return allContacts.filter((contact) =>
      (contact.links as any[])?.some(
        (link) =>
          link.link_doctype === "Customer" && link.link_name === customer.name
      )
    );
  }, [allContacts, customer]);

  // Delete mutation
  const deleteMutation = useFrappeDelete("Customer", {
    onSuccess: () => router.push("/crm/customer"),
  });

  const handleDeleteConfirm = async () => {
    await deleteMutation.mutateAsync(name);
  };

  // Loading
  if (isLoading) {
    return <LoadingState type="detail" />;
  }

  // Error
  if (error || !customer) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Customer not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={customer.customer_name}
        subtitle={`${customer.customer_type} • ${customer.name}`}
        backHref="/crm/customer"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() =>
                router.push(`/crm/customer/${encodeURIComponent(name)}/edit`)
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
                className="rounded-2xl border-none shadow-xl bg-popover/90 backdrop-blur-xl p-2"
              >
                <DropdownMenuItem className="rounded-xl">
                  <FileDown className="h-4 w-4 mr-2" /> Export
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="rounded-xl text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      {/* Tabbed Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-secondary/30 rounded-full p-1">
          <TabsTrigger value="overview" className="rounded-full">
            Overview
          </TabsTrigger>
          <TabsTrigger value="addresses" className="rounded-full">
            Addresses ({linkedAddresses.length})
          </TabsTrigger>
          <TabsTrigger value="contacts" className="rounded-full">
            Contacts ({linkedContacts.length})
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Info */}
            <div className="lg:col-span-2 space-y-6">
              <InfoCard title="Customer Information" icon="user">
                <div className="grid grid-cols-2 gap-4">
                  <DataPoint
                    label="Customer Name"
                    value={customer.customer_name}
                  />
                  <DataPoint
                    label="Customer Type"
                    value={customer.customer_type}
                  />
                  <DataPoint
                    label="Customer Group"
                    value={customer.customer_group}
                  />
                  <DataPoint label="Territory" value={customer.territory} />
                  <DataPoint label="Industry" value={customer.industry} />
                  <DataPoint
                    label="Market Segment"
                    value={customer.market_segment}
                  />
                </div>
              </InfoCard>

              <InfoCard title="Contact Details" icon="contact">
                <div className="grid grid-cols-2 gap-4">
                  <DataPoint label="Email" value={customer.email_id} />
                  <DataPoint label="Mobile" value={customer.mobile_no} />
                  <DataPoint label="Website" value={customer.website} />
                  <DataPoint label="Tax ID" value={customer.tax_id} />
                </div>
              </InfoCard>

              {customer.customer_details && (
                <InfoCard title="Additional Details" icon="info">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {customer.customer_details}
                  </p>
                </InfoCard>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Stats */}
              <InfoCard title="Quick Stats" variant="gradient">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Addresses</span>
                    <span className="font-semibold">
                      {linkedAddresses.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Contacts</span>
                    <span className="font-semibold">
                      {linkedContacts.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge
                      variant={customer.disabled ? "destructive" : "default"}
                    >
                      {customer.disabled ? "Disabled" : "Active"}
                    </Badge>
                  </div>
                </div>
              </InfoCard>

              {/* From Lead */}
              {customer.lead_name && (
                <InfoCard title="Converted From" icon="link">
                  <div className="group flex items-center justify-between p-4 bg-secondary/20 rounded-2xl hover:bg-secondary/40 transition-all duration-300">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-background rounded-xl shadow-sm">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                          Lead
                        </p>
                        <p className="font-semibold text-sm">
                          {customer.lead_name}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full hover:bg-primary hover:text-primary-foreground"
                      asChild
                    >
                      <Link
                        href={`/${getApiPath("Lead")}/${encodeURIComponent(
                          customer.lead_name
                        )}`}
                      >
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </InfoCard>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Addresses Tab */}
        <TabsContent value="addresses" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Addresses</h2>
            <Button
              className="rounded-full"
              onClick={() =>
                router.push(
                  `/crm/address/new?link_doctype=Customer&link_name=${encodeURIComponent(
                    name
                  )}`
                )
              }
            >
              <Plus className="h-4 w-4 mr-2" /> Add Address
            </Button>
          </div>
          {linkedAddresses.length === 0 ? (
            <EmptyState
              title="No addresses"
              description="Add an address for this customer"
              action={
                <Button
                  onClick={() =>
                    router.push(
                      `/crm/address/new?link_doctype=Customer&link_name=${encodeURIComponent(
                        name
                      )}`
                    )
                  }
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Address
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {linkedAddresses.map((address) => (
                <AddressCard key={address.name} address={address} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Contacts</h2>
            <Button
              className="rounded-full"
              onClick={() =>
                router.push(
                  `/crm/contact/new?link_doctype=Customer&link_name=${encodeURIComponent(
                    name
                  )}`
                )
              }
            >
              <Plus className="h-4 w-4 mr-2" /> Add Contact
            </Button>
          </div>
          {linkedContacts.length === 0 ? (
            <EmptyState
              title="No contacts"
              description="Add a contact for this customer"
              action={
                <Button
                  onClick={() =>
                    router.push(
                      `/crm/contact/new?link_doctype=Customer&link_name=${encodeURIComponent(
                        name
                      )}`
                    )
                  }
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Contact
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {linkedContacts.map((contact) => (
                <ContactCard key={contact.name} contact={contact} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Customer"
        description={`Are you sure you want to delete "${customer.customer_name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
