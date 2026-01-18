"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader, EmptyState } from "@/components/smart";
import { Badge } from "@/components/ui/badge";
import { useFrappeList, useFrappeDelete } from "@/hooks/generic";
import type { SalesPartnerType } from "@/types/doctype-types";
import { toast } from "sonner";
import { format } from "date-fns";

function SalesPartnerTypeRow({
  partnerType,
  onDelete,
}: {
  partnerType: SalesPartnerType;
  onDelete: (id: string) => void;
}) {
  const router = useRouter();

  return (
    <div className="group flex items-center justify-between p-4 rounded-3xl bg-card border border-border/40 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
          <Settings2 className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">{partnerType.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Added on{" "}
            {partnerType.creation
              ? format(new Date(partnerType.creation), "MMM dd, yyyy")
              : "N/A"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-xl">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-2xl">
            <DropdownMenuItem
              onClick={() =>
                router.push(
                  `/sales/settings/sales-partner-type/${partnerType.name}/edit`,
                )
              }
              className="gap-2"
            >
              <Edit2 className="w-4 h-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(partnerType.name)}
              className="gap-2 text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export default function SalesPartnerTypeListPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<SalesPartnerType | null>(
    null,
  );

  const {
    data: partnerTypes,
    isLoading,
    refetch,
  } = useFrappeList<SalesPartnerType>("Sales Partner Type", {
    fields: ["name", "creation"],
    orderBy: { field: "creation", order: "desc" },
    limit: 500,
  });

  const deleteMutation = useFrappeDelete("Sales Partner Type", {
    onSuccess: () => {
      toast.success("Partner type deleted successfully");
      refetch();
      setDeleteTarget(null);
    },
  });

  const filteredItems = partnerTypes?.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Partner Types"
        subtitle="Manage categories for your sales partners"
        backHref="/sales/settings"
      >
        <Button
          onClick={() => router.push("/sales/settings/sales-partner-type/new")}
          className="gap-2 rounded-xl"
        >
          <Plus className="w-4 h-4" /> New Partner Type
        </Button>
      </PageHeader>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search partner types..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 rounded-2xl bg-card border-border/40"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-3xl bg-card animate-pulse" />
          ))}
        </div>
      ) : filteredItems?.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <SalesPartnerTypeRow
              key={item.name}
              partnerType={item}
              onDelete={() => setDeleteTarget(item)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No partner types found"
          description={
            search
              ? "Try adjusting your search"
              : "Start by creating a new partner type"
          }
          icon={Settings2}
          action={
            !search ? (
              <Button
                onClick={() =>
                  router.push("/sales/settings/sales-partner-type/new")
                }
                className="rounded-xl"
              >
                Create Partner Type
              </Button>
            ) : undefined
          }
        />
      )}

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent className="rounded-[2rem]">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the partner type{" "}
              <span className="font-semibold text-foreground">
                {deleteTarget?.name}
              </span>
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                deleteTarget && deleteMutation.mutate(deleteTarget.name)
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
