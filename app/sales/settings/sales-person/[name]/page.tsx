"use client";

import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Edit,
  Trash2,
  User,
  CheckCircle2,
  XCircle,
  Building2,
  Users,
  Briefcase,
  ChevronRight,
} from "lucide-react";
import { useFrappeDoc, useFrappeDelete } from "@/hooks/generic";
import { PageHeader, LoadingState, ConfirmDialog } from "@/components/smart";
import { InfoCard, DataPoint } from "@/components/ui/info-card";
import type { SalesPerson } from "@/types/doctype-types";
import { useState } from "react";

export default function SalesPersonDetailPage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(params.name as string);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const {
    data: sp,
    isLoading,
    error,
  } = useFrappeDoc<SalesPerson>("Sales Person", name);

  const deleteMutation = useFrappeDelete("Sales Person", {
    onSuccess: () => router.push("/sales/settings/sales-person"),
  });

  if (isLoading) return <LoadingState type="detail" />;
  if (error || !sp)
    return (
      <div className="p-8 text-center text-destructive">
        Sales Person not found
      </div>
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title={sp.sales_person_name}
        subtitle={
          <div className="flex items-center gap-2">
            <Badge
              variant={sp.enabled ? "default" : "secondary"}
              className="rounded-full"
            >
              {sp.enabled ? "Enabled" : "Disabled"}
            </Badge>
            {sp.is_group === 1 && (
              <Badge variant="outline" className="rounded-full">
                Group
              </Badge>
            )}
          </div>
        }
        backHref="/sales/settings/sales-person"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() =>
                router.push(
                  `/sales/settings/sales-person/${encodeURIComponent(
                    name,
                  )}/edit`,
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
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <InfoCard
            title="General Information"
            icon={<User className="h-4 w-4" />}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DataPoint label="Full Name" value={sp.sales_person_name} />
              <DataPoint
                label="Parent Sales Person"
                value={
                  sp.parent_sales_person ? (
                    <button
                      onClick={() =>
                        router.push(
                          `/sales/settings/sales-person/${encodeURIComponent(
                            sp.parent_sales_person!,
                          )}`,
                        )
                      }
                      className="text-primary hover:underline text-left"
                    >
                      {sp.parent_sales_person}
                    </button>
                  ) : (
                    "None"
                  )
                }
              />
              <DataPoint
                label="Linked Employee"
                value={
                  sp.employee ? (
                    <button
                      onClick={() =>
                        router.push(
                          `/hr/employee/${encodeURIComponent(sp.employee!)}`,
                        )
                      }
                      className="group/emp w-full mt-1 flex items-center gap-3 p-3 rounded-2xl bg-primary/5 hover:bg-primary/10 border border-primary/10 transition-all duration-300 text-left"
                    >
                      <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary group-hover/emp:scale-110 transition-transform">
                        <User className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-primary truncate">
                          {sp.employee}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                          View Profile
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-primary/40 group-hover/emp:translate-x-1 transition-transform" />
                    </button>
                  ) : (
                    "Not Linked"
                  )
                }
              />
              <DataPoint
                label="Commission Rate"
                value={
                  sp.commission_rate ? `${sp.commission_rate}%` : "Not Set"
                }
              />
            </div>
          </InfoCard>

          {sp.is_group === 1 && (
            <InfoCard title="Hierarchy" icon={<Users className="h-4 w-4" />}>
              <p className="text-sm text-muted-foreground">
                This is a group sales person. Sub-sales persons can be assigned
                to this group.
              </p>
            </InfoCard>
          )}
        </div>

        <div className="space-y-6">
          <InfoCard title="Quick Stats" variant="gradient">
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className="flex items-center gap-1 font-medium italic">
                  {sp.enabled ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                  )}
                  {sp.enabled ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm pt-4 border-t border-primary/10">
                <span className="text-muted-foreground">Is Group</span>
                <span className="font-medium">
                  {sp.is_group === 1 ? "Yes" : "No"}
                </span>
              </div>
            </div>
          </InfoCard>

          <InfoCard
            title="System Info"
            icon={<Briefcase className="h-4 w-4" />}
            variant="transparent"
            className="p-0"
          >
            <div className="space-y-3 px-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Created On</span>
                <span className="text-foreground">
                  {new Date(sp.creation!).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">ID</span>
                <span className="text-foreground font-mono">{sp.name}</span>
              </div>
            </div>
          </InfoCard>
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Sales Person"
        description={`Are you sure you want to delete "${sp.sales_person_name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={async () => {
          await deleteMutation.mutateAsync(name);
        }}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
