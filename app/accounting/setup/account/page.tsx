"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Search,
  Network,
  Calculator,
  Wallet,
  Building2,
  RefreshCw,
  LayoutGrid,
  ListTree,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useFrappeList } from "@/hooks/generic";
import { PageHeader, LoadingState, EmptyState } from "@/components/smart";
import { AccountTree } from "@/components/accounting/account-tree";
import type { Account } from "@/types/doctype-types";
import { cn } from "@/lib/utils";

export default function ChartOfAccountsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [isTreeView, setIsTreeView] = useState(true);

  const {
    data: accounts,
    isLoading,
    refetch,
  } = useFrappeList<Account>("Account", {
    fields: [
      "name",
      "account_name",
      "account_number",
      "parent_account",
      "root_type",
      "account_type",
      "is_group",
      "disabled",
      "company",
    ],
    orderBy: { field: "name", order: "asc" },
    limit: 1000,
  });

  const filteredAccounts = useMemo(() => {
    if (!accounts) return [];
    if (!searchTerm) return accounts;
    return accounts.filter(
      (acc) =>
        acc.account_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.account_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.name?.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [accounts, searchTerm]);

  const stats = useMemo(() => {
    if (!accounts) return { total: 0, groups: 0, ledgers: 0 };
    return {
      total: accounts.length,
      groups: accounts.filter((a) => a.is_group === 1).length,
      ledgers: accounts.filter((a) => a.is_group === 0).length,
    };
  }, [accounts]);

  if (isLoading) return <LoadingState type="detail" />;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      <PageHeader
        title="Chart of Accounts"
        subtitle="Manage your accounting hierarchy and financial structure"
        backUrl="/accounting/setup"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full h-10 w-10 bg-card"
              onClick={() => refetch()}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              className="rounded-full shadow-lg shadow-primary/20 h-10 px-6 font-bold"
              onClick={() => router.push("/accounting/setup/account/new")}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Account
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card rounded-3xl border border-border/50 p-6 flex items-center gap-4 shadow-sm">
          <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600">
            <ListTree className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
              Total Nodes
            </p>
            <p className="text-2xl font-black">{stats.total}</p>
          </div>
        </div>
        <div className="bg-card rounded-3xl border border-border/50 p-6 flex items-center gap-4 shadow-sm">
          <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600">
            <Network className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
              Groups
            </p>
            <p className="text-2xl font-black">{stats.groups}</p>
          </div>
        </div>
        <div className="bg-card rounded-3xl border border-border/50 p-6 flex items-center gap-4 shadow-sm">
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
            <Calculator className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
              Ledgers
            </p>
            <p className="text-2xl font-black">{stats.ledgers}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-4 items-center justify-between flex-wrap">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search account name or number..."
            className="pl-10 h-10 rounded-full bg-card border-border/50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border/50 shadow-xl overflow-hidden min-h-[600px]">
        <div className="p-8 border-b border-border bg-secondary/10 flex items-center justify-between">
          <h3 className="font-black text-sm uppercase tracking-[0.2em] flex items-center gap-3">
            <Wallet className="h-4 w-4 text-primary" /> Accounting Hierarchy
          </h3>
        </div>

        <div className="p-6">
          {searchTerm ? (
            <div className="space-y-2">
              {filteredAccounts.map((acc) => (
                <div
                  key={acc.name}
                  className="flex items-center justify-between p-4 bg-secondary/20 rounded-2xl hover:bg-primary/5 cursor-pointer transition-all"
                  onClick={() =>
                    router.push(
                      `/accounting/setup/account/${encodeURIComponent(acc.name)}`,
                    )
                  }
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center font-bold",
                        acc.is_group
                          ? "bg-amber-500/10 text-amber-600"
                          : "bg-primary/10 text-primary",
                      )}
                    >
                      {acc.is_group ? "G" : "L"}
                    </div>
                    <div>
                      <p className="font-bold">{acc.account_name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                        {acc.parent_account || "Root"}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs font-mono text-muted-foreground font-bold">
                    {acc.account_number}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <AccountTree
              accounts={accounts || []}
              onAddSubAccount={(parent) =>
                router.push(
                  `/accounting/setup/account/new?parent_account=${encodeURIComponent(parent.name)}`,
                )
              }
              onEdit={(account) =>
                router.push(
                  `/accounting/setup/account/${encodeURIComponent(account.name)}/edit`,
                )
              }
              onViewLedger={(account) =>
                router.push(
                  `/accounting/ledger?account=${encodeURIComponent(account.name)}`,
                )
              }
            />
          )}

          {!isLoading && (!accounts || accounts.length === 0) && (
            <EmptyState
              title="No Accounts"
              description="Start by creating your first group or ledger account."
            />
          )}
        </div>
      </div>
    </div>
  );
}
