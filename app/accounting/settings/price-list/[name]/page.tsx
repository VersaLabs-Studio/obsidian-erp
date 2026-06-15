// app/accounting/settings/price-list/[name]/page.tsx
// Obsidian ERP v4.0 - Price List Detail Page
"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Edit,
  Trash2,
  BadgeDollarSign,
  ShoppingCart,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
} from "lucide-react";
import { useFrappeDoc, useFrappeDelete } from "@/hooks/generic";
import { PageHeader, LoadingState, ConfirmDialog } from "@/components/smart";
import { InfoCard, DataPoint } from "@/components/ui/info-card";
import { WhatsNext } from "@/components/smart/WhatsNext";
import { ActivityTimeline } from "@/components/smart/ActivityTimeline";
import { GuidedErrorDialog, useGuidedError } from "@/components/errors/GuidedErrorDialog";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";

interface PriceList {
  name: string;
  price_list_name: string;
  currency: string;
  enabled: number;
  buying: number;
  selling: number;
  owner?: string;
  creation?: string;
  modified?: string;
}

export default function PriceListDetailPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name: encodedName } = use(params);
  const name = decodeURIComponent(encodedName);
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { resolution, showError, dismiss } = useGuidedError();

  const {
    data: priceList,
    isLoading,
    error,
  } = useFrappeDoc<PriceList>("Price List", name);

  const deleteMutation = useFrappeDelete("Price List", {
    onSuccess: () => router.push("/accounting/settings/price-list"),
    // 2L P2: route the Frappe LinkExists error through the guided-error
    // dialog so the user sees an actionable message + View Item Prices
    // deep-link, not a raw toast.
    onError: (err) =>
      showError(resolveFrappeError(err, { doctype: "Price List" })),
  });

  if (isLoading) return <LoadingState type="detail" />;
  if (error || !priceList)
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="h-16 w-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
          <Activity className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold">Price List not found</h2>
        <p className="text-muted-foreground">
          The price list may have been deleted or you may not have access.
        </p>
        <Button
          onClick={() => router.push("/accounting/settings/price-list")}
        >
          Back to List
        </Button>
      </div>
    );

  const activityItems = [
    {
      id: "created",
      type: "created" as const,
      description: `Price List "${priceList.price_list_name}" was created`,
      user: priceList.owner,
      timestamp: priceList.creation || new Date().toISOString(),
    },
    ...(priceList.modified !== priceList.creation
      ? [
          {
            id: "modified",
            type: "updated" as const,
            description: "Price List was modified",
            user: priceList.owner,
            timestamp: priceList.modified || new Date().toISOString(),
          },
        ]
      : []),
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Price List"
        description={`Are you sure you want to delete "${priceList.price_list_name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={async () => {
          await deleteMutation.mutateAsync(name);
        }}
        loading={deleteMutation.isPending}
      />

      <PageHeader
        backHref="/accounting/settings/price-list"
        label="Price List Details"
        title={priceList.price_list_name}
        status={{
          label: priceList.enabled === 1 ? "Enabled" : "Disabled",
          variant: priceList.enabled === 1 ? "success" : "default",
        }}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() =>
                router.push(
                  `/accounting/settings/price-list/${encodeURIComponent(
                    name
                  )}/edit`
                )
              }
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="destructive"
              className="rounded-full"
              onClick={() => setShowDeleteDialog(true)}
              disabled={priceList.enabled === 1}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-8 space-y-8">
          <InfoCard
            title="General Information"
            icon={<BadgeDollarSign className="h-4 w-4" />}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
              <DataPoint label="Price List Name" value={priceList.price_list_name} />
              <DataPoint label="Currency" value={priceList.currency} />
              <DataPoint
                label="Selling"
                value={
                  priceList.selling === 1 ? (
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      Yes
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                      No
                    </span>
                  )
                }
              />
              <DataPoint
                label="Buying"
                value={
                  priceList.buying === 1 ? (
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      Yes
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                      No
                    </span>
                  )
                }
              />
            </div>
          </InfoCard>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-8">
          <WhatsNext
            actions={[
              {
                label: "Edit Price List",
                description: "Modify price list settings",
                onClick: () =>
                  router.push(
                    `/accounting/settings/price-list/${encodeURIComponent(
                      name
                    )}/edit`
                  ),
                isPrimary: true,
              },
              {
                label: "Delete Price List",
                description: "Remove this price list permanently",
                onClick: () => setShowDeleteDialog(true),
                disabled: priceList.enabled === 1,
                disabledReason:
                  "Disable the price list before deleting",
              },
            ]}
          />

          <ActivityTimeline items={activityItems} />

          <GuidedErrorDialog resolution={resolution} onDismiss={dismiss} />

          <InfoCard
            title="System Info"
            icon={<Clock className="h-4 w-4 text-muted-foreground" />}
            variant="transparent"
          >
            <div className="space-y-3 text-sm text-muted-foreground/80">
              <div className="flex justify-between">
                <span>Created</span>
                <span className="font-mono">
                  {priceList.creation
                    ? new Date(priceList.creation).toLocaleDateString()
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Last Modified</span>
                <span className="font-mono">
                  {priceList.modified
                    ? new Date(priceList.modified).toLocaleDateString()
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Owner</span>
                <span className="font-mono truncate max-w-[120px]">
                  {priceList.owner || "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>ID</span>
                <span className="font-mono truncate max-w-[120px]">
                  {priceList.name}
                </span>
              </div>
            </div>
          </InfoCard>
        </div>
      </div>
    </div>
  );
}
