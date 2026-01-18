"use client";

import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Warehouse as WarehouseIcon,
  MapPin,
  Phone,
  Mail,
  Building2,
} from "lucide-react";
import { useFrappeDoc, useFrappeDelete } from "@/hooks/generic";
import {
  PageHeader,
  EmptyState,
  LoadingState,
  ConfirmDialog,
} from "@/components/smart";
import { InfoCard, DataPoint } from "@/components/ui/info-card";
import type { Warehouse } from "@/types/doctype-types";
import { cn } from "@/lib/utils";
import { useState } from "react";

export default function WarehouseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(params.name as string);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: warehouse, isLoading } = useFrappeDoc<Warehouse>(
    "Warehouse",
    name,
  );
  const deleteMutation = useFrappeDelete("Warehouse", {
    onSuccess: () => router.push("/stock/warehouse"),
  });

  if (isLoading) return <LoadingState type="detail" />;
  if (!warehouse) return <EmptyState title="Not Found" />;

  const isGroup = warehouse.is_group === 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title={warehouse.warehouse_name}
        subtitle={isGroup ? "Parent Group" : "Storage Location"}
        backHref="/stock/warehouse"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() =>
                router.push(`/stock/warehouse/${encodeURIComponent(name)}/edit`)
              }
            >
              Edit
            </Button>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              Delete
            </Button>
          </div>
        }
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InfoCard
          title="Basic Information"
          icon={<WarehouseIcon className="h-4 w-4" />}
        >
          <div className="grid grid-cols-2 gap-4">
            <DataPoint label="Name" value={warehouse.warehouse_name} />
            <DataPoint label="Type" value={warehouse.warehouse_type || "—"} />
            <DataPoint
              label="Parent"
              value={warehouse.parent_warehouse || "—"}
            />
            <DataPoint
              label="Status"
              value={warehouse.disabled === 1 ? "Disabled" : "Active"}
            />
          </div>
        </InfoCard>
        <InfoCard
          title="Location Details"
          icon={<MapPin className="h-4 w-4" />}
        >
          <div className="space-y-4">
            <DataPoint
              label="Address"
              value={`${warehouse.address_line_1 || ""} ${warehouse.address_line_2 || ""}`.trim()}
            />
            <div className="grid grid-cols-2 gap-4">
              <DataPoint label="City" value={warehouse.city} />
            </div>
          </div>
        </InfoCard>
      </div>
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Warehouse"
        description={`Delete "${warehouse.warehouse_name}"?`}
        onConfirm={async () => {
          await deleteMutation.mutateAsync(name);
        }}
      />
    </div>
  );
}
