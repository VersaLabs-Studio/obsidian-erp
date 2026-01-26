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
  User,
  Phone,
  CheckCircle,
  XCircle,
  Eye,
  Truck,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFrappeList, useFrappeDelete } from "@/hooks/generic";
import {
  PageHeader,
  LoadingState,
  EmptyState,
  ConfirmDialog,
} from "@/components/smart";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Driver } from "@/types/doctype-types";

function DriverCard({ driver, index, onView, onEdit, onDelete }) {
  const isActive = driver.status === "Active";

  return (
    <div
      className={cn(
        "group relative bg-card rounded-2xl border border-border/50 p-6",
        "hover:shadow-lg hover:border-primary/20 transition-all duration-300 cursor-pointer",
        "animate-in fade-in slide-in-from-bottom-4",
      )}
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={onView}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "h-12 w-12 rounded-full flex items-center justify-center",
              isActive
                ? "bg-emerald-100 text-emerald-600"
                : "bg-gray-100 text-gray-500",
            )}
          >
            <User className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">
              {driver.full_name}
            </h3>
            {driver.license_number && (
              <p className="text-xs text-muted-foreground font-mono">
                {driver.license_number}
              </p>
            )}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onView();
              }}
            >
              <Eye className="h-4 w-4 mr-2" /> View
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              <Pencil className="h-4 w-4 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-2 text-sm mb-4">
        {driver.cell_number && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="h-4 w-4" />
            <span>{driver.cell_number}</span>
          </div>
        )}
        {driver.transporter && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Truck className="h-4 w-4" />
            <span className="truncate">{driver.transporter}</span>
          </div>
        )}
      </div>

      <Badge
        className={cn(
          "rounded-full text-xs",
          isActive
            ? "bg-emerald-100 text-emerald-600"
            : "bg-gray-100 text-gray-500",
        )}
      >
        {isActive ? (
          <CheckCircle className="h-3 w-3 mr-1" />
        ) : (
          <XCircle className="h-3 w-3 mr-1" />
        )}
        {driver.status || "Active"}
      </Badge>
    </div>
  );
}

export default function DriverListPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const {
    data: drivers,
    isLoading,
    refetch,
  } = useFrappeList<Driver>("Driver", {
    fields: [
      "name",
      "full_name",
      "status",
      "license_number",
      "cell_number",
      "transporter",
    ],
    orderBy: { field: "full_name", order: "asc" },
    limit: 100,
  });

  const deleteMutation = useFrappeDelete("Driver", {
    onSuccess: () => {
      toast.success("Driver deleted");
      refetch();
      setDeleteTarget(null);
    },
  });

  const filtered = useMemo(() => {
    if (!drivers) return [];
    return drivers.filter(
      (d) =>
        !searchTerm ||
        d.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.license_number?.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [drivers, searchTerm]);

  if (isLoading) return <LoadingState message="Loading drivers..." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Drivers"
        subtitle="Manage drivers for delivery dispatches"
        backHref="/stock/setup"
        primaryAction={{
          label: "Add Driver",
          onClick: () => router.push("/stock/setup/driver/new"),
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search drivers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 rounded-full"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={User}
          title="No drivers found"
          description="Add your first driver to enable dispatch tracking"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((driver, idx) => (
            <DriverCard
              key={driver.name}
              driver={driver}
              index={idx}
              onView={() =>
                router.push(
                  `/stock/setup/driver/${encodeURIComponent(driver.name)}`,
                )
              }
              onEdit={() =>
                router.push(
                  `/stock/setup/driver/${encodeURIComponent(driver.name)}/edit`,
                )
              }
              onDelete={() => setDeleteTarget(driver.name)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title="Delete Driver?"
        description="This action cannot be undone."
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        loading={deleteMutation.isPending}
        variant="destructive"
      />
    </div>
  );
}
