// app/stock/settings/item-group/[name]/edit/page.tsx
// Obsidian ERP v4.0 — Edit Item Group (V4 golden template, 2R Part 7).

"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, FolderTree } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { PageHeader, LoadingState } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import {
  FormInput,
  FormFrappeSelect,
  FormSwitch,
} from "@/components/form";
import { useFrappeDoc, useFrappeUpdate } from "@/hooks/generic";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import {
  GuidedErrorDialog,
  useGuidedError,
} from "@/components/errors/GuidedErrorDialog";

// Tight edit schema (the generated UpdateSchema is `.partial().omit(...)`).
const ItemGroupEditSchema = z.object({
  item_group_name: z.string().min(1, "Item group name is required"),
  parent_item_group: z.string().optional(),
  is_group: z.boolean(),
});
type FormData = z.infer<typeof ItemGroupEditSchema>;

interface ItemGroup {
  name: string;
  item_group_name?: string;
  parent_item_group?: string;
  is_group?: number;
}

export default function EditItemGroupPage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(params.name as string);
  const { resolution, showError, dismiss } = useGuidedError();

  const { data: group, isLoading } = useFrappeDoc<ItemGroup>("Item Group", name);

  const form = useForm<FormData>({
    resolver: zodResolver(ItemGroupEditSchema),
    defaultValues: {
      item_group_name: "",
      parent_item_group: "",
      is_group: false,
    },
  });

  useEffect(() => {
    if (!group) return;
    form.reset({
      item_group_name: group.item_group_name || group.name,
      parent_item_group: group.parent_item_group || "",
      is_group: Number(group.is_group ?? 0) === 1,
    });
  }, [group, form]);

  const updateMutation = useFrappeUpdate("Item Group", {
    onSuccess: () =>
      router.push(`/stock/settings/item-group/${encodeURIComponent(name)}`),
    successMessage: "Item Group updated",
    onError: (err) =>
      showError(
        resolveFrappeError(err, { doctype: "Item Group", values: form.getValues() }),
      ),
  });

  const onSubmit = async (data: FormData) => {
    await updateMutation.mutateAsync({
      name,
      data: {
        item_group_name: data.item_group_name,
        parent_item_group: data.parent_item_group || undefined,
        is_group: data.is_group ? 1 : 0,
      },
    });
  };

  if (isLoading || !group) return <LoadingState type="cards" count={2} />;

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={`Edit ${name}`}
        subtitle="Update this item group"
        backHref={`/stock/settings/item-group/${encodeURIComponent(name)}`}
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
                    Update the name, parent, or node type.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput
                  control={form.control}
                  name="item_group_name"
                  label="Item Group Name"
                  required
                />
                <FormFrappeSelect
                  control={form.control}
                  name="parent_item_group"
                  label="Parent Item Group"
                  doctype="Item Group"
                  labelField="item_group_name"
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
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </Form>
      <GuidedErrorDialog resolution={resolution} onDismiss={dismiss} />
    </div>
  );
}