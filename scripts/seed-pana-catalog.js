#!/usr/bin/env node
/**
 * scripts/seed-pana-catalog.js
 * Obsidian ERP v4.0 — Pana Print Shop Catalog Seed
 * Phase 2W PART B — 16 real products, BOMs, Item Prices, configurator data.
 *
 * Idempotent & additive: safe to re-run. Never deletes or overwrites.
 *
 * Usage: pnpm seed:catalog
 *
 * Prerequisites:
 * - Frappe bench running with ERPNext installed
 * - ERP_API_KEY and ERP_API_SECRET environment variables set
 * - Default company configured (resolved via API on first run)
 */

const https = require("https");
const http = require("http");

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const ERP_URL = process.env.NEXT_PUBLIC_ERP_API_URL || process.env.ERP_URL || "http://localhost:8000";
const API_KEY = process.env.ERP_API_KEY;
const API_SECRET = process.env.ERP_API_SECRET;

if (!API_KEY || !API_SECRET) {
  console.error("❌ Missing ERP_API_KEY or ERP_API_SECRET environment variables");
  console.error("Set them in .env.local or export them");
  process.exit(1);
}

// Global state (resolved at runtime)
let COMPANY_NAME = "";
let COMPANY_ABBR = "";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Make a Frappe REST API request. */
async function frappeRequest(endpoint, method = "GET", data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`/api/resource/${endpoint}`, ERP_URL);
    const isHttps = url.protocol === "https:";
    const client = isHttps ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        Authorization: `token ${API_KEY}:${API_SECRET}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    };

    const req = client.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(body);
          if (res.statusCode >= 400) {
            reject(new Error(`API Error ${res.statusCode}: ${JSON.stringify(json)}`));
          } else {
            resolve(json);
          }
        } catch (e) {
          reject(new Error(`Parse Error: ${body.substring(0, 200)}`));
        }
      });
    });

    req.on("error", reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

/** Make a Frappe method call (non-resource endpoint). */
async function frappeMethod(method, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`/api/method/${method}`, ERP_URL);
    const isHttps = url.protocol === "https:";
    const client = isHttps ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: "POST",
      headers: {
        Authorization: `token ${API_KEY}:${API_SECRET}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    };

    const req = client.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(body);
          if (res.statusCode >= 400) {
            reject(new Error(`Method Error ${res.statusCode}: ${JSON.stringify(json)}`));
          } else {
            resolve(json);
          }
        } catch (e) {
          reject(new Error(`Parse Error: ${body.substring(0, 200)}`));
        }
      });
    });

    req.on("error", reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

/** Create a document if it doesn't exist. Returns the doc data or null. */
async function createIfNotExists(doctype, name, data) {
  try {
    await frappeRequest(`${doctype}/${encodeURIComponent(name)}`);
    console.log(`  ✓ ${doctype} "${name}" already exists`);
    return null;
  } catch (e) {
    try {
      const result = await frappeRequest(doctype, "POST", data);
      console.log(`  ✓ Created ${doctype} "${name}"`);
      return result.data;
    } catch (createErr) {
      console.error(`  ✗ Failed to create ${doctype} "${name}":`, createErr.message.substring(0, 200));
      return null;
    }
  }
}

/** Submit a document (set docstatus to 1). */
async function submitDoc(doctype, name) {
  try {
    await frappeMethod("frappe.client.submit", {
      doctype,
      name,
    });
    console.log(`  ✓ Submitted ${doctype} "${name}"`);
    return true;
  } catch (e) {
    console.error(`  ✗ Failed to submit ${doctype} "${name}":`, e.message.substring(0, 200));
    return false;
  }
}

/** Update a single document field via set_value. */
async function setDocValue(doctype, name, fieldname) {
  try {
    await frappeMethod("frappe.client.set_value", {
      doctype,
      name,
      fieldname,
    });
    console.log(`  ✓ Updated ${doctype} "${name}"`);
    return true;
  } catch (e) {
    console.error(`  ✗ Failed to update ${doctype} "${name}":`, e.message.substring(0, 200));
    return false;
  }
}

/** PART B default BOM component table (derived from is_default choices + intrinsic bodies). */
const BOM_ITEMS = {
  "BUSINESS-CARDS": [{ item_code: "PAPER-300GSM", qty: 1 }, { item_code: "LAM-MATTE", qty: 1 }],
  "BROCHURE":      [{ item_code: "PAPER-150GSM", qty: 1 }],
  "FLYERS":        [{ item_code: "PAPER-150GSM", qty: 1 }],
  "SADDLE-BOOKLET":  [{ item_code: "PAPER-250GSM", qty: 1 }, { item_code: "PAPER-150GSM", qty: 2 }, { item_code: "LAM-MATTE", qty: 1 }, { item_code: "STAPLE-WIRE", qty: 1 }],
  "PERFECT-BOOKLET": [{ item_code: "PAPER-250GSM", qty: 1 }, { item_code: "PAPER-150GSM", qty: 2 }, { item_code: "LAM-MATTE", qty: 1 }, { item_code: "BIND-GLUE", qty: 1 }],
  "SPIRAL-BOOKLET":  [{ item_code: "PAPER-250GSM", qty: 1 }, { item_code: "PAPER-150GSM", qty: 2 }, { item_code: "LAM-MATTE", qty: 1 }, { item_code: "SPIRAL-COIL", qty: 1 }],
  "LETTERHEAD":    [{ item_code: "PAPER-80GSM", qty: 1 }],
  "GIFT-BAG":      [{ item_code: "PAPER-300GSM", qty: 2 }, { item_code: "HANDLE-ROPE", qty: 1 }],
  "FOLDER":        [{ item_code: "PAPER-300GSM", qty: 1 }, { item_code: "LAM-MATTE", qty: 1 }],
  "POSTER":        [{ item_code: "PAPER-150GSM", qty: 1 }],
  "ENVELOPE":      [{ item_code: "PAPER-150GSM", qty: 1 }],
  "STICKER-SHEET": [{ item_code: "PAPER-STICKER", qty: 1 }],
  "NOTEBOOK":      [{ item_code: "PAPER-250GSM", qty: 1 }, { item_code: "PAPER-80GSM", qty: 50 }, { item_code: "LAM-MATTE", qty: 1 }],
  "CERTIFICATE":   [{ item_code: "CERT-WHITE-300", qty: 1 }],
  "BOOKMARK":      [{ item_code: "PAPER-300GSM", qty: 1 }, { item_code: "LAM-MATTE", qty: 1 }],
  // PRINT-CUT-STICKER: no BOM (incomplete spec)
};

// Products with pricing TBD (basePrice or matrix table incomplete)
const PRICING_TBD = ["SADDLE-BOOKLET", "PERFECT-BOOKLET", "SPIRAL-BOOKLET", "NOTEBOOK", "PRINT-CUT-STICKER"];
const SKIP_BOM = ["PRINT-CUT-STICKER"]; // no BOM; incomplete spec

/** Item Prices (base rate). Products with TBD pricing are skipped. */
const ITEM_PRICES = {
  "BUSINESS-CARDS": 10.0,    // both/300/matte
  "BROCHURE":       40.0,    // A4
  "FLYERS":         9.0,     // DL/150/front
  "LETTERHEAD":     15.0,    // flat
  "GIFT-BAG":       350.0,   // A4
  "FOLDER":         350.0,   // front/1-pocket
  "POSTER":         54.0,    // 150/none
  "ENVELOPE":       25.0,    // DL
  "STICKER-SHEET":  50.0,    // A4/none
  "CERTIFICATE":    40.0,    // white
  "BOOKMARK":       24.0,    // both/matte
};

// ---------------------------------------------------------------------------
// Main seed
// ---------------------------------------------------------------------------

async function seed() {
  console.log("\n📇 Pana Print Shop — Catalog Seed\n");
  console.log(`Connecting to: ${ERP_URL}\n`);

  // ---- Step 0: Resolve default company --------------------------------------
  console.log("🏢 Resolving company...");
  try {
    // Try to get the first company from Frappe
    const companies = await frappeRequest("Company?limit=1&fields=[\"name\",\"abbr\"]");
    const doc = companies?.data?.[0];
    if (doc?.name) {
      COMPANY_NAME = doc.name;
      COMPANY_ABBR = doc.abbr || COMPANY_NAME.slice(0, 3).toUpperCase();
      console.log(`  ✓ Company: "${COMPANY_NAME}" (abbr: "${COMPANY_ABBR}")`);
    } else {
      throw new Error("No company found");
    }
  } catch (e) {
    console.error("  ✗ Could not resolve company:", e.message.substring(0, 200));
    console.log("  → Defaulting to 'Obsidian Demo PLC' / 'OD'");
    COMPANY_NAME = "Obsidian Demo PLC";
    COMPANY_ABBR = "OD";
  }

  // ---- Step 1: Item Groups --------------------------------------------------
  console.log("\n📁 Step 1: Item Groups");
  const PARENT_GROUPS = [
    { name: "Pana Print Products", is_group: 1 },
    { name: "Pana Raw Materials", is_group: 1 },
  ];
  const PRODUCT_GROUPS = [
    "Business Cards", "Brochures", "Flyers", "Booklets",
    "Stationery", "Promotional", "Stickers & Labels", "Large Format",
  ];
  const RAW_GROUPS = [
    "Paper Stock", "Lamination", "Binding & Finishing",
  ];

  for (const pg of PARENT_GROUPS) {
    await createIfNotExists("Item Group", pg.name, {
      item_group_name: pg.name,
      is_group: pg.is_group,
    });
  }
  for (const name of PRODUCT_GROUPS) {
    await createIfNotExists("Item Group", name, {
      item_group_name: name,
      is_group: 0,
      parent_item_group: "Pana Print Products",
    });
  }
  for (const name of RAW_GROUPS) {
    await createIfNotExists("Item Group", name, {
      item_group_name: name,
      is_group: 0,
      parent_item_group: "Pana Raw Materials",
    });
  }

  // ---- Step 2: Manufacturing masters ----------------------------------------
  console.log("\n🔧 Step 2: Manufacturing Masters");
  await createIfNotExists("Workstation", "Pana Print Floor", {
    workstation_name: "Pana Print Floor",
    hour_rate: 0,
  });
  await createIfNotExists("Operation", "Print & Finish", {
    name: "Print & Finish",
    workstation: "Pana Print Floor",
  });

  // ---- Step 3: Raw-material Items -------------------------------------------
  console.log("\n📦 Step 3: Raw Material Items");
  const RAW_MATERIALS = [
    { item_code: "PAPER-80GSM",   item_name: "Paper 80gsm (sheet)",        item_group: "Paper Stock",          valuation_rate: 1.0 },
    { item_code: "PAPER-150GSM",  item_name: "Paper 150gsm (sheet)",       item_group: "Paper Stock",          valuation_rate: 1.5 },
    { item_code: "PAPER-250GSM",  item_name: "Paper 250gsm (sheet)",       item_group: "Paper Stock",          valuation_rate: 2.0 },
    { item_code: "PAPER-300GSM",  item_name: "Paper 300gsm (sheet)",       item_group: "Paper Stock",          valuation_rate: 2.5 },
    { item_code: "LAM-MATTE",     item_name: "Matte Lamination Film (sheet)", item_group: "Lamination",        valuation_rate: 0.5 },
    { item_code: "LAM-GLOSSY",    item_name: "Glossy Lamination Film (sheet)", item_group: "Lamination",       valuation_rate: 0.5 },
    { item_code: "PAPER-STICKER", item_name: "Paper Sticker Stock (sheet)", item_group: "Paper Stock",          valuation_rate: 3.0 },
    { item_code: "VINYL-STICKER", item_name: "Vinyl Sticker Stock (sheet)", item_group: "Paper Stock",          valuation_rate: 5.0 },
    { item_code: "CERT-WHITE-300",   item_name: "Certificate White Hard 300gsm (sheet)", item_group: "Paper Stock", valuation_rate: 4.0 },
    { item_code: "CERT-TEXTURED-250", item_name: "Certificate Textured 250gsm (sheet)",  item_group: "Paper Stock", valuation_rate: 6.0 },
    { item_code: "CERT-GOLDEN",   item_name: "Certificate Golden Frame (sheet)", item_group: "Paper Stock",       valuation_rate: 6.0 },
    { item_code: "HANDLE-ROPE",   item_name: "Gift Bag Handle Rope (set)",   item_group: "Binding & Finishing", valuation_rate: 5.0 },
    { item_code: "SPIRAL-COIL",   item_name: "Spiral Binding Coil",          item_group: "Binding & Finishing", valuation_rate: 3.0 },
    { item_code: "STAPLE-WIRE",   item_name: "Saddle Staple Wire (set)",     item_group: "Binding & Finishing", valuation_rate: 0.5 },
    { item_code: "BIND-GLUE",     item_name: "Perfect-Bind Glue (unit)",     item_group: "Binding & Finishing", valuation_rate: 1.0 },
  ];

  for (const rm of RAW_MATERIALS) {
    await createIfNotExists("Item", rm.item_code, {
      item_code: rm.item_code,
      item_name: rm.item_name,
      item_group: rm.item_group,
      stock_uom: "Nos",
      is_stock_item: 1,
      is_purchase_item: 1,
      is_sales_item: 0,
      include_item_in_manufacturing: 1,
      valuation_rate: rm.valuation_rate,
    });
  }

  // ---- Step 4: Finished-good Items ------------------------------------------
  console.log("\n🎯 Step 4: Finished-good Items");
  const FINISHED_GOODS = [
    { item_code: "BUSINESS-CARDS",  item_name: "Business Cards",           item_group: "Business Cards",   min_qty: 50 },
    { item_code: "BROCHURE",        item_name: "Brochure (150gsm)",        item_group: "Brochures",        min_qty: 50 },
    { item_code: "FLYERS",          item_name: "Flyers",                   item_group: "Flyers",           min_qty: 50 },
    { item_code: "SADDLE-BOOKLET",  item_name: "Saddle-Stitched Booklet",  item_group: "Booklets",         min_qty: 50 },
    { item_code: "PERFECT-BOOKLET", item_name: "Perfect-Bound Booklet",    item_group: "Booklets",         min_qty: 50 },
    { item_code: "SPIRAL-BOOKLET",  item_name: "Wire-Bound (Spiral) Booklet", item_group: "Booklets",       min_qty: 50 },
    { item_code: "LETTERHEAD",      item_name: "Letterhead (80gsm, one side)", item_group: "Stationery",    min_qty: 50 },
    { item_code: "GIFT-BAG",        item_name: "Premium Gift Bag",          item_group: "Promotional",      min_qty: 50 },
    { item_code: "FOLDER",          item_name: "Presentation Folder (300gsm)", item_group: "Stationery",    min_qty: 50 },
    { item_code: "POSTER",          item_name: "Poster (A3)",               item_group: "Large Format",     min_qty: 50 },
    { item_code: "ENVELOPE",        item_name: "Envelope",                  item_group: "Stationery",       min_qty: 25 },
    { item_code: "STICKER-SHEET",   item_name: "Paper Sticker Sheet",       item_group: "Stickers & Labels", min_qty: 24 },
    { item_code: "NOTEBOOK",        item_name: "Notebook",                  item_group: "Stationery",       min_qty: 1 },
    { item_code: "PRINT-CUT-STICKER", item_name: "Print & Cut Stickers",     item_group: "Stickers & Labels", min_qty: 1 },
    { item_code: "CERTIFICATE",     item_name: "Certificate Paper (A4)",    item_group: "Stationery",       min_qty: 1 },
    { item_code: "BOOKMARK",        item_name: "Bookmark (5 × 15 cm, 300gsm)", item_group: "Promotional",  min_qty: 1 },
  ];

  for (const fg of FINISHED_GOODS) {
    await createIfNotExists("Item", fg.item_code, {
      item_code: fg.item_code,
      item_name: fg.item_name,
      item_group: fg.item_group,
      stock_uom: "Nos",
      is_stock_item: 1,
      is_sales_item: 1,
      is_purchase_item: 0,
      include_item_in_manufacturing: 1,
      min_order_qty: fg.min_qty,
    });
  }

  // ---- Step 5: Item Prices --------------------------------------------------
  console.log("\n💰 Step 5: Item Prices (Standard Selling / ETB)");
  for (const [itemCode, rate] of Object.entries(ITEM_PRICES)) {
    const priceName = `${itemCode}-Standard Selling`;
    await createIfNotExists("Item Price", priceName, {
      item_code: itemCode,
      price_list: "Standard Selling",
      price_list_rate: rate,
      currency: "ETB",
    });
  }
  console.log("  (Skipped TBD-priced products: SADDLE-BOOKLET, PERFECT-BOOKLET, SPIRAL-BOOKLET, NOTEBOOK, PRINT-CUT-STICKER)");

  // ---- Step 6: Default BOMs -------------------------------------------------
  console.log("\n⚙️ Step 6: Default BOMs (with operations, submitted)");
  const createdBoms = {}; // item_code → bom_name

  for (const [itemCode, components] of Object.entries(BOM_ITEMS)) {
    if (SKIP_BOM.includes(itemCode)) {
      console.log(`  ∼ Skipping BOM for "${itemCode}" (incomplete spec)`);
      continue;
    }

    const bomName = `${itemCode}-BOM`;
    const doc = await createIfNotExists("BOM", bomName, {
      name: bomName,
      item: itemCode,
      quantity: 1,
      company: COMPANY_NAME,
      currency: "ETB",
      is_default: 1,
      is_active: 1,
      with_operations: 1,
      items: components.map((c) => ({
        item_code: c.item_code,
        qty: c.qty,
      })),
      operations: [
        {
          operation: "Print & Finish",
          workstation: "Pana Print Floor",
          time_in_mins: 30,
        },
      ],
    });

    if (doc) {
      createdBoms[itemCode] = doc.name || bomName;
      // Submit the BOM so it's selectable on a Work Order
      const submitted = await submitDoc("BOM", doc.name || bomName);
      if (!submitted) {
        console.warn(`  ⚠ BOM "${bomName}" created but not submitted — WO might not find it`);
      }
    }
  }

  // ---- Step 7: Back-fill default_bom on Items -------------------------------
  console.log("\n🔗 Step 7: Back-fill default_bom on finished goods");
  for (const [itemCode, bomName] of Object.entries(createdBoms)) {
    await setDocValue("Item", itemCode, { default_bom: bomName });
  }

  // ---- Step 8: Summary ------------------------------------------------------
  console.log("\n" + "=".repeat(60));
  console.log("✅ Pana Catalog Seed Complete!");
  console.log("=".repeat(60));
  console.log(`\n📊 Summary:`);
  console.log(`  • Item Groups:       ${PARENT_GROUPS.length + PRODUCT_GROUPS.length + RAW_GROUPS.length} (parents + children)`);
  console.log(`  • Manufacturing:     Workstation "Pana Print Floor" + Operation "Print & Finish"`);
  console.log(`  • Raw Materials:     ${RAW_MATERIALS.length} items (with valuation_rate)`);
  console.log(`  • Finished Goods:    ${FINISHED_GOODS.length} items`);
  console.log(`  • Item Prices:       ${Object.keys(ITEM_PRICES).length} (Standard Selling, ETB)`);
  console.log(`  • BOMs:              ${Object.keys(createdBoms).length} (submitted, with Print & Finish operation)`);
  console.log(`  • default_bom set:   ${Object.keys(createdBoms).length} items`);
  console.log(`\n⚠️  Items with TBD pricing (need client confirmation):`);
  for (const code of PRICING_TBD) {
    console.log(`    - ${code}`);
  }
  console.log(`\n⚠️  No BOM created for PRINT-CUT-STICKER (incomplete spec, marked "Not Finished" in source).`);
  console.log(`\n📝 Re-run safe: all operations are idempotent.`);
}

seed().catch((err) => {
  console.error("\n❌ Seed failed:", err.message);
  process.exit(1);
});
