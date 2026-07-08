// components/print/PrintMenu.tsx
// Obsidian ERP v4.0 — Phase 2Y-R2: the canonical print control.
//
// One component to wire on any detail page:
//   <PrintMenu doctype="Sales Invoice" doc={si} />
//   <PrintMenu doctype="Delivery Note" doc={dn} variants={["standard","gate-pass"]} />
//
// It renders the print button (a dropdown when >1 variant), owns the
// "which variant is being printed" state, and renders the print-only
// <PrintDocument>. On select it sets the variant, waits for the document
// to commit to the DOM, then calls window.print(). print.css hides the app
// chrome and shows only .print-document.

"use client";

import { useEffect, useRef, useState } from "react";
import { Printer, FileText, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PrintDocument } from "@/components/print/PrintDocument";
import type { PrintVariant } from "@/lib/print/print-config";

const VARIANT_META: Record<
  PrintVariant,
  { label: string; hint: string; icon: typeof FileText }
> = {
  standard: {
    label: "Customer Copy",
    hint: "Branded document with items & totals",
    icon: FileText,
  },
  "gate-pass": {
    label: "Gate Pass",
    hint: "Logistics copy — no prices, signature block",
    icon: ShieldCheck,
  },
};

export interface PrintMenuProps {
  doctype: string;
  doc: Record<string, unknown>;
  /** Offered print variants. Default: just the standard document. */
  variants?: PrintVariant[];
  company?: { name?: string; address?: string; phone?: string; tin?: string };
  className?: string;
}

export function PrintMenu({
  doctype,
  doc,
  variants = ["standard"],
  company,
  className,
}: PrintMenuProps) {
  // The variant currently rendered into the print DOM.
  const [active, setActive] = useState<PrintVariant>(variants[0] ?? "standard");
  // When set, an effect fires window.print() after the doc commits.
  const pendingPrint = useRef(false);

  useEffect(() => {
    if (!pendingPrint.current) return;
    pendingPrint.current = false;
    // The <PrintDocument> for `active` is now in the DOM.
    window.print();
  }, [active]);

  function print(variant: PrintVariant) {
    if (variant === active) {
      // Already rendered — print on the next frame so layout is settled.
      requestAnimationFrame(() => window.print());
      return;
    }
    pendingPrint.current = true;
    setActive(variant);
  }

  const single = variants.length <= 1;

  return (
    <>
      {single ? (
        <Button
          size="sm"
          variant="outline"
          className={className}
          onClick={() => print(variants[0] ?? "standard")}
          aria-label={`Print ${doctype} ${String(doc.name ?? "")}`}
        >
          <Printer className="mr-1.5 h-3.5 w-3.5" />
          <span className="hidden sm:inline">Print</span>
        </Button>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className={className}>
              <Printer className="mr-1.5 h-3.5 w-3.5" />
              <span className="hidden sm:inline">Print</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-64 rounded-2xl border-none shadow-2xl bg-popover/95 backdrop-blur-xl p-2"
          >
            {variants.map((v) => {
              const meta = VARIANT_META[v];
              const Icon = meta.icon;
              return (
                <DropdownMenuItem
                  key={v}
                  className="rounded-xl py-2.5 focus:bg-secondary cursor-pointer transition-colors"
                  onSelect={(e) => {
                    e.preventDefault();
                    print(v);
                  }}
                >
                  <Icon className="mr-3 h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{meta.label}</p>
                    <p className="text-xs text-muted-foreground">{meta.hint}</p>
                  </div>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Print-only document (hidden on screen via app/print.css). */}
      <PrintDocument doctype={doctype} variant={active} doc={doc} company={company} />
    </>
  );
}

export default PrintMenu;
