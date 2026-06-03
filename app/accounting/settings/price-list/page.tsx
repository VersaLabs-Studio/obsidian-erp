// app/accounting/settings/price-list/page.tsx
// Obsidian ERP v4.0 - Price Lists List Page
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Plus,
  ListOrdered,
  MoreVertical,
  Pencil,
  Trash2,
  BadgeDollarSign,
  ShoppingCart,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

// v3.0 Imports
import { useFrappeList, useFrappeDelete } from "@/hooks/generic";
import {
  PageHeader,
  EmptyState,
  LoadingState,
  ConfirmDialog,
} from "@/components/smart";

interface PriceList {
  name: string;
  price_list_name: string;
  currency: string;
  enabled: number;
  buying: number;
  selling: number;
}

export default function PriceListsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const {
    data: priceLists,
    isLoading,
    error,
  } = useFrappeList<PriceList>("Price List", {
    orderBy: { field: "name", order: "asc" },
    search,
    limit: 100,
  });

  if (isLoading) return <LoadingState type="list" count={5} />;

  if (error)
    return (
      <div className="flex items-center justify-center p-20 bg-destructive/5 rounded-[2rem] border border-destructive/10">
        <p className="text-destructive font-bold text-lg">
          Failed to load price lists
        </p>
      </div>
    );

  const filtered = priceLists?.filter((pl) =>
    pl.price_list_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Price Lists"
        subtitle={`${filtered?.length || 0} active price lists`}
        showSearch
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Filter by name..."
        backHref="/accounting/settings"
        actions={
          <Button
            className="rounded-full px-6 shadow-xl shadow-primary/20"
            onClick={() => alert("Create Price List coming soon")}
          >
            <Plus className="h-4 w-4 mr-2" /> New Price List
          </Button>
        }
      />

      {!filtered || filtered.length === 0 ? (
        <EmptyState
          title="No price lists found"
          description="Create price lists to manage buying and selling rates."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((pl, i) => (
            <motion.div
              key={pl.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group relative bg-card p-8 rounded-[2.5rem] border border-transparent hover:border-primary/10 transition-all duration-300 shadow-sm hover:shadow-xl"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  {pl.selling ? (
                    <BadgeDollarSign className="h-7 w-7" />
                  ) : (
                    <ShoppingCart className="h-7 w-7" />
                  )}
                </div>
                <div className="flex gap-2">
                  {pl.selling === 1 && (
                    <Badge variant="default" className="rounded-full">
                      Selling
                    </Badge>
                  )}
                  {pl.buying === 1 && (
                    <Badge variant="secondary" className="rounded-full">
                      Buying
                    </Badge>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold mb-1">{pl.price_list_name}</h3>
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {pl.currency}
                </p>
              </div>

              <div className="mt-6 pt-6 border-t border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      pl.enabled ? "bg-green-500" : "bg-red-500"
                    }`}
                  />
                  <span className="text-[10px] uppercase font-bold text-muted-foreground/60">
                    {pl.enabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
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
