// app/stock/settings/item-group/[name]/page.tsx
// Obsidian ERP v4.0 — Item Group detail (V4 golden template, 2R Part 7).

"use client";

import { useParams, useRouter } from "next/navigation";
import { Pencil, FolderTree, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, LoadingState } from "@/components/smart";
import { InfoCard, DataPoint } from "@/components/ui/info-card";
import { useFrappeDoc } from "@/hooks/generic";

interface ItemGroup {
  name: string;
  item_group_name?: string;
  parent_item_group?: string;
  is_group?: number;
}

export default function ItemGroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(params.name as string);
  const { data: group, isLoading } = useFrappeDoc<ItemGroup>("Item Group", name);

  if (isLoading) return <LoadingState type="cards" count={3} />;
  if (!group) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Item group not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={group.item_group_name || group.name}
        subtitle={`Item Group · ${group.name}`}
        backHref="/stock/settings/item-group"
        actions={
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() =>
              router.push(
                `/stock/settings/item-group/${encodeURIComponent(name)}/edit`,
              )
            }
          >
            <Pencil className="h-4 w-4 mr-2" /> Edit
          </Button>
        }
      />

      <InfoCard>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <FolderTree className="h-5 w-5 text-primary" />
            </div>
            <DataPoint label="Name" value={group.name} />
          </div>
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <DataPoint label="Parent" value={group.parent_item_group || "—"} />
          </div>
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <FolderTree className="h-5 w-5 text-primary" />
            </div>
            <DataPoint
              label="Type"
              value={group.is_group ? "Group (can contain subgroups)" : "Leaf (holds items)"}
            />
          </div>
        </div>
      </InfoCard>
    </div>
  );
}