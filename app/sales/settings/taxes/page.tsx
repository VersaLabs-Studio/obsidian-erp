// app/sales/settings/taxes/page.tsx
// Obsidian ERP v4.0 - Sales Tax Templates List Page
// @ts-nocheck

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Percent,
  CheckCircle2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

// v3.0 Imports
import { useFrappeList, useFrappeDelete } from "@/hooks/generic";
import {
  PageHeader,
  EmptyState,
  LoadingState,
  ConfirmDialog,
} from "@/components/smart";
import type { SalesTaxesandChargesTemplate } from "@/types/doctype-types";

// Tax Template Row Component
function TaxTemplateRow({
  template,
  index,
  onEdit,
  onDelete,
}: {
  template: SalesTaxesandChargesTemplate;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="group relative flex items-center justify-between p-4 mb-2 bg-card hover:bg-card/80 hover:shadow-lg transition-all duration-300 rounded-2xl border border-transparent hover:border-primary/10"
    >
      <div className="flex items-center gap-4">
        <div className="p-2.5 bg-primary/10 rounded-xl">
          <Percent className="h-4 w-4 text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground">{template.title}</h3>
            {template.is_default === 1 && (
              <Badge
                variant="secondary"
                className="text-[10px] h-4 bg-emerald-500/10 text-emerald-600 border-none"
              >
                Default
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{template.company}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {template.disabled === 1 && (
          <Badge variant="outline" className="text-[10px] h-4 opacity-70">
            Disabled
          </Badge>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="rounded-xl border-none shadow-xl bg-popover/95 backdrop-blur-xl p-1"
          >
            <DropdownMenuItem className="rounded-lg" onClick={onEdit}>
              <Pencil className="h-4 w-4 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="rounded-lg text-destructive focus:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}

export default function TaxTemplatesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] =
    useState<SalesTaxesandChargesTemplate | null>(null);

  const {
    data: templates,
    isLoading,
    error,
  } = useFrappeList<SalesTaxesandChargesTemplate>(
    "Sales Taxes and Charges Template",
    {
      orderBy: { field: "title", order: "asc" },
      search,
      limit: 100,
    }
  );

  const deleteMutation = useFrappeDelete("Sales Taxes and Charges Template", {
    onSuccess: () => setDeleteTarget(null),
  });

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.name);
  };

  if (isLoading) {
    return <LoadingState type="list" count={6} />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive font-bold text-lg">
          Failed to load tax templates
        </p>
      </div>
    );
  }

  const filteredTemplates = templates?.filter(
    (t) =>
      t.title?.toLowerCase().includes(search.toLowerCase()) ||
      t.company?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title="Tax Templates"
        subtitle={`${filteredTemplates?.length || 0} templates configured`}
        showSearch
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search templates..."
        backHref="/sales/settings"
        actions={
          <Button
            className="rounded-full shadow-lg shadow-primary/20"
            onClick={() => router.push("/sales/settings/taxes/new")}
          >
            <Plus className="h-4 w-4 mr-2" /> New Template
          </Button>
        }
      />

      {filteredTemplates?.length === 0 ? (
        <EmptyState
          title="No tax templates found"
          description={
            search
              ? "Try adjusting your search"
              : "Configure your first sales tax template"
          }
          action={
            <Button onClick={() => router.push("/sales/settings/taxes/new")}>
              <Plus className="h-4 w-4 mr-2" /> New Template
            </Button>
          }
        />
      ) : (
        <div className="space-y-2 max-w-5xl">
          {filteredTemplates?.map((template, index) => (
            <TaxTemplateRow
              key={template.name}
              template={template}
              index={index}
              onEdit={() =>
                router.push(
                  `/sales/settings/taxes/${encodeURIComponent(
                    template.name
                  )}/edit`
                )
              }
              onDelete={() => setDeleteTarget(template)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Tax Template"
        description={`Are you sure you want to delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
