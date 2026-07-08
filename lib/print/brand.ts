// lib/print/brand.ts
// Obsidian ERP v4.0 — Phase 2Y-R2: print letterhead brand.
//
// Single source of truth for the printed document's brand (logo + accent).
// Kept in ONE file so a deployment can swap it without touching the print
// components or CSS — the Pana client uses its gold/amber accent + logo;
// an unbranded/Obsidian build can point these at neutral values here.
//
// Accent is Pana's amber-500 (#f59e0b) — the same gold used across the
// Pana sidebar (`text-amber-500`). It flows into app/print.css via the
// `--pd-accent` custom property that <PrintDocument> sets on its root.

export interface PrintBrand {
  /** Wordmark shown next to the logo in the letterhead. */
  name: string;
  /** Public path to the logo image. Falls back to the wordmark if missing. */
  logoSrc: string;
  /** Primary brand accent (borders, title, grand-total rule). */
  accent: string;
  /** Darker shade for accent text that needs contrast on white. */
  accentDark: string;
}

export const PRINT_BRAND: PrintBrand = {
  name: "Pana Promotion",
  logoSrc: "/pana-logo.png",
  accent: "#f59e0b", // amber-500 — Pana gold
  accentDark: "#b45309", // amber-700
};
