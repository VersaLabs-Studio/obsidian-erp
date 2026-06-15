"use client";

import { useState, useMemo, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  Calendar,
  Clock,
  MoreVertical,
  Trash2,
  Eye,
  RefreshCw,
  LayoutGrid,
  FileText,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFrappeList, useFrappeDelete } from "@/hooks/generic";
import {
  PageHeader,
  LoadingState,
  EmptyState,
  ConfirmDialog,
} from "@/components/smart";
import type { PaymentTermsTemplate } from "@/types/doctype-types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function PaymentTermsListPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const {
    data: templates,
    isLoading,
    refetch,
  } = useFrappeList<PaymentTermsTemplate>("Payment Terms Template", {
    fields: ["name", "template_name"],
    orderBy: { field: "template_name", order: "asc" },
  });

  const deleteMutation = useFrappeDelete("Payment Terms Template", {
    onSuccess: () => {
      toast.success("Template deleted");
      refetch();
      setDeleteTarget(null);
    },
  });

  const filtered = useMemo(() => {
    if (!templates) return [];
    return templates.filter(
      (t) =>
        t.template_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.name?.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [templates, searchTerm]);

  if (isLoading) return <LoadingState type="cards" count={4} />;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      <PageHeader
        title="Payment Terms"
        subtitle="Define standardized credit and payment schedules"
        backUrl="/accounting/setup"
        actions={
          <Button
            className="rounded-full shadow-lg shadow-primary/20 h-10 px-6 font-bold"
            onClick={() => router.push("/accounting/setup/payment-terms/new")}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        }
      />

      <div className="flex gap-4 items-center justify-between flex-wrap">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            className="pl-10 h-10 rounded-full bg-card border-border/50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full h-10 w-10 bg-card"
          onClick={() => refetch()}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No Payment Terms"
          description="Create reusable payment schedules like Net 30 or Advance."
          icon={Calendar}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map((template, idx) => {
            return (
              <div
                key={template.name}
                className={cn(
                  "group relative bg-card rounded-2xl border border-border/50 p-8",
                  "hover:shadow-xl hover:border-indigo-500/20 transition-all duration-500",
                  "cursor-pointer shadow-sm overflow-hidden",
                )}
                onClick={() =>
                  router.push(
                    `/accounting/setup/payment-terms/${encodeURIComponent(template.name)}`,
                  )
                }
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 shadow-lg group-hover:scale-110 transition-transform duration-500">
                    <Clock className="h-7 w-7" />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      asChild
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-xl h-9 w-9"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="rounded-2xl shadow-xl p-1.5 min-w-[160px]"
                    >
                      <DropdownMenuItem
                        onClick={() =>
                          router.push(
                            `/accounting/setup/payment-terms/${encodeURIComponent(template.name)}`,
                          )
                        }
                      >
                        <Eye className="h-4 w-4 mr-2" /> View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeleteTarget(template.name)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-black tracking-tight group-hover:text-primary transition-colors">
                    {template.template_name || template.name}
                  </h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <FileText className="h-3 w-3" /> Standard Template
                  </p>
                </div>

                <div className="mt-8 pt-6 border-t border-border/50 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    ID: {template.name}
                  </span>
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Template"
        description="Permanently remove this payment terms template?"
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget); }}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
