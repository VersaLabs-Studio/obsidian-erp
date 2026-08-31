// components/ui/print-share.tsx
// Obsidian ERP v4.0 — Print & Share actions for document detail headers.
//
// 2Q Part 8 (F-B4): a global Print & Share action for transactional
// docs. Priority: Sales Order, Quotation, then SI, PI, DN, PO, PR, PE.
// Implementation:
//
//   - Print: branded, well-formatted document (Pana letterhead:
//     name/logo/address/currency ETB; doc title, parties, items table,
//     totals, terms). Uses `window.print()` with a print-only stylesheet
//     that suppresses the app chrome and renders a clean letterhead.
//   - Share: copy-link + email-the-document (reuses /api/email/send when
//     present) + a download-as-PDF button (the browser's built-in
//     "Save as PDF" destination on the print dialog).
//
// Respect RBAC: only show for docs the user can read (server already
// enforces; the gate is cosmetic — same honesty guardrail as Part 3).
//
// The component is a controlled API: the caller provides
// `doctype` + `name` + an optional `email` for the Share action. It
// does not know about specific doc types — the same component renders
// for SO, Quotation, SI, etc.

"use client";

import { useState } from "react";
import { Printer, Share2, Copy, Mail, Download, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface PrintShareProps {
  /** Document doctype, e.g. "Sales Order" — used in the print header. */
  doctype: string;
  /** Document name, e.g. "SO-2026-0001" — used in the print header. */
  name: string;
  /**
   * Optional email address pre-filled in the Share → Email form. When
   * omitted, the user is prompted for an address.
   */
  defaultEmail?: string;
  /**
   * 2Y-R2 — render the Print button. Set false on pages that use the new
   * <PrintMenu> (real print-document subsystem) so there aren't two Print
   * buttons. Share-only mode keeps Copy link / Email / Save as PDF.
   */
  showPrint?: boolean;
  className?: string;
}

/**
 * Print: open the browser print dialog. A print-only stylesheet
 * (app/print.css) hides the app chrome and renders a clean letterhead.
 */
function handlePrint(doctype: string, name: string) {
  // The print stylesheet uses the `[data-print-doctype]` + `[data-print-name]`
  // attributes on <body> to render the letterhead. We set them just
  // before printing, then unset on the afterprint event so the next
  // navigation is clean.
  if (typeof document === "undefined") return;
  const body = document.body;
  body.setAttribute("data-print-doctype", doctype);
  body.setAttribute("data-print-name", name);
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

function handleCopyLink(name: string) {
  if (typeof window === "undefined") return;
  const url = window.location.href;
  if (navigator.clipboard?.writeText) {
    navigator.clipboard
      .writeText(url)
      .then(() => toast.success("Link copied", { description: url }))
      .catch(() =>
        toast.error("Couldn't copy link", {
          description: "Use the address bar instead.",
        }),
      );
  } else {
    toast.message("Copy this link", { description: url });
  }
  // Touch `name` so the linter doesn't drop it; it's used in the toast title in callers that pass it.
  void name;
}

async function handleEmail(opts: {
  doctype: string;
  name: string;
  email: string;
}) {
  const res = await fetch("/api/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: opts.email,
      subject: `${opts.doctype} ${opts.name}`,
      url: typeof window !== "undefined" ? window.location.href : "",
    }),
  }).catch(() => null);
  if (res?.ok) {
    toast.success("Email sent", { description: `to ${opts.email}` });
  } else {
    // Fallback: open the user's mail client with a pre-filled subject.
    const mailto = `mailto:${encodeURIComponent(opts.email)}?subject=${encodeURIComponent(`${opts.doctype} ${opts.name}`)}`;
    if (typeof window !== "undefined") {
      window.location.href = mailto;
    }
  }
}

export function PrintShare({
  doctype,
  name,
  defaultEmail,
  showPrint = true,
  className,
}: PrintShareProps) {
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [copied, setCopied] = useState(false);

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {showPrint && (
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => handlePrint(doctype, name)}
          aria-label={`Print ${doctype} ${name}`}
        >
          <Printer className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Print</span>
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            aria-label={`Share ${doctype} ${name}`}
          >
            <Share2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Share</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-64 rounded-2xl border-none shadow-2xl bg-popover/95 backdrop-blur-xl p-2"
        >
          <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider px-2 py-1.5">
            Share {doctype}
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-border/50" />
          <DropdownMenuItem
            className="rounded-xl py-2.5 focus:bg-secondary cursor-pointer transition-colors"
            onSelect={(e) => {
              e.preventDefault();
              handleCopyLink(name);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? (
              <Check className="mr-3 h-4 w-4 text-success" />
            ) : (
              <Copy className="mr-3 h-4 w-4" />
            )}
            Copy link
          </DropdownMenuItem>
          <DropdownMenuItem
            className="rounded-xl py-2.5 focus:bg-secondary cursor-pointer transition-colors"
            onSelect={(e) => {
              e.preventDefault();
              setEmailOpen(true);
            }}
          >
            <Mail className="mr-3 h-4 w-4" /> Email this document…
          </DropdownMenuItem>
          <DropdownMenuItem
            className="rounded-xl py-2.5 focus:bg-secondary cursor-pointer transition-colors"
            onSelect={(e) => {
              e.preventDefault();
              handlePrint(doctype, name);
            }}
          >
            <Download className="mr-3 h-4 w-4" /> Save as PDF
          </DropdownMenuItem>
          {emailOpen && (
            <div className="px-2 py-2">
              <label className="text-xs text-muted-foreground">
                Recipient email
              </label>
              <div className="mt-1 flex gap-1.5">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="customer@company.com"
                  className="flex-1 rounded-lg border border-border/50 bg-background px-2 py-1.5 text-sm focus:border-primary/50 focus:outline-none"
                />
                <Button
                  size="sm"
                  disabled={!email.includes("@")}
                  onClick={() => {
                    void handleEmail({ doctype, name, email });
                    setEmailOpen(false);
                  }}
                >
                  Send
                </Button>
              </div>
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default PrintShare;
