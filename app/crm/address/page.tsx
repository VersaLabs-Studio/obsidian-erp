// app/crm/address/page.tsx
// Obsidian ERP v4.0 - Addresses List Page
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
  MapPin,
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
import type { Address } from "@/types/doctype-types";
import { ListErrorState } from "@/components/ui/list-error-state";

// Address Type badge variant
function getAddressTypeVariant(
  type: string,
): "default" | "secondary" | "outline" {
  switch (type) {
    case "Billing":
      return "default";
    case "Shipping":
      return "secondary";
    default:
      return "outline";
  }
}

// Address Row Component
function AddressRow({
  address,
  index,
  onView,
  onEdit,
  onDelete,
}: {
  address: Address;
  index: number;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  // Extract linked entity name for display
  const linkedEntity =
    address.links && address.links.length > 0
      ? (address.links[0] as { link_doctype: string; link_name: string })
      : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group relative flex items-start justify-between p-4 mb-2 bg-card hover:bg-card/80 hover:shadow-lg transition-all duration-300 rounded-2xl cursor-pointer"
      onClick={onView}
    >
      {/* Address Info */}
      <div className="flex items-start gap-4 min-w-0 flex-1">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <MapPin className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground truncate">
              {address.address_title || address.address_line1}
            </h3>
            <Badge variant={getAddressTypeVariant(address.address_type)}>
              {address.address_type}
            </Badge>
            {address.is_primary_address === 1 && (
              <Badge variant="outline" className="text-xs">
                Primary
              </Badge>
            )}
            {address.is_shipping_address === 1 && (
              <Badge variant="outline" className="text-xs">
                Shipping
              </Badge>
            )}
          </div>

          <p className="text-sm text-muted-foreground truncate">
            {[address.address_line1, address.city, address.country]
              .filter(Boolean)
              .join(", ")}
          </p>

          {linkedEntity && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Building2 className="h-3 w-3" />
              <span>
                {linkedEntity.link_doctype}: {linkedEntity.link_name}
              </span>
            </div>
          )}
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
export default function AddressesListPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [deleteTarget, setDeleteTarget] = useState<Address | null>(null);

  // Fetch addresses
  const {
    data: addresses,
    isLoading,
    error,
  } = useFrappeList<Address>("Address", {
    orderBy: { field: "`tabAddress`.creation", order: "desc" },
    search,
    limit: 100,
  });

  // Delete mutation
  const deleteMutation = useFrappeDelete("Address", {
    onSuccess: () => setDeleteTarget(null),
  });

  // Filter
  const filteredAddresses = useMemo(() => {
    if (!addresses) return [];
    let result = addresses;

    if (typeFilter !== "all") {
      result = result.filter((a) => a.address_type === typeFilter);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.address_title?.toLowerCase().includes(searchLower) ||
          a.address_line1?.toLowerCase().includes(searchLower) ||
          a.city?.toLowerCase().includes(searchLower),
      );
    }

    return result;
  }, [addresses, search, typeFilter]);

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
        <ListErrorState error={error} label="addresses" />
      </div>
    );
  }

  // Type filter options
  const typeOptions = [
    { value: "all", label: "All Types" },
    { value: "Billing", label: "Billing" },
    { value: "Shipping", label: "Shipping" },
    { value: "Office", label: "Office" },
    { value: "Warehouse", label: "Warehouse" },
    { value: "Other", label: "Other" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Addresses"
        subtitle={`${filteredAddresses.length} total`}
        showSearch
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search addresses..."
        actions={
          <Button
            className="rounded-full"
            onClick={() => router.push("/crm/address/new")}
          >
            <Plus className="h-4 w-4 mr-2" /> New Address
          </Button>
        }
      />

      {/* Type Filter Pills */}
      <div className="flex gap-2 flex-wrap">
        {typeOptions.map((opt) => (
          <Button
            key={opt.value}
            variant={typeFilter === opt.value ? "default" : "outline"}
            size="sm"
            className="rounded-full"
            onClick={() => setTypeFilter(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {/* Address List */}
      {filteredAddresses.length === 0 ? (
        <EmptyState
          title="No addresses found"
          description={
            search || typeFilter !== "all"
              ? "Try adjusting your filters"
              : "Create your first address to get started"
          }
          action={
            <Button onClick={() => router.push("/crm/address/new")}>
              <Plus className="h-4 w-4 mr-2" /> New Address
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {filteredAddresses.map((address, index) => (
            <AddressRow
              key={address.name}
              address={address}
              index={index}
              onView={() =>
                router.push(`/crm/address/${encodeURIComponent(address.name)}`)
              }
              onEdit={() =>
                router.push(
                  `/crm/address/${encodeURIComponent(address.name)}/edit`,
                )
              }
              onDelete={() => setDeleteTarget(address)}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Address"
        description={`Are you sure you want to delete "${deleteTarget?.address_title || deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
