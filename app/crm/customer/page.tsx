// app/crm/customer/page.tsx
// Obsidian ERP v4.0 - Customers List Page
// @ts-nocheck

"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Building2,
  Mail,
  Phone,
  MapPin,
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
import type { Customer } from "@/types/doctype-types";

// Customer Row Component
function CustomerRow({
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
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group relative flex items-start justify-between p-4 mb-2 bg-card hover:bg-card/80 hover:shadow-lg transition-all duration-300 rounded-2xl cursor-pointer"
      onClick={onView}
    >
      {/* Customer Avatar & Info */}
      <div className="flex items-start gap-4 min-w-0 flex-1">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
          {customer.customer_name?.slice(0, 2).toUpperCase() || "CU"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground truncate">
              {customer.customer_name}
            </h3>
            {customer.customer_type && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                {customer.customer_type}
              </span>
            )}
          </div>

          {customer.customer_group && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
              <Building2 className="h-3 w-3" />
              <span className="truncate">{customer.customer_group}</span>
            </div>
          )}

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {customer.email_id && (
              <div className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                <span className="truncate max-w-[150px]">
                  {customer.email_id}
                </span>
              </div>
            )}
            {customer.mobile_no && (
              <div className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                <span>{customer.mobile_no}</span>
              </div>
            )}
            {customer.territory && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span>{customer.territory}</span>
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
    orderBy: { field: "`tabCustomer`.creation", order: "desc" },
    search,
    limit: 100,
  });

  // Delete mutation
  const deleteMutation = useFrappeDelete("Customer", {
    onSuccess: () => setDeleteTarget(null),
  });

  // Filter customers
  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    if (!search) return customers;
    const searchLower = search.toLowerCase();
    return customers.filter(
      (c) =>
        c.customer_name?.toLowerCase().includes(searchLower) ||
        c.customer_group?.toLowerCase().includes(searchLower) ||
        c.email_id?.toLowerCase().includes(searchLower),
    );
  }, [customers, search]);

  // Handlers
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.name);
  };

  // Loading state
  if (isLoading) {
    return <LoadingState type="list" count={6} />;
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Failed to load customers</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        subtitle={`${filteredCustomers.length} total`}
        showSearch
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search customers..."
        actions={
          <Button
            className="rounded-full"
            onClick={() => router.push("/crm/customer/new")}
          >
            <Plus className="h-4 w-4 mr-2" /> New Customer
          </Button>
        }
      />

      {/* Customer List */}
      {filteredCustomers.length === 0 ? (
        <EmptyState
          title="No customers found"
          description={
            search
              ? "Try adjusting your search"
              : "Create your first customer to get started"
          }
          action={
            <Button onClick={() => router.push("/crm/customer/new")}>
              <Plus className="h-4 w-4 mr-2" /> New Customer
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {filteredCustomers.map((customer, index) => (
            <CustomerRow
              key={customer.name}
              customer={customer}
              index={index}
              onView={() =>
                router.push(
                  `/crm/customer/${encodeURIComponent(customer.name)}`,
                )
              }
              onEdit={() =>
                router.push(
                  `/crm/customer/${encodeURIComponent(customer.name)}/edit`,
                )
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
        description={`Are you sure you want to delete "${deleteTarget?.customer_name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
