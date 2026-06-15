// app/crm/customer/page.tsx
// Obsidian ERP v4.0 - Customers List Page (Premium Card Design)

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
  Building2,
  Mail,
  Phone,
  MapPin,
  Eye,
  ArrowRight,
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
import { StatusBadge } from "@/components/smart/status-badge";
import type { Customer } from "@/types/doctype-types";
import { cn } from "@/lib/utils";

function CustomerCard({
  customer,
  index,
  onView,
  onEdit,
  onDelete,
}: {
  customer: Customer;
  index: number;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const displayStatus = customer.disabled ? "disabled" : "active";

  return (
    <div
      className={cn(
        "group relative bg-card rounded-2xl border border-border/50",
        "hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5",
        "transition-all duration-300 cursor-pointer overflow-hidden",
        "animate-slide-up"
      )}
      style={{ animationDelay: `${index * 45}ms` }}
      onClick={onView}
    >
      <div className="p-5">
        {/* Header Row */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary flex-shrink-0">
              {customer.customer_name?.slice(0, 2).toUpperCase() || "CU"}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-base text-foreground tracking-tight truncate group-hover:text-primary transition-colors">
                {customer.customer_name}
              </h3>
              <p className="text-xs text-muted-foreground">
                {customer.customer_type || "Company"}
              </p>
            </div>
          </div>

          <StatusBadge status={displayStatus} size="sm" />
        </div>

        {/* Info Fields */}
        <div className="space-y-2 mb-4 text-sm text-muted-foreground">
          {customer.customer_group && (
            <div className="flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground/75" />
              <span className="truncate">{customer.customer_group}</span>
            </div>
          )}
          {customer.email_id && (
            <div className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-muted-foreground/75" />
              <span className="truncate">{customer.email_id}</span>
            </div>
          )}
          {customer.mobile_no && (
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-muted-foreground/75" />
              <span>{customer.mobile_no}</span>
            </div>
          )}
          {customer.territory && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground/75" />
              <span>{customer.territory}</span>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <span className="text-xs font-mono text-muted-foreground">
            {customer.name}
          </span>

          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="rounded-xl border-border/50 shadow-xl bg-popover/95 backdrop-blur-xl p-1.5 min-w-[140px]"
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

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-xl text-primary"
              onClick={(e) => {
                e.stopPropagation();
                onView();
              }}
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CustomersListPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);

  // Fetch customers
  const {
    data: customers,
    isLoading,
    error,
  } = useFrappeList<Customer>("Customer", {
    fields: [
      "name",
      "customer_name",
      "customer_type",
      "customer_group",
      "territory",
      "email_id",
      "mobile_no",
      "disabled",
    ],
    orderBy: { field: "creation", order: "desc" },
    search,
    limit: 100,
  });

  const deleteMutation = useFrappeDelete("Customer", {
    onSuccess: () => setDeleteTarget(null),
  });

  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    return customers;
  }, [customers]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.name);
  };

  if (isLoading) return <LoadingState type="cards" count={6} />;
  if (error)
    return (
      <div className="p-8 text-center text-destructive bg-destructive/5 rounded-xl border border-destructive/20">
        Failed to load customers
      </div>
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        subtitle={`${filteredCustomers.length} customer${
          filteredCustomers.length !== 1 ? "s" : ""
        }`}
        showSearch
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search customers..."
        actions={
          <Button
            className="rounded-full shadow-lg shadow-primary/20"
            onClick={() => router.push("/crm/customer/new")}
          >
            <Plus className="h-4 w-4 mr-2" /> New Customer
          </Button>
        }
      />

      {/* Customer List Card Grid */}
      {filteredCustomers.length === 0 ? (
        <EmptyState
          title="No customers found"
          description={
            search
              ? "Try adjusting your search criteria"
              : "Create your first customer to get started"
          }
          action={
            <Button
              onClick={() => router.push("/crm/customer/new")}
              className="rounded-full"
            >
              <Plus className="h-4 w-4 mr-2" /> New Customer
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredCustomers.map((customer, index) => (
            <CustomerCard
              key={customer.name}
              customer={customer}
              index={index}
              onView={() =>
                router.push(`/crm/customer/${encodeURIComponent(customer.name)}`)
              }
              onEdit={() =>
                router.push(`/crm/customer/${encodeURIComponent(customer.name)}/edit`)
              }
              onDelete={() => setDeleteTarget(customer)}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Customer"
        description={`Are you sure you want to delete customer "${deleteTarget?.customer_name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
