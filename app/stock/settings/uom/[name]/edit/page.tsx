// app/stock/settings/uom/[name]/edit/page.tsx
// Obsidian ERP v4.0 — Edit UOM (V4 golden template, 2R Part 7).

"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { PageHeader, LoadingState } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import { FormInput, FormSwitch } from "@/components/form";
import { useFrappeDoc, useFrappeUpdate } from "@/hooks/generic";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import {
  GuidedErrorDialog,
  useGuidedError,
} from "@/components/errors/GuidedErrorDialog";

// Tight edit schema (the generated UpdateSchema is `.partial().omit(...)`).
const UomEditSchema = z.object({
  uom_name: z.string().min(1, "UOM name is required"),
  must_be_whole_number: z.boolean(),
});
type FormData = z.infer<typeof UomEditSchema>;

interface Uom {
  name: string;
  uom_name?: string;
  must_be_whole_number?: number;
}

export default function EditUomPage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(params.name as string);
  const { resolution, showError, dismiss } = useGuidedError();

  const { data: uom, isLoading } = useFrappeDoc<Uom>("UOM", name);

  const form = useForm<FormData>({
    resolver: zodResolver(UomEditSchema),
    defaultValues: {
      uom_name: "",
      must_be_whole_number: false,
    },
  });

  useEffect(() => {
    if (!uom) return;
    form.reset({
      uom_name: uom.uom_name || uom.name,
      must_be_whole_number: Number(uom.must_be_whole_number ?? 0) === 1,
    });
  }, [uom, form]);

  const updateMutation = useFrappeUpdate("UOM", {
    onSuccess: () => router.push(`/stock/settings/uom/${encodeURIComponent(name)}`),
    successMessage: "UOM updated",
    onError: (err) =>
      showError(resolveFrappeError(err, { doctype: "UOM", values: form.getValues() })),
  });

  const onSubmit = async (data: FormData) => {
    await updateMutation.mutateAsync({
      name,
      data: {
        uom_name: data.uom_name,
        must_be_whole_number: data.must_be_whole_number ? 1 : 0,
      },
    });
  };

  if (isLoading || !uom) return <LoadingState type="cards" count={2} />;

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={`Edit ${name}`}
        subtitle="Update this unit of measure"
        backHref={`/stock/settings/uom/${encodeURIComponent(name)}`}
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <InfoCard>
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-2 border-b border-border/40">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Ruler className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">UOM Details</h3>
                  <p className="text-xs text-muted-foreground">
                    Update the name or whole-number flag.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <FormInput
                  control={form.control}
                  name="uom_name"
                  label="UOM Name"
                  required
                />
                <FormSwitch
                  control={form.control}
                  name="must_be_whole_number"
                  label="Must be whole numbers"
                  description="Quantity must always be an integer."
                />
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