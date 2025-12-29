"use client";

import { Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useItemGroupQuery,
  useDeleteItemGroupMutation,
} from "@/hooks/data/useItemGroupQuery";
import { PageHeader } from "@/components/ui/page-header";
import { InfoCard, DataPoint } from "@/components/ui/info-card";
import { useExport } from "@/hooks/useExport";
import { Edit, Trash2, Download, Folder, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

function LoadingSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-pulse">
      <div className="h-16 bg-muted/60 rounded-full" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <div className="h-80 bg-muted/50 rounded-[2rem]" />
          <div className="h-60 bg-muted/50 rounded-[2rem]" />
        </div>
        <div className="lg:col-span-4 space-y-6">
          <div className="h-60 bg-muted/40 rounded-[2rem]" />
          <div className="h-40 bg-muted/40 rounded-[2rem]" />
        </div>
      </div>
    </div>
  );
}

function DetailContent() {
  const params = useParams<{ name: string }>();
  const router = useRouter();
  const name = decodeURIComponent(params.name);

  const { data, isLoading } = useItemGroupQuery(name);
  const deleteMutation = useDeleteItemGroupMutation();
  const { exportData, isExporting } = useExport();

  if (isLoading || !data) return <LoadingSkeleton />;

  const itemGroup = data.data.item_group;
  const isGroup = Boolean(itemGroup.is_group);

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this item group?")) {
      await deleteMutation.mutateAsync(name);
      router.push("/stock/settings/item-group");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <PageHeader
        backUrl="/stock/settings/item-group"
        label="Details"
        title={itemGroup.item_group_name}
        primaryAction={{
          label: "Edit",
          icon: <Edit className="h-4 w-4" />,
          onClick: () =>
            router.push(
              `/stock/settings/item-group/${encodeURIComponent(name)}/edit`
            ),
        }}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Settings className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-2xl">
            <DropdownMenuItem
              onClick={() =>
                exportData([itemGroup], "export", "Item Group Report", "pdf")
              }
            >
              <Download className="h-4 w-4 mr-2" /> Export PDF
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <InfoCard
            title={
              <>
                <Folder className="h-4 w-4" />
                {isGroup ? "Group Node" : "Item Group"} Information
              </>
            }
            delay={100}
          >
            <div className="grid grid-cols-2 gap-6">
              <DataPoint label="Name" value={itemGroup.item_group_name} />
              <DataPoint label="ID" value={itemGroup.name} />
              <DataPoint
                label="Parent Item Group"
                value={itemGroup.parent_item_group || "None (Root)"}
              />
              <DataPoint
                label="Type"
                value={isGroup ? "Group Node" : "Item Group"}
              />
              <DataPoint
                label="Left Index"
                value={itemGroup.lft?.toString() || "N/A"}
              />
              <DataPoint
                label="Right Index"
                value={itemGroup.rgt?.toString() || "N/A"}
              />
            </div>
          </InfoCard>
        </div>

        <div className="lg:col-span-4">
          <div className="sticky top-20 space-y-6">
            <InfoCard title="Type" variant="gradient" delay={200}>
              <div className="space-y-4">
                <div
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border inline-block",
                    isGroup
                      ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                      : "bg-purple-500/10 text-purple-600 border-purple-500/20"
                  )}
                >
                  {isGroup ? "Group Node" : "Item Group"}
                </div>
              </div>
            </InfoCard>

            <InfoCard title="Metadata" variant="gradient" delay={300}>
              <div className="space-y-4">
                <DataPoint label="Created" value={itemGroup.creation} />
                <DataPoint label="Modified" value={itemGroup.modified} />
                <DataPoint label="Owner" value={itemGroup.owner || ""} />
                <DataPoint
                  label="Modified By"
                  value={itemGroup.modified_by || ""}
                />
              </div>
            </InfoCard>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ItemGroupDetailPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <DetailContent />
    </Suspense>
  );
}
