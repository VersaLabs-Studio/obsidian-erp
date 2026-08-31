// app/accounting/settings/company/page.tsx
// Obsidian ERP v4.0 - Companies List Page
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
  Building2,
  Globe,
  Wallet,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// v3.0 Imports
import { useFrappeList, useFrappeDelete } from "@/hooks/generic";
import {
  PageHeader,
  EmptyState,
  LoadingState,
  ConfirmDialog,
} from "@/components/smart";
import type { Company } from "@/types/doctype-types";
import { ListErrorState } from "@/components/ui/list-error-state";

function CompanyRow({
  company,
  index,
  onEdit,
  onDelete,
}: {
  company: Company;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group relative flex items-center justify-between p-6 mb-4 bg-card hover:bg-card/80 hover:shadow-xl transition-all duration-300 rounded-2xl border border-transparent hover:border-primary/5"
    >
      <div className="flex items-center gap-6 flex-1 min-w-0">
        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center font-black text-primary text-xl group-hover:scale-110 transition-transform">
          {company.abbr || company.company_name.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold text-foreground mb-1 truncate group-hover:text-primary transition-colors">
            {company.company_name}
          </h3>
          <div className="flex items-center gap-4 text-xs font-semibold text-muted-foreground/70">
            <span className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" />
              {company.country}
            </span>
            <span className="flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5" />
              {company.default_currency}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="rounded-2xl border-none shadow-xl bg-popover/95 backdrop-blur-xl p-2 min-w-[160px]"
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
              <Trash2 className="h-4 w-4 mr-3" /> Delete Company
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}

export default function CompaniesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);

  const {
    data: companies,
    isLoading,
    error,
  } = useFrappeList<Company>("Company", {
    orderBy: { field: "company_name", order: "asc" },
    search,
    limit: 100,
  });

  const deleteMutation = useFrappeDelete("Company", {
    onSuccess: () => setDeleteTarget(null),
  });

  if (isLoading) return <LoadingState type="list" count={5} />;

  if (error)
    return (
      <ListErrorState
        error={error}
        label="companies"
      />
    );

  const filtered = companies?.filter(
    (c) =>
      c.company_name.toLowerCase().includes(search.toLowerCase()) ||
      c.abbr?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Companies"
        subtitle={`${filtered?.length || 0} registered organizations`}
        showSearch
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Filter by name or abbreviation..."
        backHref="/accounting/settings"
        actions={
          <Button
            className="rounded-full px-6 shadow-xl shadow-primary/20"
            onClick={() => router.push("/accounting/settings/company/new")}
          >
            <Plus className="h-4 w-4 mr-2" /> Register Company
          </Button>
        }
      />

      {!filtered || filtered.length === 0 ? (
        <EmptyState
          title="No companies found"
          description={
            search
              ? "Adjust your search to find what you're looking for."
              : "Register your first organization to start managing accounts."
          }
          action={
            <Button
              onClick={() => router.push("/accounting/settings/company/new")}
            >
              Add Company
            </Button>
          }
        />
      ) : (
        <div className="max-w-5xl">
          {filtered.map((c, i) => (
            <CompanyRow
              key={c.name}
              company={c}
              index={i}
              onEdit={() =>
                router.push(
                  `/accounting/settings/company/${encodeURIComponent(
                    c.name
                  )}/edit`
                )
              }
              onDelete={() => setDeleteTarget(c)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete Company"
        description={`Are you sure you want to delete "${deleteTarget?.company_name}"? All associated data might be affected. This action is irreversible.`}
        confirmText="Confirm Delete"
        variant="destructive"
        onConfirm={async () => {
          if (deleteTarget) {
            await deleteMutation.mutateAsync(deleteTarget.name);
          }
        }}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
