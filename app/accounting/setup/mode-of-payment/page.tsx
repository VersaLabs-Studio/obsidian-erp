"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  Wallet,
  Building2,
  CreditCard,
  Phone,
  MoreVertical,
  Trash2,
  Eye,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Banknote,
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
import type { ModeOfPayment } from "@/types/doctype-types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const TYPE_CONFIG: Record<
  string,
  { color: string; bgColor: string; icon: any }
> = {
  Cash: { color: "text-amber-600", bgColor: "bg-amber-100", icon: Wallet },
  Bank: { color: "text-blue-600", bgColor: "bg-blue-100", icon: Building2 },
  General: {
    color: "text-slate-600",
    bgColor: "bg-slate-100",
    icon: CreditCard,
  },
  Phone: { color: "text-emerald-600", bgColor: "bg-emerald-100", icon: Phone },
};

export default function ModeOfPaymentListPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const {
    data: modes,
    isLoading,
    refetch,
  } = useFrappeList<ModeOfPayment>("Mode of Payment", {
    fields: ["name", "mode_of_payment", "type", "enabled"],
    orderBy: { field: "mode_of_payment", order: "asc" },
  });

  const deleteMutation = useFrappeDelete("Mode of Payment", {
    onSuccess: () => {
      toast.success("Mode of payment deleted");
      refetch();
      setDeleteTarget(null);
    },
  });

  const filtered = useMemo(() => {
    if (!modes) return [];
    return modes.filter((m) =>
      m.mode_of_payment?.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [modes, searchTerm]);

  if (isLoading) return <LoadingState type="cards" />;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      <PageHeader
        title="Modes of Payment"
        subtitle="Configure Cash, Bank, and Digital payment methods"
        backUrl="/accounting/setup"
        actions={
          <Button
            className="rounded-full shadow-lg shadow-primary/20 h-10 px-6 font-bold"
            onClick={() => router.push("/accounting/setup/mode-of-payment/new")}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Mode
          </Button>
        }
      />

      <div className="flex gap-4 items-center justify-between flex-wrap">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search payment modes..."
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
          title="No modes of payment"
          description="Define how you receive or pay money."
          icon={Banknote}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map((mode, idx) => {
            const config =
              TYPE_CONFIG[mode.type || "General"] || TYPE_CONFIG.General;
            const Icon = config.icon;
            const isEnabled = mode.enabled === 1;

            return (
              <div
                key={mode.name}
                className={cn(
                  "group relative bg-card rounded-[2.5rem] border border-border/50 p-8",
                  "hover:shadow-2xl hover:border-emerald-500/20 transition-all duration-500",
                  "cursor-pointer shadow-sm overflow-hidden",
                  !isEnabled && "opacity-60 grayscale-[0.5]",
                )}
                onClick={() =>
                  router.push(
                    `/accounting/setup/mode-of-payment/${encodeURIComponent(mode.name)}`,
                  )
                }
              >
                <div className="absolute top-0 right-0 p-8 opacity-5 select-none text-primary group-hover:scale-110 transition-transform duration-500">
                  <Icon className="w-32 h-32" />
                </div>

                <div className="flex justify-between items-start mb-6">
                  <div
                    className={cn(
                      "h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg",
                      config.bgColor,
                    )}
                  >
                    <Icon className={cn("h-7 w-7", config.color)} />
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
                            `/accounting/setup/mode-of-payment/${encodeURIComponent(mode.name)}`,
                          )
                        }
                      >
                        <Eye className="h-4 w-4 mr-2" /> View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeleteTarget(mode.name)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-black tracking-tight group-hover:text-primary transition-colors">
                      {mode.mode_of_payment}
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[8px] font-black uppercase tracking-widest",
                          config.bgColor,
                          config.color,
                        )}
                      >
                        {mode.type || "General"}
                      </Badge>
                      {isEnabled ? (
                        <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="h-2 w-2" /> Enabled
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          <XCircle className="h-2 w-2" /> Disabled
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Mode of Payment"
        description="Are you sure you want to delete this payment method? This cannot be undone."
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget); }}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
