"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Edit3, Trash2, Tag, Calendar, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";

import { useFrappeDoc, useFrappeDelete } from "@/hooks/generic";
import {
  PageHeader,
  LoadingState,
  EmptyState,
  ConfirmDialog,
} from "@/components/smart";
import { InfoCard, DataPoint } from "@/components/ui/info-card";
import { WhatsNext } from "@/components/smart/WhatsNext";
import { ActivityTimeline } from "@/components/smart/ActivityTimeline";
import type { ItemPrice } from "@/types/doctype-types";

export default function ItemPriceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(String(params.name));
  const prefersReducedMotion = useReducedMotion();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: itemPrice, isLoading, error } = useFrappeDoc<ItemPrice>(
    "Item Price",
    name,
  );

  const deleteMutation = useFrappeDelete("Item Price", {
    onSuccess: () => router.push("/stock/settings/item-price"),
  });

  if (isLoading) return <LoadingState type="detail" />;

  if (error || !itemPrice) {
    return (
      <div className="space-y-6">
        <PageHeader title="Item Price" backHref="/stock/settings/item-price" />
        <EmptyState
          variant="error"
          title="Item Price not found"
          description={error?.message ?? "This item price may have been deleted."}
        />
      </div>
    );
  }

  const whatsNext = [
    {
      label: "Edit Price",
      description: "Update this item price record",
      onClick: () =>
        router.push(
          `/stock/settings/item-price/${encodeURIComponent(name)}/edit`,
        ),
      isPrimary: true,
    },
    {
      label: "Delete Price",
      description: "Remove this item price record",
      onClick: () => setShowDeleteDialog(true),
      disabled: false,
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={itemPrice.item_code}
        subtitle={`${itemPrice.price_list} — ${itemPrice.price_list_rate?.toLocaleString() ?? 0} ${itemPrice.currency || ""}`}
        backHref="/stock/settings/item-price"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                router.push(
                  `/stock/settings/item-price/${encodeURIComponent(name)}/edit`,
                )
              }
            >
              <Edit3 className="mr-1.5 h-4 w-4" /> Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="mr-1.5 h-4 w-4" /> Delete
            </Button>
          </div>
        }
      />

      <motion.div
        initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
        animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main column */}
          <div className="space-y-6 lg:col-span-2">
            <InfoCard title="Price Details" icon={<Tag className="h-4 w-4" />}>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <DataPoint label="Item Code" value={itemPrice.item_code} />
                <DataPoint label="Price List" value={itemPrice.price_list} />
                <DataPoint label="UOM" value={itemPrice.uom} />
                <DataPoint
                  label="Price List Rate"
                  value={itemPrice.price_list_rate?.toLocaleString() ?? "—"}
                  mono
                />
                <DataPoint label="Currency" value={itemPrice.currency || "—"} />
                <DataPoint
                  label="Buying"
                  value={itemPrice.buying === 1 ? "Yes" : "No"}
                />
                <DataPoint
                  label="Selling"
                  value={itemPrice.selling === 1 ? "Yes" : "No"}
                />
                <DataPoint label="Customer" value={itemPrice.customer || "—"} />
                <DataPoint label="Supplier" value={itemPrice.supplier || "—"} />
              </div>
            </InfoCard>

            <InfoCard title="Validity" icon={<Calendar className="h-4 w-4" />}>
              <div className="grid grid-cols-2 gap-4">
                <DataPoint label="Valid From" value={itemPrice.valid_from || "—"} />
                <DataPoint label="Valid Upto" value={itemPrice.valid_upto || "—"} />
              </div>
            </InfoCard>

            {itemPrice.batch_no && (
              <InfoCard title="Additional" icon={<DollarSign className="h-4 w-4" />}>
                <div className="grid grid-cols-2 gap-4">
                  <DataPoint label="Batch No" value={itemPrice.batch_no} />
                </div>
              </InfoCard>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <WhatsNext actions={whatsNext} />
            <ActivityTimeline
              items={[
                {
                  id: "created",
                  type: "created",
                  description: "Item Price created",
                  user: itemPrice.owner,
                  timestamp: itemPrice.creation ?? new Date().toISOString(),
                },
                ...(itemPrice.modified && itemPrice.modified !== itemPrice.creation
                  ? [
                      {
                        id: "updated",
                        type: "updated" as const,
                        description: "Item Price updated",
                        user: itemPrice.modified_by,
                        timestamp: itemPrice.modified,
                      },
                    ]
                  : []),
              ]}
            />
          </div>
        </div>
      </motion.div>

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Item Price"
        description={`Delete price for "${itemPrice.item_code}" in "${itemPrice.price_list}"?`}
        variant="destructive"
        onConfirm={async () => {
          await deleteMutation.mutateAsync(name);
        }}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
