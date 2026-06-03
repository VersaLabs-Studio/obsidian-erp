// app/accounting/settings/currency/page.tsx
// Obsidian ERP v4.0 - Currencies List Page
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Plus, Coins, MoreVertical, Pencil, Trash2 } from "lucide-react";
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

interface Currency {
  name: string;
  currency_name: string;
  symbol: string;
  enabled: number;
}

export default function CurrenciesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Currency | null>(null);

  const {
    data: currencies,
    isLoading,
    error,
  } = useFrappeList<Currency>("Currency", {
    orderBy: { field: "name", order: "asc" },
    search,
    limit: 100,
  });

  const deleteMutation = useFrappeDelete("Currency", {
    onSuccess: () => setDeleteTarget(null),
  });

  if (isLoading) return <LoadingState type="list" count={5} />;

  if (error)
    return (
      <div className="flex items-center justify-center p-20 bg-destructive/5 rounded-[2rem] border border-destructive/10">
        <p className="text-destructive font-bold text-lg">
          Failed to load currencies
        </p>
      </div>
    );

  const filtered = currencies?.filter(
    (c) =>
      c.currency_name.toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Currencies"
        subtitle={`${filtered?.length || 0} supported currencies`}
        showSearch
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Filter by name or code..."
        backHref="/accounting/settings"
        actions={
          <Button
            className="rounded-full px-6 shadow-xl shadow-primary/20"
            onClick={() => alert("Create Currency coming soon")}
          >
            <Plus className="h-4 w-4 mr-2" /> Add Currency
          </Button>
        }
      />

      {!filtered || filtered.length === 0 ? (
        <EmptyState
          title="No currencies found"
          description="Manage currencies used for transactions."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((c, i) => (
            <motion.div
              key={c.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group relative bg-card p-6 rounded-[2rem] border border-transparent hover:border-primary/10 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                  {c.symbol || c.name.slice(0, 1)}
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      c.enabled ? "bg-green-500" : "bg-red-500"
                    }`}
                  />
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    {c.enabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold truncate">
                  {c.currency_name}
                </h3>
                <p className="text-sm font-semibold text-muted-foreground">
                  {c.name}
                </p>
              </div>

              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="rounded-full">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
