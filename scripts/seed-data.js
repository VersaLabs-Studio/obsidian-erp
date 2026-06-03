#!/usr/bin/env node
/**
 * scripts/seed-data.js
 * Obsidian ERP v4.0 - Demo Seed Data
 * Per Part 4 §7.3 — creates sample data for development and manual testing
 *
 * Usage: node scripts/seed-data.js
 *
 * Prerequisites:
 * - Frappe bench running with ERPNext installed
 * - ERP_API_KEY and ERP_API_SECRET environment variables set
 * - or run: bench --site obsidian.localhost execute frappe.client.generate_keys --args '["Administrator"]'
 */

const https = require("https");
const http = require("http");

// Configuration
const ERP_URL = process.env.NEXT_PUBLIC_ERP_API_URL || process.env.ERP_URL || "http://localhost:8000";
const API_KEY = process.env.ERP_API_KEY;
const API_SECRET = process.env.ERP_API_SECRET;

if (!API_KEY || !API_SECRET) {
  console.error("❌ Missing ERP_API_KEY or ERP_API_SECRET environment variables");
  console.error("Set them in .env.local or export them");
  process.exit(1);
}

/**
 * Make a Frappe API request
 */
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

/**
 * Create a document if it doesn't exist
 */
async function createIfNotExists(doctype, name, data) {
  try {
    // Check if exists
    await frappeRequest(`${doctype}/${name}`);
    console.log(`  ✓ ${doctype} "${name}" already exists`);
    return null;
  } catch (e) {
    // Doesn't exist, create it
    try {
      const result = await frappeRequest(doctype, "POST", data);
      console.log(`  ✓ Created ${doctype} "${name}"`);
      return result.data;
    } catch (createErr) {
      console.error(`  ✗ Failed to create ${doctype} "${name}":`, createErr.message);
      return null;
    }
  }
}

/**
 * Main seed function
 */
async function seed() {
  console.log("\n🪨 Obsidian ERP v4.0 — Seed Data Script\n");
  console.log(`Connecting to: ${ERP_URL}\n`);

  // =========================================================================
  // 1. COMPANY
  // =========================================================================
  console.log("📦 Seeding Company...");
  await createIfNotExists("Company", "Obsidian Demo PLC", {
    company_name: "Obsidian Demo PLC",
    default_currency: "ETB",
    country: "Ethiopia",
    domain: "Manufacturing",
  });

  // =========================================================================
  // 2. CUSTOMERS
  // =========================================================================
  console.log("\n👥 Seeding Customers...");
  await createIfNotExists("Customer", "Abebe Trading PLC", {
    customer_name: "Abebe Trading PLC",
    customer_type: "Company",
    customer_group: "Commercial",
    territory: "Ethiopia",
  });

  await createIfNotExists("Customer", "Beta Printing House", {
    customer_name: "Beta Printing House",
    customer_type: "Company",
    customer_group: "Commercial",
    territory: "Ethiopia",
  });

  await createIfNotExists("Customer", "Gamma Advertising Agency", {
    customer_name: "Gamma Advertising Agency",
    customer_type: "Company",
    customer_group: "Commercial",
    territory: "Ethiopia",
  });

  // =========================================================================
  // 3. SUPPLIERS
  // =========================================================================
  console.log("\n🏭 Seeding Suppliers...");
  await createIfNotExists("Supplier", "Paper World PLC", {
    supplier_name: "Paper World PLC",
    supplier_group: "Local",
  });

  await createIfNotExists("Supplier", "Ink Solutions Ethiopia", {
    supplier_name: "Ink Solutions Ethiopia",
    supplier_group: "Local",
  });

  // =========================================================================
  // 4. ITEMS
  // =========================================================================
  console.log("\n📦 Seeding Items...");

  // Business Cards - Premium Matte (BC-PM)
  await createIfNotExists("Item", "BC-PM", {
    item_code: "BC-PM",
    item_name: "Business Cards - Premium Matte",
    item_group: "Printing",
    stock_uom: "Nos",
    is_stock_item: 1,
    is_sales_item: 1,
    is_purchase_item: 0,
    description: "Premium matte finish business cards, 350gsm card stock",
  });

  // Flyers - Glossy A5
  await createIfNotExists("Item", "FLY-A5-G", {
    item_code: "FLY-A5-G",
    item_name: "Flyers - Glossy A5",
    item_group: "Printing",
    stock_uom: "Nos",
    is_stock_item: 1,
    is_sales_item: 1,
    is_purchase_item: 0,
    description: "A5 glossy flyers, 150gsm",
  });

  // Brochures - Tri-fold
  await createIfNotExists("Item", "BRO-TRI", {
    item_code: "BRO-TRI",
    item_name: "Brochures - Tri-fold",
    item_group: "Printing",
    stock_uom: "Nos",
    is_stock_item: 1,
    is_sales_item: 1,
    is_purchase_item: 0,
    description: "Tri-fold brochures, premium stock",
  });

  // Paper Stock (raw material)
  await createIfNotExists("Item", "PAPER-350GSM", {
    item_code: "PAPER-350GSM",
    item_name: "Card Stock 350gsm",
    item_group: "Raw Material",
    stock_uom: "Kg",
    is_stock_item: 1,
    is_sales_item: 0,
    is_purchase_item: 1,
    description: "350gsm premium card stock for business cards",
  });

  // =========================================================================
  // 5. ITEM PRICES
  // =========================================================================
  console.log("\n💰 Seeding Item Prices...");
  await createIfNotExists("Item Price", "BC-PM-Standard Selling", {
    item_code: "BC-PM",
    price_list: "Standard Selling",
    price_list_rate: 15.5,
    currency: "ETB",
  });

  await createIfNotExists("Item Price", "FLY-A5-G-Standard Selling", {
    item_code: "FLY-A5-G",
    price_list: "Standard Selling",
    price_list_rate: 8.0,
    currency: "ETB",
  });

  // =========================================================================
  // 6. WAREHOUSES
  // =========================================================================
  console.log("\n🏭 Seeding Warehouses...");
  await createIfNotExists("Warehouse", "Stores - OD", {
    warehouse_name: "Stores",
    company: "Obsidian Demo PLC",
    is_group: 0,
  });

  await createIfNotExists("Warehouse", "Finished Goods - OD", {
    warehouse_name: "Finished Goods",
    company: "Obsidian Demo PLC",
    is_group: 0,
  });

  await createIfNotExists("Warehouse", "Work In Progress - OD", {
    warehouse_name: "Work In Progress",
    company: "Obsidian Demo PLC",
    is_group: 0,
  });

  // =========================================================================
  // 7. LEADS
  // =========================================================================
  console.log("\n📋 Seeding Leads...");
  await createIfNotExists("Lead", "LEAD-00001", {
    lead_name: "Dawit Mekonnen",
    company_name: "Dawit Enterprises",
    email: "dawit@example.com",
    source: "Cold Calling",
    status: "Lead",
    lead_owner: "Administrator",
  });

  // =========================================================================
  // DONE
  // =========================================================================
  console.log("\n" + "=".repeat(50));
  console.log("✅ Seed data complete!");
  console.log("=".repeat(50));
  console.log("\nNext steps:");
  console.log("1. Run: pnpm dev");
  console.log("2. Visit: http://localhost:3000");
  console.log("3. Navigate to any module to see the seeded data\n");
}

seed().catch((err) => {
  console.error("\n❌ Seed failed:", err.message);
  process.exit(1);
});
