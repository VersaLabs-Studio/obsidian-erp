// app/sales/settings/terms/page.tsx
// Obsidian ERP v4.0 - Terms and Conditions List Page
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
  FileText,
  CheckCircle2,
  XCircle,
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
import type { TermsandConditions } from "@/types/doctype-types";

// Terms Row Component
function TermsRow({
  terms,
  index,
  onEdit,
  onDelete,
}: {
  terms: TermsandConditions;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="group relative flex items-center justify-between p-5 mb-3 bg-card hover:bg-card/80 hover:shadow-xl transition-all duration-500 rounded-[2rem] border border-transparent hover:border-primary/5"
    >
      <div className="flex items-center gap-5 flex-1 min-w-0">
        <div className="p-3.5 bg-primary/10 rounded-2xl group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 shadow-sm">
          <FileText className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="font-bold text-lg text-foreground truncate group-hover:text-primary transition-colors">
              {terms.title}
            </h3>
            <div className="flex gap-1.5">
              {terms.selling === 1 && (
                <Badge
                  variant="secondary"
                  className="text-[10px] h-4 bg-blue-500/10 text-blue-600 border-none"
                >
                  Selling
                </Badge>
              )}
              {terms.buying === 1 && (
                <Badge
                  variant="secondary"
                  className="text-[10px] h-4 bg-orange-500/10 text-orange-600 border-none"
                >
                  Buying
                </Badge>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1 max-w-2xl font-medium opacity-70">
            {terms.terms?.replace(/<[^>]*>/g, "").slice(0, 100)}...
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 ml-4">
        {terms.disabled === 1 && (
          <Badge variant="outline" className="text-[10px] h-4 opacity-50">
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
            className="rounded-2xl border-none shadow-2xl bg-popover/95 backdrop-blur-xl p-2 min-w-[160px]"
          >
            <DropdownMenuItem
              className="rounded-xl px-4 py-3 cursor-pointer"
              onClick={onEdit}
            >
              <Pencil className="h-4 w-4 mr-3" /> Edit Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="rounded-xl px-4 py-3 text-destructive focus:text-destructive cursor-pointer"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4 mr-3" /> Delete Terms
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}

export default function TermsAndConditionsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<TermsandConditions | null>(
    null
  );

  const {
    data: termsList,
    isLoading,
    error,
  } = useFrappeList<TermsandConditions>("Terms and Conditions", {
    orderBy: { field: "title", order: "asc" },
    search,
    limit: 100,
  });

  const deleteMutation = useFrappeDelete("Terms and Conditions", {
    onSuccess: () => setDeleteTarget(null),
  });

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.name);
  };

  if (isLoading) {
    return <LoadingState type="list" count={5} />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive font-bold text-lg">
          Failed to load terms and conditions
        </p>
      </div>
    );
  }

  const filteredTerms = termsList?.filter((t) =>
    t.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title="Terms and Conditions"
        subtitle={`${filteredTerms?.length || 0} policy templates`}
        showSearch
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search terms..."
        backHref="/sales/settings"
        actions={
          <Button
            className="rounded-full shadow-xl shadow-primary/20 px-6"
            onClick={() => router.push("/sales/settings/terms/new")}
          >
            <Plus className="h-4 w-4 mr-2" /> New Policy
          </Button>
        }
      />

      {filteredTerms?.length === 0 ? (
        <EmptyState
          title="No terms found"
          description={
            search
              ? "Try adjusting your search"
              : "Create your first standard policy"
          }
          action={
            <Button onClick={() => router.push("/sales/settings/terms/new")}>
              <Plus className="h-4 w-4 mr-2" /> Create Terms
            </Button>
          }
        />
      ) : (
        <div className="space-y-1 max-w-5xl">
          {filteredTerms?.map((terms, index) => (
            <TermsRow
              key={terms.name}
              terms={terms}
              index={index}
              onEdit={() =>
                router.push(
                  `/sales/settings/terms/${encodeURIComponent(terms.name)}/edit`
                )
              }
              onDelete={() => setDeleteTarget(terms)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Terms and Conditions"
        description={`Are you sure you want to delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmText="Confirm Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
