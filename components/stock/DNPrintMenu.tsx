// components/stock/DNPrintMenu.tsx
// Obsidian ERP v4.0 — Phase 2Y Part 6: Delivery Note dual-format print.
//
// Two print modes for the Delivery Note:
//   1. Customer Copy — branded letterhead, items table, totals (standard
//      business format — consistent with print.css)
//   2. Gate Pass — internal warehouse format with warehouse locations,
//      vehicle/driver info, item quantities for gate verification.
//
// Both use browser-print (window.print) with the existing print.css system.
// The Gate Pass adds `data-print-format="gate-pass"` to <body> so the
// print.css can show/hide sections conditionally.

"use client";

import { useState } from "react";
import { Printer, ShieldCheck, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface DNPrintMenuProps {
  /** DN document name (e.g. "DN-2026-0001") */
  name: string;
  className?: string;
}

// ---------------------------------------------------------------------------
// Print handlers
// ---------------------------------------------------------------------------

/** Print the customer copy (standard branded letterhead). */
function printCustomerCopy(name: string) {
  if (typeof document === "undefined") return;
  const body = document.body;
  body.setAttribute("data-print-doctype", "Delivery Note");
  body.setAttribute("data-print-name", name);
  // Remove any gate-pass marker from prior prints
  body.removeAttribute("data-print-format");
  body.classList.add("is-printing");
  const onAfter = () => {
    body.removeAttribute("data-print-doctype");
    body.removeAttribute("data-print-name");
    body.classList.remove("is-printing");
    window.removeEventListener("afterprint", onAfter);
  };
  window.addEventListener("afterprint", onAfter);
  window.print();
}

/** Print the gate pass (internal warehouse format). */
function printGatePass(name: string) {
  if (typeof document === "undefined") return;
  const body = document.body;
  body.setAttribute("data-print-doctype", "Delivery Note — Gate Pass");
  body.setAttribute("data-print-name", name);
  body.setAttribute("data-print-format", "gate-pass");
  body.classList.add("is-printing");
  const onAfter = () => {
    body.removeAttribute("data-print-doctype");
    body.removeAttribute("data-print-name");
    body.removeAttribute("data-print-format");
    body.classList.remove("is-printing");
    window.removeEventListener("afterprint", onAfter);
  };
  window.addEventListener("afterprint", onAfter);
  window.print();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DNPrintMenu({ name, className }: DNPrintMenuProps) {
  return (
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
        <DropdownMenuItem
          className="rounded-xl py-2.5 focus:bg-secondary cursor-pointer transition-colors"
          onSelect={(e) => {
            e.preventDefault();
            printCustomerCopy(name);
          }}
        >
          <FileText className="mr-3 h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-medium text-foreground">Customer Copy</p>
            <p className="text-xs text-muted-foreground">Branded letterhead with items & totals</p>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="rounded-xl py-2.5 focus:bg-secondary cursor-pointer transition-colors"
          onSelect={(e) => {
            e.preventDefault();
            printGatePass(name);
          }}
        >
          <ShieldCheck className="mr-3 h-4 w-4 text-amber-500" />
          <div>
            <p className="text-sm font-medium text-foreground">Gate Pass</p>
            <p className="text-xs text-muted-foreground">Internal format — warehouse, vehicle & driver info</p>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default DNPrintMenu;
