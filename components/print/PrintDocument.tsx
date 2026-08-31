// components/print/PrintDocument.tsx
// Obsidian ERP v4.0 — Phase 2Y-R2: the real print document.
//
// Renders a self-contained, print-only document (letterhead → parties →
// items → totals → signatures) driven by lib/print/print-config.ts. It is
// hidden on screen (`.print-document { display:none }` in app/print.css)
// and becomes the ONLY visible element in print (a visibility swap in the
// same stylesheet). This decouples the printed output from the on-screen
// detail layout — the reason the old CSS-only "letterhead" could never be
// a real template.
//
// Wiring a module is one line on its detail page:
//   <PrintMenu doctype="Sales Invoice" doc={si} />
// which renders this document + the print button(s).

"use client";

import type { CSSProperties } from "react";
import { getActiveCompany } from "@/lib/settings/company";
import { PRINT_BRAND } from "@/lib/print/brand";
import {
  getPrintTemplate,
  ETB,
  type PrintVariant,
  type PrintColumn,
} from "@/lib/print/print-config";

export interface PrintDocumentProps {
  doctype: string;
  variant?: PrintVariant;
  /** The full ERPNext doc (from useFrappeDoc) incl. its `items` child table. */
  doc: Record<string, unknown>;
  /** Optional letterhead override (name/address/phone/tin). */
  company?: { name?: string; address?: string; phone?: string; tin?: string };
}

type Row = Record<string, unknown>;

function str(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v);
}
function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function fmt(v: unknown, format?: "date" | "currency" | "text"): string {
  if (v === null || v === undefined || v === "") return "—";
  if (format === "currency") return ETB.format(num(v));
  // dates arrive as "yyyy-mm-dd" or "yyyy-mm-dd hh:mm:ss" — take the date part.
  if (format === "date") return str(v).slice(0, 10);
  return str(v);
}

function cell(row: Row, col: PrintColumn): string {
  const raw = row[col.key];
  if (col.type === "currency" || col.type === "rate") return ETB.format(num(raw));
  if (col.type === "qty") {
    const n = num(raw);
    return Number.isInteger(n) ? String(n) : n.toFixed(2);
  }
  // For the item column, prefer a human name when present.
  if (col.key === "item_code") {
    const nm = str(row.item_name);
    const code = str(row.item_code);
    return nm && nm !== code ? `${code} — ${nm}` : code || "—";
  }
  return str(raw) || "—";
}

export function PrintDocument({
  doctype,
  variant = "standard",
  doc,
  company,
}: PrintDocumentProps) {
  const t = getPrintTemplate(doctype, variant);
  const companyName = company?.name || getActiveCompany() || "Pana";
  const itemsField = t.itemsField ?? "items";
  const items = Array.isArray(doc[itemsField]) ? (doc[itemsField] as Row[]) : [];

  // Columns actually rendered (drop monetary columns when money is hidden).
  const cols = t.columns.filter((c) => t.showMoney || !c.monetary);

  const partyName =
    str(doc[t.partyNameField]) || str(doc[t.partyIdField]) || "—";
  const partyAddress = t.partyAddressField ? str(doc[t.partyAddressField]) : "";
  const shipAddress = t.shipTo ? str(doc[t.shipTo.addressField]) : "";

  const grand = num(doc.grand_total ?? doc.rounded_total ?? doc.total);
  const net = num(doc.total ?? doc.net_total);
  const tax = num(doc.total_taxes_and_charges);

  return (
    <div
      className="print-document"
      data-print-format={variant}
      aria-hidden
      style={{ "--pd-accent": PRINT_BRAND.accent } as CSSProperties}
    >
      {/* ---------- Letterhead ---------- */}
      <header className="pd-letterhead">
        <div className="pd-brand">
          {/* Logo with graceful fallback: if the image 404s (e.g. an
              unbranded build without the logo asset) we reveal the
              wordmark that sits right after it. */}
          <img
            src={PRINT_BRAND.logoSrc}
            alt={PRINT_BRAND.name}
            className="pd-logo"
            onError={(e) => {
              const el = e.currentTarget;
              el.style.display = "none";
              const next = el.nextElementSibling as HTMLElement | null;
              if (next) next.style.display = "block";
            }}
          />
          <div className="pd-brand-name pd-brand-fallback">{PRINT_BRAND.name}</div>
          <div className="pd-brand-meta">
            {companyName}
            {" · "}
            {company?.address || str(doc.company_address_display) || "Addis Ababa, Ethiopia"}
            {company?.phone ? ` · ${company.phone}` : ""}
            {company?.tin ? ` · TIN ${company.tin}` : ""}
          </div>
        </div>
        <div className="pd-title-block">
          <div className="pd-title">{t.title}</div>
          <div className="pd-currency">Currency: ETB</div>
        </div>
      </header>

      {/* ---------- Header meta + parties ---------- */}
      <section className="pd-meta-row">
        <div className="pd-party">
          <div className="pd-label">{t.partyLabel}</div>
          <div className="pd-party-name">{partyName}</div>
          {partyAddress && <div className="pd-address">{partyAddress}</div>}
        </div>
        {t.shipTo && shipAddress && (
          <div className="pd-party">
            <div className="pd-label">{t.shipTo.label}</div>
            <div className="pd-address">{shipAddress}</div>
          </div>
        )}
        <div className="pd-header-fields">
          {t.headerFields
            .filter((f) => str(doc[f.key]) !== "")
            .map((f) => (
              <div key={f.key} className="pd-hf">
                <span className="pd-hf-label">{f.label}</span>
                <span className="pd-hf-value">{fmt(doc[f.key], f.format)}</span>
              </div>
            ))}
        </div>
      </section>

      {/* ---------- Gate-pass logistics box ---------- */}
      {t.showLogistics && (
        <section className="pd-logistics" data-logistics>
          <div className="pd-label">Logistics</div>
          <div className="pd-logistics-grid">
            <span>Vehicle No: {str(doc.custom_vehicle_no) || "____________"}</span>
            <span>Driver: {str(doc.custom_driver_name) || "____________"}</span>
            <span>Transporter: {str(doc.transporter_name) || "____________"}</span>
            <span>Dispatch Time: ____________</span>
          </div>
        </section>
      )}

      {/* ---------- Items ---------- */}
      {cols.length > 0 && items.length > 0 && (
        <table className="pd-items">
          <thead>
            <tr>
              <th className="pd-idx">#</th>
              {cols.map((c) => (
                <th key={c.key} style={{ textAlign: c.align ?? "left" }}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((row, i) => (
              <tr key={i}>
                <td className="pd-idx">{i + 1}</td>
                {cols.map((c) => (
                  <td key={c.key} style={{ textAlign: c.align ?? "left" }}>
                    {cell(row, c)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ---------- Totals ---------- */}
      {t.showMoney && t.showTotals && (
        <section className="pd-totals">
          <div className="pd-total-line">
            <span>Net Total</span>
            <span>{ETB.format(net)}</span>
          </div>
          {tax > 0 && (
            <div className="pd-total-line">
              <span>Taxes & Charges</span>
              <span>{ETB.format(tax)}</span>
            </div>
          )}
          <div className="pd-total-line pd-grand">
            <span>Grand Total</span>
            <span>{ETB.format(grand)}</span>
          </div>
          {str(doc.in_words) && (
            <div className="pd-in-words">In words: {str(doc.in_words)}</div>
          )}
        </section>
      )}

      {/* Payment Entry (no items): show the amount prominently. */}
      {doctype === "Payment Entry" && (
        <section className="pd-totals">
          <div className="pd-total-line pd-grand">
            <span>Amount Paid</span>
            <span>{ETB.format(num(doc.paid_amount))}</span>
          </div>
        </section>
      )}

      {/* ---------- Terms ---------- */}
      {str(doc.terms) && (
        <section className="pd-terms">
          <div className="pd-label">Terms &amp; Conditions</div>
          <div className="pd-terms-body">{str(doc.terms)}</div>
        </section>
      )}

      {/* ---------- Signatures ---------- */}
      <section className="pd-signatures">
        {t.signatures.map((label) => (
          <div key={label} className="pd-sign">
            <div className="pd-sign-line" />
            <div className="pd-sign-label">{label}</div>
          </div>
        ))}
      </section>

      {t.footerNote && <div className="pd-footer-note">{t.footerNote}</div>}
    </div>
  );
}

export default PrintDocument;
