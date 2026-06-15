"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/smart/page-header";
import { FrappeSelect } from "@/components/smart/frappe-select";
import { useFrappeList } from "@/hooks/generic";
import { AccountTree } from "@/components/accounting/account-tree";
import { LoadingState } from "@/components/smart/loading-state";
import { Card, CardContent } from "@/components/ui/card";
import { Calculator, Plus, Search, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Account } from "@/types/doctype-types";

export default function ChartOfAccountsPage() {
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  const {
    data: accounts,
    isLoading,
    refetch,
    isRefetching,
  } = useFrappeList<Account>(
    "Account",
    {
      filters: selectedCompany
        ? [["company", "=", selectedCompany]]
        : undefined,
      orderBy: { field: "account_name", order: "asc" },
      limit: 1000,
    },
    {
      enabled: !!selectedCompany,
    },
  );

  const filteredAccounts = useMemo(() => {
    if (!accounts) return [];
    if (!searchTerm) return accounts;
    return accounts.filter(
      (acc) =>
        acc.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.account_number?.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [accounts, searchTerm]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      <PageHeader
        label="Accounting Setup"
        title="Chart of Accounts"
        subtitle="Hierarchy of all your financial accounts"
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="rounded-full bg-card"
              onClick={() => refetch()}
              disabled={!selectedCompany || isRefetching}
            >
              <RefreshCw
                className={cn("w-4 h-4 mr-2", isRefetching && "animate-spin")}
              />
              Refresh
            </Button>
            <Button className="rounded-full">
              <Plus className="w-4 h-4 mr-2" /> Add Root Account
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Controls */}
        <div className="space-y-6">
          <Card className="rounded-2xl border-border/50 bg-card/40 backdrop-blur-sm overflow-hidden">
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  Select Company
                </label>
                <FrappeSelect
                  doctype="Company"
                  value={selectedCompany}
                  onChange={setSelectedCompany}
                  placeholder="Pick a company..."
                  className="h-12 rounded-2xl bg-secondary/30 border-0"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  Search Tree
                </label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Filter by name..."
                    className="h-12 pl-11 rounded-2xl bg-secondary/30 border-0"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-primary/10 bg-primary/5 p-6 space-y-4">
            <h4 className="font-bold text-sm flex items-center gap-2">
              <Calculator className="w-4 h-4 text-primary" /> Accounting Pro Tip
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Use the search bar to quickly find accounts by name or number.
              Expanding groups reveals sub-accounts and detailed financial
              classification.
            </p>
          </Card>
        </div>

        {/* Tree Render Area */}
        <div className="lg:col-span-3">
          {isLoading ? (
            <LoadingState type="list" count={10} />
          ) : !selectedCompany ? (
            <div className="flex flex-col items-center justify-center p-20 border-2 border-dashed border-border rounded-2xl bg-card/20 animate-in fade-in zoom-in duration-500 min-h-[500px]">
              <div className="p-6 bg-primary/10 rounded-2xl mb-6">
                <Calculator className="w-12 h-12 text-primary" />
              </div>
              <h3 className="text-xl font-bold">Select a Company</h3>
              <p className="text-muted-foreground mt-2 max-w-xs text-center">
                Please select a company from the sidebar to view its Chart of
                Accounts hierarchy.
              </p>
            </div>
          ) : (
            <Card className="rounded-2xl border-border/50 bg-card/30 backdrop-blur-sm shadow-xl min-h-[600px] overflow-hidden">
              <CardContent className="p-8">
                <AccountTree
                  accounts={filteredAccounts}
                  onAddSubAccount={(parent) => console.log("Add to", parent)}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
