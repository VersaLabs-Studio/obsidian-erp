// app/stock/settings/uom/[name]/page.tsx
// Obsidian ERP v4.0 — UOM detail (V4 golden template, 2R Part 7).

"use client";

import { useParams, useRouter } from "next/navigation";
import { Pencil, Ruler, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, LoadingState } from "@/components/smart";
import { InfoCard, DataPoint } from "@/components/ui/info-card";
import { useFrappeDoc } from "@/hooks/generic";

interface Uom {
  name: string;
  uom_name?: string;
  enabled?: number;
  must_be_whole_number?: number;
}

export default function UomDetailPage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(params.name as string);
  const { data: uom, isLoading } = useFrappeDoc<Uom>("UOM", name);

  if (isLoading) return <LoadingState type="cards" count={2} />;
  if (!uom) {
    return <div className="p-6 text-sm text-muted-foreground">UOM not found.</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={uom.uom_name || uom.name}
        subtitle={`Unit of Measure · ${uom.name}`}
        backHref="/stock/settings/uom"
        actions={
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() =>
              router.push(`/stock/settings/uom/${encodeURIComponent(name)}/edit`)
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
              <Ruler className="h-5 w-5 text-primary" />
            </div>
            <DataPoint label="Name" value={uom.name} />
          </div>
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Check className="h-5 w-5 text-primary" />
            </div>
            <DataPoint
              label="Status"
              value={Number(uom.enabled ?? 1) === 1 ? "Enabled" : "Disabled"}
            />
          </div>
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              {Number(uom.must_be_whole_number ?? 0) === 1 ? (
                <Check className="h-5 w-5 text-primary" />
              ) : (
                <X className="h-5 w-5 text-primary" />
              )}
            </div>
            <DataPoint
              label="Whole Numbers Only"
              value={
                Number(uom.must_be_whole_number ?? 0) === 1 ? "Yes" : "No"
              }
            />
          </div>
        </div>
      </InfoCard>
    </div>
  );
}