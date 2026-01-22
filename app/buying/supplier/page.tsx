// @ts-nocheck
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
  Search,
  Building2,
  MapPin,
  Tag,
  Eye,
  ArrowUpRight,
  User,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useFrappeList, useFrappeDelete } from "@/hooks/generic";
import {
  PageHeader,
  LoadingState,
  EmptyState,
  ConfirmDialog,
} from "@/components/smart";
import type { Supplier } from "@/types/doctype-types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function SupplierCard({ supplier, index, onView, onEdit, onDelete }) {
  const isDisabled = supplier.disabled === 1;

  return (
    <div
      className={cn(
        "group relative bg-card rounded-[2rem] border border-border/50 p-6",
        "hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20",
        "transition-all duration-300 cursor-pointer animate-in fade-in slide-in-from-bottom-4",
      )}
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={onView}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-xl shadow-inner border border-primary/5 group-hover:bg-primary group-hover:text-white transition-all duration-500">
            {supplier.supplier_name?.charAt(0).toUpperCase() || "S"}
          </div>
          <div>
            <h3 className="font-bold text-foreground group-hover:text-primary transition-colors tracking-tight">
              {supplier.supplier_name}
            </h3>
            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-tighter">
              {supplier.name}
            </p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hover:bg-primary/5"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-2xl p-2">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onView();
              }}
              className="rounded-xl"
            >
              <Eye className="h-4 w-4 mr-2" /> View Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="rounded-xl"
            >
              <Pencil className="h-4 w-4 mr-2" /> Edit Details
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="rounded-xl text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Info Grid */}
      <div className="space-y-3 mb-5">
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-secondary/30 border border-border/50 group-hover:bg-secondary/50 transition-colors">
          <Tag className="h-3.5 w-3.5 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-[9px] uppercase font-black text-muted-foreground tracking-widest mb-0.5">
              Group
            </p>
            <p className="text-[11px] font-bold truncate">
              {supplier.supplier_group}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/20 px-3 py-2 rounded-xl">
            <MapPin className="h-3 w-3" />
            <span className="truncate font-medium">
              {supplier.country || "Ethiopia"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/20 px-3 py-2 rounded-xl">
            <User className="h-3 w-3" />
            <span className="truncate font-medium">
              {supplier.supplier_type}
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-border/50 flex justify-between items-center">
        <Badge
          className={cn(
            "rounded-full text-[10px] font-black px-3 border-0 shadow-sm",
            isDisabled
              ? "bg-red-500/10 text-red-600"
              : "bg-emerald-500/10 text-emerald-600",
          )}
        >
          {isDisabled ? (
            <ShieldAlert className="h-3 w-3 mr-1.5" />
          ) : (
            <ShieldCheck className="h-3 w-3 mr-1.5" />
          )}
          {isDisabled ? "DISABLED" : "ACTIVE"}
        </Badge>
        <div className="h-8 w-8 rounded-full flex items-center justify-center bg-secondary/50 text-muted-foreground group-hover:bg-primary group-hover:text-white transition-all">
          <ArrowUpRight className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

// Dummy import to satisfy DropdownMenu usage
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function SupplierListPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const {
    data: suppliers,
    isLoading,
    refetch,
  } = useFrappeList<Supplier>("Supplier", {
    fields: [
      "name",
      "supplier_name",
      "supplier_group",
      "supplier_type",
      "country",
      "disabled",
      "creation",
    ],
    orderBy: { field: "creation", order: "desc" },
    limit: 100,
  });

  const deleteMutation = useFrappeDelete("Supplier", {
    onSuccess: () => {
      toast.success("Supplier deleted successfully");
      refetch();
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const filtered = useMemo(() => {
    if (!suppliers) return [];
    return suppliers.filter(
      (s) =>
        s.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.name?.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [suppliers, searchTerm]);

  if (isLoading) return <LoadingState type="list" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suppliers"
        subtitle="Manage vendor relationships and supply network"
        primaryAction={{
          label: "Add Supplier",
          onClick: () => router.push("/buying/supplier/new"),
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      {/* Search */}
      <div className="bg-card rounded-[2rem] border border-border/50 p-2 shadow-sm flex items-center gap-2">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Search by supplier name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-11 h-12 rounded-[1.5rem] bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No suppliers found"
          description={
            searchTerm
              ? "No vendors match your search"
              : "Register your first supplier to start procurement activities"
          }
          action={
            searchTerm
              ? undefined
              : {
                  label: "New Supplier",
                  onClick: () => router.push("/buying/supplier/new"),
                }
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((supplier, idx) => (
            <SupplierCard
              key={supplier.name}
              supplier={supplier}
              index={idx}
              onView={() =>
                router.push(
                  `/buying/supplier/${encodeURIComponent(supplier.name)}`,
                )
              }
              onEdit={() =>
                router.push(
                  `/buying/supplier/${encodeURIComponent(supplier.name)}/edit`,
                )
              }
              onDelete={() => setDeleteTarget(supplier.name)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Supplier?"
        description="This action cannot be undone if the supplier has no linked transactions. Disabled suppliers are usually better than deleting them for historical data."
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        isLoading={deleteMutation.isPending}
        variant="destructive"
      />
    </div>
  );
}
