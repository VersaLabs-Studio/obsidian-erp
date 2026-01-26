// @ts-nocheck
"use client";

import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Pencil,
  Trash2,
  Truck,
  Fuel,
  MapPin,
  Calendar,
  Shield,
  Car,
} from "lucide-react";
import { useFrappeDoc, useFrappeDelete } from "@/hooks/generic";
import {
  PageHeader,
  LoadingState,
  EmptyState,
  ConfirmDialog,
} from "@/components/smart";
import { InfoCard, DataPoint } from "@/components/ui/info-card";
import { useState } from "react";
import { toast } from "sonner";
import type { Vehicle } from "@/types/doctype-types";
import { format, parseISO } from "date-fns";

export default function VehicleDetailPage() {
  const { name } = useParams();
  const router = useRouter();
  const vehicleName = decodeURIComponent(name as string);
  const [showDelete, setShowDelete] = useState(false);

  const {
    data: vehicle,
    isLoading,
    error,
  } = useFrappeDoc<Vehicle>("Vehicle", vehicleName);

  const deleteMutation = useFrappeDelete("Vehicle", {
    onSuccess: () => {
      toast.success("Vehicle deleted");
      router.push("/stock/setup/vehicle");
    },
  });

  if (isLoading) return <LoadingState type="detail" />;
  if (error || !vehicle)
    return <EmptyState icon={Truck} title="Vehicle not found" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={vehicle.license_plate}
        subtitle={
          `${vehicle.make || ""} ${vehicle.model || ""}`.trim() ||
          "Vehicle Details"
        }
        backHref="/stock/setup/vehicle"
        icon={<Truck className="h-5 w-5 text-primary" />}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="rounded-full h-9"
              onClick={() =>
                router.push(
                  `/stock/setup/vehicle/${encodeURIComponent(vehicleName)}/edit`,
                )
              }
            >
              <Pencil className="h-4 w-4 mr-2" /> Edit
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowDelete(true)}
              className="rounded-full h-9 w-9 text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <InfoCard
            title="Vehicle Specifications"
            icon={<Car className="h-5 w-5 text-primary" />}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <DataPoint
                icon={<Truck className="h-4 w-4 text-primary" />}
                label="License Plate"
                value={vehicle.license_plate}
              />
              <DataPoint
                icon={<Fuel className="h-4 w-4 text-amber-500" />}
                label="Fuel Type"
                value={vehicle.fuel_type || "—"}
              />
              <DataPoint
                icon={<Car className="h-4 w-4 text-blue-500" />}
                label="Make"
                value={vehicle.make || "—"}
              />
              <DataPoint
                icon={<Car className="h-4 w-4 text-indigo-500" />}
                label="Model"
                value={vehicle.model || "—"}
              />
              <DataPoint
                icon={<Calendar className="h-4 w-4 text-emerald-500" />}
                label="Acquisition"
                value={
                  vehicle.acquisition_date
                    ? format(parseISO(vehicle.acquisition_date), "PPP")
                    : "—"
                }
              />
              <DataPoint
                icon={<MapPin className="h-4 w-4 text-red-500" />}
                label="Location"
                value={vehicle.location || "—"}
              />
            </div>
          </InfoCard>

          <InfoCard
            title="Insurance & Compliance"
            icon={<Shield className="h-5 w-5 text-emerald-600" />}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <DataPoint
                icon={<Shield className="h-4 w-4 text-emerald-500" />}
                label="Insurance Company"
                value={vehicle.insurance_company || "—"}
              />
              <DataPoint
                icon={<Shield className="h-4 w-4 text-emerald-500" />}
                label="Policy Number"
                value={vehicle.policy_no || "—"}
              />
            </div>
          </InfoCard>
        </div>

        <div className="md:col-span-1">
          <div className="bg-card rounded-2xl border border-border/50 p-8 flex flex-col items-center text-center shadow-sm">
            <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Truck className="h-10 w-10 text-primary" />
            </div>
            <h3 className="font-black text-2xl font-mono mb-1">
              {vehicle.license_plate}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {vehicle.make} {vehicle.model}
            </p>
            <Badge className="rounded-full bg-secondary text-secondary-foreground">
              {vehicle.fuel_type || "No Data"}
            </Badge>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={() => setShowDelete(false)}
        title="Delete Vehicle?"
        description="This action cannot be undone."
        onConfirm={() => deleteMutation.mutate(vehicleName)}
        loading={deleteMutation.isPending}
        variant="destructive"
      />
    </div>
  );
}
