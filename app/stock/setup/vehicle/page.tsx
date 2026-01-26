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
  Truck,
  Fuel,
  MapPin,
  Eye,
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
import type { Vehicle } from "@/types/doctype-types";

const FUEL_COLORS = {
  Petrol: "bg-amber-100 text-amber-600",
  Diesel: "bg-blue-100 text-blue-600",
  Electric: "bg-emerald-100 text-emerald-600",
  "Natural Gas": "bg-violet-100 text-violet-600",
};

function VehicleCard({ vehicle, index, onView, onEdit, onDelete }) {
  const fuelColor =
    FUEL_COLORS[vehicle.fuel_type] || "bg-gray-100 text-gray-600";

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
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Truck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-black text-foreground group-hover:text-primary transition-colors font-mono">
              {vehicle.license_plate}
            </h3>
            <p className="text-xs text-muted-foreground">
              {vehicle.make} {vehicle.model}
            </p>
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
        {vehicle.location && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span className="truncate">{vehicle.location}</span>
          </div>
        )}
      </div>

      {vehicle.fuel_type && (
        <Badge className={cn("rounded-full text-xs", fuelColor)}>
          <Fuel className="h-3 w-3 mr-1" />
          {vehicle.fuel_type}
        </Badge>
      )}
    </div>
  );
}

export default function VehicleListPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const {
    data: vehicles,
    isLoading,
    refetch,
  } = useFrappeList<Vehicle>("Vehicle", {
    fields: ["name", "license_plate", "make", "model", "fuel_type", "location"],
    orderBy: { field: "license_plate", order: "asc" },
    limit: 100,
  });

  const deleteMutation = useFrappeDelete("Vehicle", {
    onSuccess: () => {
      toast.success("Vehicle deleted");
      refetch();
      setDeleteTarget(null);
    },
  });

  const filtered = useMemo(() => {
    if (!vehicles) return [];
    return vehicles.filter(
      (v) =>
        !searchTerm ||
        v.license_plate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.model?.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [vehicles, searchTerm]);

  if (isLoading) return <LoadingState message="Loading vehicles..." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vehicles"
        subtitle="Manage fleet and delivery vehicles"
        backHref="/stock/setup"
        primaryAction={{
          label: "Add Vehicle",
          onClick: () => router.push("/stock/setup/vehicle/new"),
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search vehicles..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 rounded-full"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No vehicles found"
          description="Register your first vehicle for delivery tracking"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((vehicle, idx) => (
            <VehicleCard
              key={vehicle.name}
              vehicle={vehicle}
              index={idx}
              onView={() =>
                router.push(
                  `/stock/setup/vehicle/${encodeURIComponent(vehicle.name)}`,
                )
              }
              onEdit={() =>
                router.push(
                  `/stock/setup/vehicle/${encodeURIComponent(vehicle.name)}/edit`,
                )
              }
              onDelete={() => setDeleteTarget(vehicle.name)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title="Delete Vehicle?"
        description="This action cannot be undone."
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        loading={deleteMutation.isPending}
        variant="destructive"
      />
    </div>
  );
}
