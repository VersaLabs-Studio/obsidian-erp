// app/stock/settings/item-group/new/page.tsx
// Obsidian ERP v4.0 — Create Item Group (V4 golden template, 2R Part 7).

"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, FolderTree } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { PageHeader } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import {
  FormInput,
  FormFrappeSelect,
  FormSwitch,
} from "@/components/form";
import { useFrappeCreate } from "@/hooks/generic";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import {
  GuidedErrorDialog,
  useGuidedError,
} from "@/components/errors/GuidedErrorDialog";

// Tight create schema. The generated `ItemGroupCreateSchema` is
// `.partial()` (everything optional, since doctype generators don't
// know which fields are required on a Create), so we use a tighter
// schema here for the wizard's required-field validation.
const ItemGroupFormSchema = z.object({
  item_group_name: z.string().min(1, "Item group name is required"),
  parent_item_group: z.string().optional(),
  is_group: z.boolean(),
});
type FormData = z.infer<typeof ItemGroupFormSchema>;

export default function NewItemGroupPage() {
  const router = useRouter();
  const { resolution, showError, dismiss } = useGuidedError();

  const form = useForm<FormData>({
    resolver: zodResolver(ItemGroupFormSchema),
    defaultValues: {
      item_group_name: "",
      parent_item_group: "All Item Groups",
      is_group: false,
    },
  });

  const createMutation = useFrappeCreate("Item Group", {
    onSuccess: () => router.push("/stock/settings/item-group"),
    successMessage: "Item Group created",
    onError: (err) =>
      showError(resolveFrappeError(err, { doctype: "Item Group", values: form.getValues() })),
  });

  const onSubmit = async (data: FormData) => {
    await createMutation.mutateAsync({
      item_group_name: data.item_group_name,
      parent_item_group: data.parent_item_group || undefined,
      is_group: data.is_group ? 1 : 0,
    });
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="New Item Group"
        subtitle="Create a new item group"
        backHref="/stock/settings/item-group"
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <InfoCard>
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-2 border-b border-border/40">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FolderTree className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Group Details</h3>
                  <p className="text-xs text-muted-foreground">
                    Set the group name, optional parent, and whether it&apos;s a group node.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput
                  control={form.control}
                  name="item_group_name"
                  label="Item Group Name"
                  required
                  placeholder="e.g. Raw Materials"
                />
                <FormFrappeSelect
                  control={form.control}
                  name="parent_item_group"
                  label="Parent Item Group"
                  doctype="Item Group"
                  labelField="item_group_name"
                  placeholder="Top-level"
                />
                <div className="md:col-span-2">
                  <FormSwitch
                    control={form.control}
                    name="is_group"
                    label="Is a group node"
                    description="Groups can contain subgroups; leaf groups hold items."
                  />
                </div>
              </div>
            </div>
          </InfoCard>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-full"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating…
                </>
              ) : (
                "Create Item Group"
              )}
            </Button>
          </div>
        </form>
      </Form>
      <GuidedErrorDialog resolution={resolution} onDismiss={dismiss} />
    </div>
  );
}