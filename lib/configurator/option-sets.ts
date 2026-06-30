// lib/configurator/option-sets.ts
// V4 Configurator — Pana Print Shop catalog (16 real products).
// Source of truth: `docs/client-data/Products list.pdf` transcribed in
// Phase 2W handoff. Prices are real ETB, customer-facing.
// 2W B3 — REPLACED entirely with real Pana products. Each Common choice
// is marked `is_default: true`. Matrix products use the Pricing discriminator.

import type { OptionSet } from "./types";

export const OPTION_SETS: Record<string, OptionSet> = {
  // 1 ─────────────────────────────────────────────────────────────────────
  "BUSINESS-CARDS": {
    item_code: "BUSINESS-CARDS",
    item_name: "Business Cards",
    category: "Business Cards",
    min_qty: 50,
    pricing: {
      mode: "matrix",
      keyOrder: ["Print Sides", "Paper Thickness", "Lamination"],
      table: {
        "front|250|none": 3.5, "front|250|matte": 4.5, "front|250|glossy": 4.5,
        "front|300|none": 4.0, "front|300|matte": 5.0, "front|300|glossy": 5.0,
        "both|250|none": 7.0,  "both|250|matte": 9.0,  "both|250|glossy": 9.0,
        "both|300|none": 8.0,  "both|300|matte": 10.0, "both|300|glossy": 10.0,
      },
    },
    options: [
      { name: "Size", type: "single", choices: [
        { label: "Standard (8.5 × 5.5 cm)", value: "std", price_delta: 0, is_default: true },
        { label: "US Standard (9 × 5.4 cm)", value: "us", price_delta: 0 },
      ]},
      { name: "Print Sides", type: "single", choices: [
        { label: "Front Print Only", value: "front", price_delta: 0 },
        { label: "Both Side Print", value: "both", price_delta: 0, is_default: true },
      ]},
      { name: "Paper Thickness", type: "single", choices: [
        { label: "250 gsm", value: "250", price_delta: 0, component_item: "PAPER-250GSM", qty_formula: 1 },
        { label: "300 gsm", value: "300", price_delta: 0, component_item: "PAPER-300GSM", qty_formula: 1, is_default: true },
      ]},
      { name: "Corners", type: "single", choices: [
        { label: "Rounded", value: "rounded", price_delta: 0, is_default: true },
        { label: "Sharp Edge", value: "sharp", price_delta: 0 },
      ]},
      { name: "Lamination", type: "single", choices: [
        { label: "None", value: "none", price_delta: 0 },
        { label: "Matte", value: "matte", price_delta: 0, component_item: "LAM-MATTE", qty_formula: 1, is_default: true },
        { label: "Glossy", value: "glossy", price_delta: 0, component_item: "LAM-GLOSSY", qty_formula: 1 },
      ]},
    ],
  },

  // 2 ─────────────────────────────────────────────────────────────────────
  "BROCHURE": {
    item_code: "BROCHURE",
    item_name: "Brochure (150gsm)",
    category: "Brochures",
    min_qty: 50,
    pricing: { mode: "additive", basePrice: 40 }, // A4 = 40, A3 = +40
    options: [
      { name: "Type", type: "single", choices: [
        { label: "Tri-fold", value: "tri", price_delta: 0, is_default: true },
        { label: "Bi-fold", value: "bi", price_delta: 0 },
        { label: "Z-fold", value: "z", price_delta: 0 },
      ]},
      { name: "Unfolded Size", type: "single", choices: [
        { label: "A4 (29.7 × 21 cm)", value: "a4", price_delta: 0, component_item: "PAPER-150GSM", qty_formula: 1, is_default: true },
        { label: "A3 (42 × 29.7 cm)", value: "a3", price_delta: 40, component_item: "PAPER-150GSM", qty_formula: 2 },
      ]},
    ],
  },

  // 3 ─────────────────────────────────────────────────────────────────────
  "FLYERS": {
    item_code: "FLYERS",
    item_name: "Flyers",
    category: "Flyers",
    min_qty: 50,
    pricing: {
      mode: "matrix",
      keyOrder: ["Size", "Paper Thickness", "Print Sides"],
      table: {
        "dl|80|front": 7,  "a6|80|front": 5,  "a5|80|front": 10, "a4|80|front": 20,
        "dl|80|both": 14,  "a6|80|both": 10,  "a5|80|both": 20,  "a4|80|both": 40,
        "dl|150|front": 9, "a6|150|front": 7, "a5|150|front": 14, "a4|150|front": 28,
        "dl|150|both": 18, "a6|150|both": 14, "a5|150|both": 28, "a4|150|both": 54,
      },
    },
    options: [
      { name: "Size", type: "single", choices: [
        { label: "DL (9.9 × 21 cm)", value: "dl", price_delta: 0, is_default: true },
        { label: "A6 (14.85 × 10.5 cm)", value: "a6", price_delta: 0 },
        { label: "A5 (21 × 14.85 cm)", value: "a5", price_delta: 0 },
        { label: "A4 (29.7 × 21 cm)", value: "a4", price_delta: 0 },
      ]},
      { name: "Print Sides", type: "single", choices: [
        { label: "Front Print Only", value: "front", price_delta: 0, is_default: true },
        { label: "Both Side Print", value: "both", price_delta: 0 },
      ]},
      { name: "Paper Thickness", type: "single", choices: [
        { label: "80 gsm", value: "80", price_delta: 0, component_item: "PAPER-80GSM", qty_formula: 1 },
        { label: "150 gsm", value: "150", price_delta: 0, component_item: "PAPER-150GSM", qty_formula: 1, is_default: true },
      ]},
    ],
  },

  // 4 ─────────────────────────────────────────────────────────────────────
  // Booklets: PDF price table truncated. basePrice is a FLAGGED PLACEHOLDER.
  "SADDLE-BOOKLET": {
    item_code: "SADDLE-BOOKLET",
    item_name: "Saddle-Stitched Booklet",
    category: "Booklets",
    min_qty: 50,
    pricing: { mode: "additive", basePrice: 0 }, // TODO(client): page-count pricing
    options: [
      { name: "Size", type: "single", choices: [
        { label: "A4 (29.7 × 21 cm)", value: "a4", price_delta: 0, is_default: true },
        { label: "A5 (21 × 14.85 cm)", value: "a5", price_delta: 0 },
        { label: "A6 (14.85 × 10.5 cm)", value: "a6", price_delta: 0 },
      ]},
      { name: "Cover Paper Thickness", type: "single", choices: [
        { label: "250 gsm", value: "250", price_delta: 0, component_item: "PAPER-250GSM", qty_formula: 1, is_default: true },
        { label: "300 gsm", value: "300", price_delta: 0, component_item: "PAPER-300GSM", qty_formula: 1 },
      ]},
      { name: "Cover Paper Lamination", type: "single", choices: [
        { label: "None", value: "none", price_delta: 0 },
        { label: "Matte", value: "matte", price_delta: 0, component_item: "LAM-MATTE", qty_formula: 1, is_default: true },
        { label: "Glossy", value: "glossy", price_delta: 0, component_item: "LAM-GLOSSY", qty_formula: 1 },
      ]},
      { name: "Inside Paper Type", type: "single", choices: [
        { label: "80 gsm", value: "80", price_delta: 0, component_item: "PAPER-80GSM", qty_formula: 2 },
        { label: "150 gsm", value: "150", price_delta: 0, component_item: "PAPER-150GSM", qty_formula: 2, is_default: true },
        { label: "Same as cover paper", value: "same", price_delta: 0 },
      ]},
    ],
  },

  // 5 ─────────────────────────────────────────────────────────────────────
  "PERFECT-BOOKLET": {
    item_code: "PERFECT-BOOKLET",
    item_name: "Perfect-Bound Booklet",
    category: "Booklets",
    min_qty: 50,
    pricing: { mode: "additive", basePrice: 0 }, // TODO(client): page-count pricing
    options: [
      { name: "Size", type: "single", choices: [
        { label: "A4 (29.7 × 21 cm)", value: "a4", price_delta: 0, is_default: true },
        { label: "A5 (21 × 14.85 cm)", value: "a5", price_delta: 0 },
        { label: "A6 (14.85 × 10.5 cm)", value: "a6", price_delta: 0 },
      ]},
      { name: "Cover Paper Thickness", type: "single", choices: [
        { label: "250 gsm", value: "250", price_delta: 0, component_item: "PAPER-250GSM", qty_formula: 1, is_default: true },
        { label: "300 gsm", value: "300", price_delta: 0, component_item: "PAPER-300GSM", qty_formula: 1 },
      ]},
      { name: "Cover Paper Lamination", type: "single", choices: [
        { label: "None", value: "none", price_delta: 0 },
        { label: "Matte", value: "matte", price_delta: 0, component_item: "LAM-MATTE", qty_formula: 1, is_default: true },
        { label: "Glossy", value: "glossy", price_delta: 0, component_item: "LAM-GLOSSY", qty_formula: 1 },
      ]},
      { name: "Inside Paper Type", type: "single", choices: [
        { label: "80 gsm", value: "80", price_delta: 0, component_item: "PAPER-80GSM", qty_formula: 2 },
        { label: "150 gsm", value: "150", price_delta: 0, component_item: "PAPER-150GSM", qty_formula: 2, is_default: true },
        { label: "Same as cover paper", value: "same", price_delta: 0 },
      ]},
    ],
  },

  // 6 ─────────────────────────────────────────────────────────────────────
  "SPIRAL-BOOKLET": {
    item_code: "SPIRAL-BOOKLET",
    item_name: "Wire-Bound (Spiral) Booklet",
    category: "Booklets",
    min_qty: 50,
    pricing: { mode: "additive", basePrice: 0 }, // TODO(client): page-count pricing
    options: [
      { name: "Size", type: "single", choices: [
        { label: "A4 (29.7 × 21 cm)", value: "a4", price_delta: 0, is_default: true },
        { label: "A3 (42 × 29.7 cm)", value: "a3", price_delta: 0 },
        { label: "A5 (21 × 14.85 cm)", value: "a5", price_delta: 0 },
        { label: "A6 (14.85 × 10.5 cm)", value: "a6", price_delta: 0 },
      ]},
      { name: "Binding Alignment", type: "single", choices: [
        { label: "Left", value: "left", price_delta: 0, is_default: true },
        { label: "Top", value: "top", price_delta: 0 },
        { label: "Right", value: "right", price_delta: 0 },
      ]},
      { name: "Cover Paper Thickness", type: "single", choices: [
        { label: "250 gsm", value: "250", price_delta: 0, component_item: "PAPER-250GSM", qty_formula: 1, is_default: true },
        { label: "300 gsm", value: "300", price_delta: 0, component_item: "PAPER-300GSM", qty_formula: 1 },
      ]},
      { name: "Cover Paper Lamination", type: "single", choices: [
        { label: "None", value: "none", price_delta: 0 },
        { label: "Matte", value: "matte", price_delta: 0, component_item: "LAM-MATTE", qty_formula: 1, is_default: true },
        { label: "Glossy", value: "glossy", price_delta: 0, component_item: "LAM-GLOSSY", qty_formula: 1 },
      ]},
      { name: "Inside Paper Type", type: "single", choices: [
        { label: "80 gsm", value: "80", price_delta: 0, component_item: "PAPER-80GSM", qty_formula: 2 },
        { label: "150 gsm", value: "150", price_delta: 0, component_item: "PAPER-150GSM", qty_formula: 2, is_default: true },
        { label: "Same as cover paper", value: "same", price_delta: 0 },
      ]},
    ],
  },

  // 7 ─────────────────────────────────────────────────────────────────────
  "LETTERHEAD": {
    item_code: "LETTERHEAD",
    item_name: "Letterhead (80gsm, one side)",
    category: "Stationery",
    min_qty: 50,
    pricing: { mode: "additive", basePrice: 15 },
    options: [
      { name: "Paper", type: "single", choices: [
        { label: "80 gsm Plain", value: "80", price_delta: 0, component_item: "PAPER-80GSM", qty_formula: 1, is_default: true },
      ]},
    ],
  },

  // 8 ─────────────────────────────────────────────────────────────────────
  "GIFT-BAG": {
    item_code: "GIFT-BAG",
    item_name: "Premium Gift Bag",
    category: "Promotional",
    min_qty: 50,
    pricing: { mode: "additive", basePrice: 250 }, // A5 = 250, A4 = +100 (350)
    options: [
      { name: "Size", type: "single", choices: [
        { label: "A5 (21 × 14.85 cm)", value: "a5", price_delta: 0, component_item: "PAPER-300GSM", qty_formula: 2 },
        { label: "A4 (29.7 × 21 cm)", value: "a4", price_delta: 100, component_item: "PAPER-300GSM", qty_formula: 2, is_default: true },
      ]},
      { name: "Orientation", type: "single", choices: [
        { label: "Portrait", value: "portrait", price_delta: 0, is_default: true },
        { label: "Landscape", value: "landscape", price_delta: 0 },
      ]},
      { name: "Handle Rope Colors", type: "single", choices: [
        { label: "White", value: "white", price_delta: 0, component_item: "HANDLE-ROPE", qty_formula: 1, is_default: true },
        { label: "Black", value: "black", price_delta: 0, component_item: "HANDLE-ROPE", qty_formula: 1 },
        { label: "Blue", value: "blue", price_delta: 0, component_item: "HANDLE-ROPE", qty_formula: 1 },
        { label: "Burgundy", value: "burgundy", price_delta: 0, component_item: "HANDLE-ROPE", qty_formula: 1 },
      ]},
    ],
  },

  // 9 ─────────────────────────────────────────────────────────────────────
  "FOLDER": {
    item_code: "FOLDER",
    item_name: "Presentation Folder (300gsm)",
    category: "Stationery",
    min_qty: 50,
    pricing: {
      mode: "matrix",
      keyOrder: ["Print Sides", "Pocket"],
      table: {
        "front|1": 350, "front|2": 380,
        "both|1": 400,  "both|2": 450,
      },
    },
    options: [
      { name: "Print Sides", type: "single", choices: [
        { label: "Front Print Only", value: "front", price_delta: 0, is_default: true },
        { label: "Both Side Print", value: "both", price_delta: 0 },
      ]},
      { name: "Lamination", type: "single", choices: [
        { label: "Matte", value: "matte", price_delta: 0, component_item: "LAM-MATTE", qty_formula: 1, is_default: true },
        { label: "Glossy", value: "glossy", price_delta: 0, component_item: "LAM-GLOSSY", qty_formula: 1 },
      ]},
      { name: "Pocket", type: "single", choices: [
        { label: "Right Side (1 pocket)", value: "1", price_delta: 0, is_default: true },
        { label: "Left & Right (2 pockets)", value: "2", price_delta: 0 },
      ]},
    ],
  },

  // 10 ────────────────────────────────────────────────────────────────────
  "POSTER": {
    item_code: "POSTER",
    item_name: "Poster (A3)",
    category: "Large Format",
    min_qty: 50,
    pricing: {
      mode: "matrix",
      keyOrder: ["Paper Thickness", "Lamination"],
      table: {
        "150|none": 54, "150|matte": 70, "150|glossy": 70,
        "250|none": 70, "250|matte": 90, "250|glossy": 90,
      },
    },
    options: [
      { name: "Paper Thickness", type: "single", choices: [
        { label: "150 gsm", value: "150", price_delta: 0, component_item: "PAPER-150GSM", qty_formula: 1, is_default: true },
        { label: "250 gsm", value: "250", price_delta: 0, component_item: "PAPER-250GSM", qty_formula: 1 },
      ]},
      { name: "Lamination", type: "single", choices: [
        { label: "None", value: "none", price_delta: 0, is_default: true },
        { label: "Matte", value: "matte", price_delta: 0, component_item: "LAM-MATTE", qty_formula: 1 },
        { label: "Glossy", value: "glossy", price_delta: 0, component_item: "LAM-GLOSSY", qty_formula: 1 },
      ]},
    ],
  },

  // 11 ────────────────────────────────────────────────────────────────────
  "ENVELOPE": {
    item_code: "ENVELOPE",
    item_name: "Envelope",
    category: "Stationery",
    min_qty: 25,
    pricing: { mode: "additive", basePrice: 25 }, // DL 25, A5 +10 (35), A4 +25 (50)
    options: [
      { name: "Size", type: "single", choices: [
        { label: "DL (9.9 × 21 cm)", value: "dl", price_delta: 0, component_item: "PAPER-150GSM", qty_formula: 1, is_default: true },
        { label: "A5 (21 × 14.85 cm)", value: "a5", price_delta: 10, component_item: "PAPER-150GSM", qty_formula: 1 },
        { label: "A4 (29.7 × 21 cm)", value: "a4", price_delta: 25, component_item: "PAPER-150GSM", qty_formula: 1 },
      ]},
    ],
  },

  // 12 ────────────────────────────────────────────────────────────────────
  "STICKER-SHEET": {
    item_code: "STICKER-SHEET",
    item_name: "Paper Sticker Sheet",
    category: "Stickers & Labels",
    min_qty: 24,
    pricing: {
      mode: "matrix",
      keyOrder: ["Size", "Lamination"],
      table: {
        "a4|none": 50, "a4|matte": 60, "a4|glossy": 60,
        "a5|none": 25, "a5|matte": 30, "a5|glossy": 30,
        "a6|none": 13, "a6|matte": 15, "a6|glossy": 15,
      },
    },
    options: [
      { name: "Size", type: "single", choices: [
        { label: "A4 (29.7 × 21 cm)", value: "a4", price_delta: 0, component_item: "PAPER-STICKER", qty_formula: 1, is_default: true },
        { label: "A5 (21 × 14.85 cm)", value: "a5", price_delta: 0, component_item: "PAPER-STICKER", qty_formula: 1 },
        { label: "A6 (14.85 × 10.5 cm)", value: "a6", price_delta: 0, component_item: "PAPER-STICKER", qty_formula: 1 },
      ]},
      { name: "Lamination", type: "single", choices: [
        { label: "None", value: "none", price_delta: 0, is_default: true },
        { label: "Matte", value: "matte", price_delta: 0, component_item: "LAM-MATTE", qty_formula: 1 },
        { label: "Glossy", value: "glossy", price_delta: 0, component_item: "LAM-GLOSSY", qty_formula: 1 },
      ]},
    ],
  },

  // 13 ────────────────────────────────────────────────────────────────────
  "NOTEBOOK": {
    item_code: "NOTEBOOK",
    item_name: "Notebook",
    category: "Stationery",
    min_qty: 1,
    pricing: { mode: "additive", basePrice: 0 }, // TODO(client): pricing not in source PDF
    options: [
      { name: "Size", type: "single", choices: [
        { label: "A4 (29.7 × 21 cm)", value: "a4", price_delta: 0 },
        { label: "A5 (21 × 14.85 cm)", value: "a5", price_delta: 0, is_default: true },
        { label: "A6 (14.85 × 10.5 cm)", value: "a6", price_delta: 0 },
      ]},
      { name: "Number of Sheets", type: "single", choices: [
        { label: "25 Sheets", value: "25", price_delta: 0, component_item: "PAPER-80GSM", qty_formula: 25 },
        { label: "50 Sheets", value: "50", price_delta: 0, component_item: "PAPER-80GSM", qty_formula: 50, is_default: true },
        { label: "100 Sheets", value: "100", price_delta: 0, component_item: "PAPER-80GSM", qty_formula: 100 },
      ]},
      { name: "Filler Paper", type: "single", choices: [
        { label: "Blank", value: "blank", price_delta: 0 },
        { label: "College Ruled", value: "ruled", price_delta: 0, is_default: true },
        { label: "Custom Full Color", value: "custom", price_delta: 0 },
      ]},
      { name: "Cover Page Print", type: "single", choices: [
        { label: "Cover Pages only", value: "cover", price_delta: 0, is_default: true },
        { label: "Print Including Cover Insides", value: "cover_inside", price_delta: 0 },
      ]},
      { name: "Cover Paper Thickness", type: "single", choices: [
        { label: "250 gsm", value: "250", price_delta: 0, component_item: "PAPER-250GSM", qty_formula: 1, is_default: true },
        { label: "300 gsm", value: "300", price_delta: 0, component_item: "PAPER-300GSM", qty_formula: 1 },
      ]},
      { name: "Cover Paper Lamination", type: "single", choices: [
        { label: "None", value: "none", price_delta: 0 },
        { label: "Matte", value: "matte", price_delta: 0, component_item: "LAM-MATTE", qty_formula: 1, is_default: true },
        { label: "Glossy", value: "glossy", price_delta: 0, component_item: "LAM-GLOSSY", qty_formula: 1 },
      ]},
    ],
  },

  // 14 ────────────────────────────────────────────────────────────────────
  // Print & Cut Stickers — marked "Not Finished" in source. Sales item, NO default BOM.
  "PRINT-CUT-STICKER": {
    item_code: "PRINT-CUT-STICKER",
    item_name: "Print & Cut Stickers",
    category: "Stickers & Labels",
    min_qty: 1,
    pricing: { mode: "additive", basePrice: 0 }, // TODO(client): incomplete spec
    options: [
      { name: "Print Material", type: "single", choices: [
        { label: "Paper Sticker", value: "paper", price_delta: 0, component_item: "PAPER-STICKER", qty_formula: 1, is_default: true },
        { label: "Vinyl Sticker", value: "vinyl", price_delta: 0, component_item: "VINYL-STICKER", qty_formula: 1 },
      ]},
    ],
  },

  // 15 ────────────────────────────────────────────────────────────────────
  "CERTIFICATE": {
    item_code: "CERTIFICATE",
    item_name: "Certificate Paper (A4)",
    category: "Stationery",
    min_qty: 1,
    pricing: { mode: "additive", basePrice: 40 }, // White Hard 40, Textured/Golden 60
    options: [
      { name: "Paper Type", type: "single", choices: [
        { label: "White Hard Paper (300gsm)", value: "white", price_delta: 0, component_item: "CERT-WHITE-300", qty_formula: 1, is_default: true },
        { label: "Textured Paper (250gsm)", value: "textured", price_delta: 20, component_item: "CERT-TEXTURED-250", qty_formula: 1 },
        { label: "Golden Frame Paper", value: "golden", price_delta: 20, component_item: "CERT-GOLDEN", qty_formula: 1 },
      ]},
    ],
  },

  // 16 ────────────────────────────────────────────────────────────────────
  "BOOKMARK": {
    item_code: "BOOKMARK",
    item_name: "Bookmark (5 × 15 cm, 300gsm)",
    category: "Promotional",
    min_qty: 1,
    pricing: {
      mode: "matrix",
      keyOrder: ["Print Side", "Lamination"],
      table: {
        "front|none": 10, "front|matte": 12, "front|glossy": 12,
        "both|none": 20,  "both|matte": 24,  "both|glossy": 24,
      },
    },
    options: [
      { name: "Print Side", type: "single", choices: [
        { label: "Front Only", value: "front", price_delta: 0 },
        { label: "Both Side", value: "both", price_delta: 0, is_default: true },
      ]},
      { name: "Lamination", type: "single", choices: [
        { label: "None", value: "none", price_delta: 0 },
        { label: "Matte", value: "matte", price_delta: 0, component_item: "LAM-MATTE", qty_formula: 1, is_default: true },
        { label: "Glossy", value: "glossy", price_delta: 0, component_item: "LAM-GLOSSY", qty_formula: 1 },
      ]},
    ],
  },
};
