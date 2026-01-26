// @ts-nocheck
"use client";

import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Pencil,
  Trash2,
  User,
  Phone,
  CreditCard,
  CheckCircle,
  XCircle,
  Truck,
  Calendar,
  Building2,
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
import type { Driver } from "@/types/doctype-types";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

export default function DriverDetailPage() {
  const { name } = useParams();
  const router = useRouter();
  const driverName = decodeURIComponent(name as string);
  const [showDelete, setShowDelete] = useState(false);

  const {
    data: driver,
    isLoading,
    error,
  } = useFrappeDoc<Driver>("Driver", driverName);

  const deleteMutation = useFrappeDelete("Driver", {
    onSuccess: () => {
      toast.success("Driver deleted");
      router.push("/stock/setup/driver");
    },
  });

  if (isLoading) return <LoadingState type="detail" />;
  if (error || !driver)
    return <EmptyState icon={User} title="Driver not found" />;

  const isActive = driver.status === "Active";

  return (
    <div className="space-y-6">
      <PageHeader
        title={driver.full_name}
        subtitle={driver.license_number || "Driver Profile"}
        backHref="/stock/setup/driver"
        icon={<User className="h-5 w-5 text-primary" />}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="rounded-full h-9"
              onClick={() =>
                router.push(
                  `/stock/setup/driver/${encodeURIComponent(driverName)}/edit`,
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
        <div className="md:col-span-1">
          <InfoCard
            title="Driver Status"
            icon={<User className="h-5 w-5 text-primary" />}
          >
            <div className="flex flex-col items-center py-6 text-center">
              <div
                className={cn(
                  "h-24 w-24 rounded-full flex items-center justify-center mb-4 border-4",
                  isActive
                    ? "bg-emerald-100 border-emerald-50 text-emerald-600"
                    : "bg-gray-100 border-gray-50 text-gray-500",
                )}
              >
                <User className="h-12 w-12" />
              </div>
              <h3 className="font-bold text-lg mb-2">{driver.full_name}</h3>
              <Badge
                className={cn(
                  "rounded-full px-4 py-1",
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
          </InfoCard>
        </div>

        <div className="md:col-span-2 space-y-6">
          <InfoCard
            title="License & Contact"
            icon={<CreditCard className="h-5 w-5 text-blue-500" />}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <DataPoint
                icon={<CreditCard className="h-4 w-4 text-primary" />}
                label="License Number"
                value={driver.license_number || "—"}
              />
              <DataPoint
                icon={<Phone className="h-4 w-4 text-emerald-500" />}
                label="Mobile Number"
                value={driver.cell_number || "—"}
              />
              <DataPoint
                icon={<Calendar className="h-4 w-4 text-amber-500" />}
                label="Issue Date"
                value={
                  driver.issuing_date
                    ? format(parseISO(driver.issuing_date), "PPP")
                    : "—"
                }
              />
              <DataPoint
                icon={<Calendar className="h-4 w-4 text-red-500" />}
                label="Expiry Date"
                value={
                  driver.expiry_date
                    ? format(parseISO(driver.expiry_date), "PPP")
                    : "—"
                }
              />
            </div>
          </InfoCard>

          <InfoCard
            title="Transporter Details"
            icon={<Truck className="h-5 w-5 text-amber-500" />}
          >
            {driver.transporter ? (
              <div className="flex items-center gap-4 p-4 bg-secondary/20 rounded-xl">
                <Building2 className="h-6 w-6 text-primary" />
                <div>
                  <p className="font-bold">{driver.transporter}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">
                    Linked Logistics Company
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No transporter linked
              </p>
            )}
          </InfoCard>
        </div>
      </div>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={() => setShowDelete(false)}
        title="Delete Driver?"
        description="This action cannot be undone."
        onConfirm={() => deleteMutation.mutate(driverName)}
        loading={deleteMutation.isPending}
        variant="destructive"
      />
    </div>
  );
}
