// app/stock/settings/uom/new/page.tsx
// Obsidian ERP v4.0 — Create UOM (V4 golden template, 2R Part 7).

"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { PageHeader } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import { FormInput, FormSwitch } from "@/components/form";
import { useFrappeCreate } from "@/hooks/generic";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import {
  GuidedErrorDialog,
  useGuidedError,
} from "@/components/errors/GuidedErrorDialog";

// Tight create schema (the generated UomCreateSchema is `.partial()`).
const UomFormSchema = z.object({
  uom_name: z.string().min(1, "UOM name is required"),
  must_be_whole_number: z.boolean(),
});
type FormData = z.infer<typeof UomFormSchema>;

export default function NewUomPage() {
  const router = useRouter();
  const { resolution, showError, dismiss } = useGuidedError();

  const form = useForm<FormData>({
    resolver: zodResolver(UomFormSchema),
    defaultValues: {
      uom_name: "",
      must_be_whole_number: false,
    },
  });

  const createMutation = useFrappeCreate("UOM", {
    onSuccess: () => router.push("/stock/settings/uom"),
    successMessage: "UOM created",
    onError: (err) =>
      showError(resolveFrappeError(err, { doctype: "UOM", values: form.getValues() })),
  });

  const onSubmit = async (data: FormData) => {
    await createMutation.mutateAsync({
      uom_name: data.uom_name,
      must_be_whole_number: data.must_be_whole_number ? 1 : 0,
    });
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="New UOM"
        subtitle="Create a new unit of measure"
        backHref="/stock/settings/uom"
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
                    Add a new UOM (e.g. Box, Pallet, Kg). Mark as whole-number only if it can never be a fraction.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <FormInput
                  control={form.control}
                  name="uom_name"
                  label="UOM Name"
                  required
                  placeholder="e.g. Box"
                />
                <FormSwitch
                  control={form.control}
                  name="must_be_whole_number"
                  label="Must be whole numbers"
                  description="Quantity must always be an integer (e.g. 1 Box, not 0.5 Box)."
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
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating…
                </>
              ) : (
                "Create UOM"
              )}
            </Button>
          </div>
        </form>
      </Form>
      <GuidedErrorDialog resolution={resolution} onDismiss={dismiss} />
    </div>
  );
}