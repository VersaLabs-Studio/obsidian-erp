#!/usr/bin/env node
/**
 * Obsidian ERP v4.0 - Type Generation Script
 *
 * Generates TypeScript interfaces and Zod schemas from Frappe DocType metadata.
 *
 * Usage:
 *   node scripts/generate-types.js Item Customer SalesOrder
 *   node scripts/generate-types.js --all
 *   node scripts/generate-types.js Item --dry-run
 *
 * Environment Variables Required:
 *   NEXT_PUBLIC_ERP_API_URL - Frappe API URL
 *   ERP_API_KEY - API Key
 *   ERP_API_SECRET - API Secret
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

// Load environment variables from .env file using dotenv
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

// Configuration
const CONFIG = {
  apiUrl: process.env.NEXT_PUBLIC_ERP_API_URL,
  apiKey: process.env.ERP_API_KEY,
  apiSecret: process.env.ERP_API_SECRET,
  outputTypesPath: path.join(__dirname, "..", "types", "doctype-types.ts"),
  outputSchemasPath: path.join(
    __dirname,
    "..",
    "lib",
    "schemas",
    "doctype-schemas.ts"
  ),
};

// Known DocTypes for --all flag
// Comprehensive list of standard ERPNext/Frappe DocTypes
const KNOWN_DOCTYPES = [
  // --- CORE & SETUP ---
  "User",
  "Company",
  "Currency",
  "Country",
  "Territory",
  "Department",
  "Designation",
  "Branch",
  "Employee",
  "Salutation",
  "Gender",
  "Letter Head",
  "Print Heading",
  "Terms and Conditions",

  // --- SELLING (CRM & SALES) ---
  "Lead",
  "Lead Source",
  "Industry Type",
  "Opportunity",
  "Customer",
  "Customer Group",
  "Contact",
  "Address",
  "Quotation",
  "Sales Order",
  "Sales Partner",
  "Sales Person",
  "Blanket Order",
  "Installation Note",

  // --- BUYING (PURCHASING) ---
  "Supplier",
  "Supplier Group",
  "Material Request",
  "Request for Quotation",
  "Supplier Quotation",
  "Purchase Order",
  "Purchase Receipt",
  "Purchase Invoice",

  // --- STOCK (INVENTORY) ---
  "Item",
  "Item Group",
  "Item Price",
  "Product Bundle",
  "Warehouse",
  "UOM",
  "Brand",
  "Stock Entry",
  "Delivery Note",
  "Stock Reconciliation",
  "Batch",
  "Serial No",
  "Quality Inspection",
  "Landed Cost Voucher",
  "Stock Ledger Entry",

  // --- ACCOUNTING ---
  "Account",
  "Cost Center",
  "Journal Entry",
  "Payment Entry",
  "Sales Invoice",
  "Payment Terms Template",
  "Mode of Payment",
  "Fiscal Year",
  "Period Closing Voucher",
  "Asset",
  "Asset Category",
  "Asset Movement",

  // --- MANUFACTURING ---
  "Work Order",
  "BOM",
  "Workstation",
  "Operation",
  "Production Plan",
  "Job Card",
  "Downtime Entry",

  // --- HR & PAYROLL ---
  // Note: These require the 'hrms' app which may not be installed on all instances
  // "Leave Application",
  // "Leave Type",
  // "Attendance",
  // "Salary Structure",
  // "Salary Slip",
  // "Payroll Entry",
  // "Expense Claim",
  // "Job Applicant",
  // "Shift Type",

  // --- PROJECTS ---
  "Project",
  "Task",
  "Activity Type",
  "Timesheet",
  "Project Type",

  // --- SUPPORT ---
  "Issue",
  "Warranty Claim",
  "Maintenance Visit",
  "Maintenance Schedule",
];

// Frappe field type to TypeScript type mapping
const FIELD_TYPE_MAP = {
  Data: "string",
  Link: "string",
  "Dynamic Link": "string",
  Select: "string", // Will be refined to union if options exist
  "Read Only": "string",
  Text: "string",
  "Small Text": "string",
  "Long Text": "string",
  "Text Editor": "string",
  HTML: "string",
  "HTML Editor": "string",
  "Markdown Editor": "string",
  Code: "string",
  Password: "string",
  Int: "number",
  Float: "number",
  Currency: "number",
  Percent: "number",
  Rating: "number",
  Check: "0 | 1",
  Date: "string",
  Datetime: "string",
  Time: "string",
  Duration: "string",
  Attach: "string",
  "Attach Image": "string",
  Barcode: "string",
  Color: "string",
  Signature: "string",
  Geolocation: "string",
  Phone: "string",
  Table: "unknown[]", // Will be refined if child doctype is known
  "Table MultiSelect": "unknown[]",
  JSON: "Record<string, unknown>",
};

// Frappe field type to Zod schema mapping
const FIELD_ZOD_MAP = {
  Data: "z.string()",
  Link: "z.string()",
  "Dynamic Link": "z.string()",
  Select: "z.string()",
  "Read Only": "z.string()",
  Text: "z.string()",
  "Small Text": "z.string()",
  "Long Text": "z.string()",
  "Text Editor": "z.string()",
  HTML: "z.string()",
  "HTML Editor": "z.string()",
  "Markdown Editor": "z.string()",
  Code: "z.string()",
  Password: "z.string()",
  Int: "z.number().int()",
  Float: "z.number()",
  Currency: "z.number()",
  Percent: "z.number()",
  Rating: "z.number()",
  Check: "z.union([z.literal(0), z.literal(1)])",
  Date: "z.string()",
  Datetime: "z.string()",
  Time: "z.string()",
  Duration: "z.string()",
  Attach: "z.string()",
  "Attach Image": "z.string()",
  Barcode: "z.string()",
  Color: "z.string()",
  Signature: "z.string()",
  Geolocation: "z.string()",
  Phone: "z.string()",
  Table: "z.array(z.unknown())",
  "Table MultiSelect": "z.array(z.unknown())",
  JSON: "z.record(z.unknown())",
};

// Standard Frappe fields present on all DocTypes
const STANDARD_FIELDS = [
  { fieldname: "name", fieldtype: "Data", label: "ID", reqd: 1 },
  { fieldname: "owner", fieldtype: "Link", label: "Owner", reqd: 0 },
  {
    fieldname: "creation",
    fieldtype: "Datetime",
    label: "Created On",
    reqd: 0,
  },
  {
    fieldname: "modified",
    fieldtype: "Datetime",
    label: "Modified On",
    reqd: 0,
  },
  {
    fieldname: "modified_by",
    fieldtype: "Link",
    label: "Modified By",
    reqd: 0,
  },
  {
    fieldname: "docstatus",
    fieldtype: "Int",
    label: "Document Status",
    reqd: 0,
    options: "0 | 1 | 2",
  },
];

/**
 * Make HTTP request to Frappe API with retries
 */
function frappeRequest(endpoint, retries = 3, delay = 1000) {
  return new Promise((resolve, reject) => {
    if (!CONFIG.apiUrl) {
      reject(new Error("NEXT_PUBLIC_ERP_API_URL is not set"));
      return;
    }

    const executeRequest = (currentAttempt) => {
      const url = new URL(endpoint, CONFIG.apiUrl);
      const protocol = url.protocol === "https:" ? https : http;
      const token = `${CONFIG.apiKey}:${CONFIG.apiSecret}`;

      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === "https:" ? 443 : 80),
        path: url.pathname + url.search,
        method: "GET",
        headers: {
          Authorization: `token ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      };

      const req = protocol.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            if (res.statusCode >= 400) {
              // Don't retry on 404 or other client errors unless they are transient
              if (res.statusCode === 404) {
                return reject(
                  new Error(
                    `API Error ${res.statusCode}: ${JSON.stringify(json)}`
                  )
                );
              }

              if (currentAttempt < retries) {
                console.warn(
                  `  ⚠️  Attempt ${currentAttempt} failed with status ${res.statusCode}. Retrying...`
                );
                setTimeout(
                  () => executeRequest(currentAttempt + 1),
                  delay * currentAttempt
                );
                return;
              }

              reject(
                new Error(
                  `API Error ${res.statusCode}: ${JSON.stringify(json)}`
                )
              );
            } else {
              resolve(json);
            }
          } catch (e) {
            if (currentAttempt < retries) {
              setTimeout(
                () => executeRequest(currentAttempt + 1),
                delay * currentAttempt
              );
              return;
            }
            reject(new Error(`Failed to parse response: ${data}`));
          }
        });
      });

      req.on("error", (e) => {
        if (currentAttempt < retries) {
          console.warn(
            `  ⚠️  Attempt ${currentAttempt} failed: ${e.message}. Retrying...`
          );
          setTimeout(
            () => executeRequest(currentAttempt + 1),
            delay * currentAttempt
          );
          return;
        }
        reject(new Error(`Request failed: ${e.message}`));
      });

      req.setTimeout(30000, () => {
        req.destroy();
        if (currentAttempt < retries) {
          console.warn(
            `  ⚠️  Attempt ${currentAttempt} timed out. Retrying...`
          );
          setTimeout(
            () => executeRequest(currentAttempt + 1),
            delay * currentAttempt
          );
          return;
        }
        reject(new Error("Request timed out (30s)"));
      });

      req.end();
    };

    executeRequest(1);
  });
}

/**
 * Fetch DocType metadata from Frappe
 */
async function fetchDocTypeMeta(doctype) {
  console.log(`  Fetching metadata for: ${doctype}`);

  try {
    // Try the DocType resource endpoint first
    const response = await frappeRequest(
      `/api/resource/DocType/${encodeURIComponent(doctype)}`
    );

    if (response.data) {
      return response.data;
    }

    throw new Error("No data in response");
  } catch (error) {
    console.error(`  ❌ Failed to fetch ${doctype}: ${error.message}`);
    throw error;
  }
}

/**
 * Convert DocType name to PascalCase TypeScript name
 */
function toPascalCase(str) {
  return str
    .split(/[\s_-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}

/**
 * Convert DocType name to camelCase
 */
function toCamelCase(str) {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Generate TypeScript interface for a DocType
 */
function generateInterface(doctype, fields) {
  const typeName = toPascalCase(doctype);
  const allFields = [...fields, ...STANDARD_FIELDS];

  let code = `/**\n * ${doctype} DocType\n * @doctype ${doctype}\n * @generated ${new Date().toISOString()}\n */\nexport interface ${typeName} {\n`;

  // Track seen field names to avoid duplicates
  const seenFields = new Set();

  for (const field of allFields) {
    if (!field.fieldname || seenFields.has(field.fieldname)) continue;
    seenFields.add(field.fieldname);

    // Skip section/column breaks and other layout fields
    if (
      [
        "Section Break",
        "Column Break",
        "Tab Break",
        "Fold",
        "Heading",
      ].includes(field.fieldtype)
    ) {
      continue;
    }

    const tsType = FIELD_TYPE_MAP[field.fieldtype] || "unknown";
    const isRequired = field.reqd === 1;
    const optionalMark = isRequired ? "" : "?";

    // Handle Select fields with options
    let finalType = tsType;
    if (field.fieldtype === "Select" && field.options) {
      const options = field.options.split("\n").filter((o) => o.trim());
      if (options.length > 0 && options.length < 20) {
        finalType = options.map((o) => `"${o.trim()}"`).join(" | ");
      }
    }

    // Handle docstatus special case
    if (field.fieldname === "docstatus") {
      finalType = "0 | 1 | 2";
    }

    // Add JSDoc comment
    if (field.label) {
      code += `  /** ${field.label}${
        field.description ? " - " + field.description : ""
      } */\n`;
    }

    code += `  ${field.fieldname}${optionalMark}: ${finalType};\n`;
  }

  code += "}\n";

  // Generate Create Request type
  const requiredFields = allFields.filter(
    (f) =>
      f.reqd === 1 &&
      ![
        "name",
        "owner",
        "creation",
        "modified",
        "modified_by",
        "docstatus",
      ].includes(f.fieldname) &&
      ![
        "Section Break",
        "Column Break",
        "Tab Break",
        "Fold",
        "Heading",
      ].includes(f.fieldtype)
  );

  const optionalFields = allFields.filter(
    (f) =>
      f.reqd !== 1 &&
      ![
        "name",
        "owner",
        "creation",
        "modified",
        "modified_by",
        "docstatus",
      ].includes(f.fieldname) &&
      ![
        "Section Break",
        "Column Break",
        "Tab Break",
        "Fold",
        "Heading",
      ].includes(f.fieldtype)
  );

  if (requiredFields.length > 0) {
    code += `\n/**\n * ${doctype} Create Request\n * Fields required to create a new ${doctype}\n */\n`;
    code += `export type ${typeName}CreateRequest = Pick<${typeName}, ${requiredFields
      .map((f) => `"${f.fieldname}"`)
      .join(" | ")}>`;

    if (optionalFields.length > 0) {
      const limitedOptional = optionalFields.slice(0, 10); // Limit to avoid huge types
      code += ` & Partial<Pick<${typeName}, ${limitedOptional
        .map((f) => `"${f.fieldname}"`)
        .join(" | ")}>>`;
    }
    code += ";\n";
  }

  // Generate Update Request type
  code += `\n/**\n * ${doctype} Update Request\n * All fields optional for update\n */\n`;
  code += `export type ${typeName}UpdateRequest = Partial<Omit<${typeName}, "name" | "creation" | "owner" | "docstatus">>;\n`;

  return code;
}

/**
 * Generate Zod schema for a DocType
 */
function generateZodSchema(doctype, fields) {
  const typeName = toPascalCase(doctype);
  const allFields = [...fields, ...STANDARD_FIELDS];

  let code = `/**\n * ${doctype} Zod Schema\n * @doctype ${doctype}\n * @generated ${new Date().toISOString()}\n */\n`;
  code += `export const ${typeName}Schema = z.object({\n`;

  const seenFields = new Set();

  for (const field of allFields) {
    if (!field.fieldname || seenFields.has(field.fieldname)) continue;
    seenFields.add(field.fieldname);

    if (
      [
        "Section Break",
        "Column Break",
        "Tab Break",
        "Fold",
        "Heading",
      ].includes(field.fieldtype)
    ) {
      continue;
    }

    let zodType = FIELD_ZOD_MAP[field.fieldtype] || "z.unknown()";
    const isRequired = field.reqd === 1;

    // Handle Select fields with options
    if (field.fieldtype === "Select" && field.options) {
      const options = field.options.split("\n").filter((o) => o.trim());
      if (options.length > 0 && options.length < 20) {
        zodType = `z.enum([${options.map((o) => `"${o.trim()}"`).join(", ")}])`;
      }
    }

    // Handle docstatus special case
    if (field.fieldname === "docstatus") {
      zodType = "z.union([z.literal(0), z.literal(1), z.literal(2)])";
    }

    // Add validation for required string fields
    if (isRequired && FIELD_ZOD_MAP[field.fieldtype] === "z.string()") {
      zodType = `z.string().min(1, "${
        field.label || field.fieldname
      } is required")`;
    }

    // Make optional fields optional
    if (!isRequired) {
      zodType += ".optional()";
    }

    code += `  ${field.fieldname}: ${zodType},\n`;
  }

  code += "});\n\n";

  // Generate Create schema
  const requiredFields = allFields.filter(
    (f) =>
      f.reqd === 1 &&
      ![
        "name",
        "owner",
        "creation",
        "modified",
        "modified_by",
        "docstatus",
      ].includes(f.fieldname) &&
      ![
        "Section Break",
        "Column Break",
        "Tab Break",
        "Fold",
        "Heading",
      ].includes(f.fieldtype)
  );

  if (requiredFields.length > 0) {
    code += `export const ${typeName}CreateSchema = ${typeName}Schema.pick({\n`;
    requiredFields.forEach((f) => {
      code += `  ${f.fieldname}: true,\n`;
    });
    code += "}).extend({\n";

    // Add some common optional fields for create
    const commonOptional = ["description", "disabled", "is_group"].filter((f) =>
      allFields.some((af) => af.fieldname === f)
    );
    commonOptional.forEach((f) => {
      const field = allFields.find((af) => af.fieldname === f);
      if (field) {
        let zodType = FIELD_ZOD_MAP[field.fieldtype] || "z.unknown()";
        code += `  ${f}: ${zodType}.optional(),\n`;
      }
    });

    code += "});\n\n";
  }

  // Generate Update schema
  code += `export const ${typeName}UpdateSchema = ${typeName}Schema.partial().omit({\n`;
  code += "  name: true,\n";
  code += "  creation: true,\n";
  code += "  owner: true,\n";
  code += "  docstatus: true,\n";
  code += "});\n\n";

  // Export inferred type
  code += `export type ${typeName}SchemaType = z.infer<typeof ${typeName}Schema>;\n`;

  return code;
}

/**
 * Main execution
 */
async function main() {
  console.log("\n🚀 Obsidian ERP v4.0 - Type Generator\n");

  // Parse arguments
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const all = args.includes("--all");

  let doctypes = args.filter((a) => !a.startsWith("--"));

  if (all) {
    doctypes = KNOWN_DOCTYPES;
  }

  if (doctypes.length === 0) {
    console.log("Usage: node generate-types.js DocType1 DocType2 ...");
    console.log("       node generate-types.js --all");
    console.log("       node generate-types.js DocType --dry-run");
    console.log("\nAvailable DocTypes for --all:");
    KNOWN_DOCTYPES.forEach((d) => console.log(`  - ${d}`));
    process.exit(1);
  }

  // Validate configuration
  if (!CONFIG.apiUrl || !CONFIG.apiKey || !CONFIG.apiSecret) {
    console.error("❌ Missing environment variables:");
    if (!CONFIG.apiUrl) console.error("   - NEXT_PUBLIC_ERP_API_URL");
    if (!CONFIG.apiKey) console.error("   - ERP_API_KEY");
    if (!CONFIG.apiSecret) console.error("   - ERP_API_SECRET");
    process.exit(1);
  }

  console.log(`📡 API URL: ${CONFIG.apiUrl}`);
  console.log(`📝 DocTypes: ${doctypes.join(", ")}`);
  console.log(
    `${
      dryRun
        ? "🔍 DRY RUN - No files will be written"
        : "💾 Files will be written"
    }\n`
  );

  // Fetch metadata for each DocType
  const docTypeData = [];
  const errors = [];

  for (const doctype of doctypes) {
    try {
      const meta = await fetchDocTypeMeta(doctype);
      docTypeData.push({
        name: doctype,
        fields: meta.fields || [],
      });
      console.log(`  ✅ ${doctype} (${meta.fields?.length || 0} fields)`);
    } catch (error) {
      console.error(`  ❌ ${doctype}: ${error.message}`);
      errors.push({ doctype, message: error.message });
      // Continue with other doctypes
    }
  }

  if (docTypeData.length === 0) {
    console.error("\n❌ No DocTypes were successfully fetched. Aborting.");
    process.exit(1);
  }

  if (errors.length > 0) {
    console.log(`\n⚠️  Completed with ${errors.length} errors:`);
    errors.forEach((e) => console.log(`  - ${e.doctype}: ${e.message}`));
  }

  console.log(`\n📄 Generating TypeScript interfaces...\n`);

  // Helper to merge content
  function mergeContent(existingContent, newSections, headerTemplate) {
    const sections = new Map();

    if (existingContent && existingContent.trim() !== "") {
      // Split by JSDoc blocks that contain @doctype
      // We look for the start of a JSDoc block
      const blocks = existingContent.split(/\n(?=\/\*\*)/);

      let currentDoctype = null;
      let currentBlock = [];

      for (const block of blocks) {
        const doctypeMatch = block.match(/@doctype\s+([^\n*]+)/);
        if (doctypeMatch) {
          // If we had a previous doctype, save it
          if (currentDoctype) {
            sections.set(currentDoctype, currentBlock.join("\n").trim());
          }
          currentDoctype = doctypeMatch[1].trim();
          currentBlock = [block];
        } else if (currentDoctype) {
          currentBlock.push(block);
        }
      }
      // Save last one
      if (currentDoctype) {
        sections.set(currentDoctype, currentBlock.join("\n").trim());
      }
    }

    // Update/Add new content
    for (const { name, content } of newSections) {
      sections.set(name, content.trim());
    }

    // Reconstruct file
    let header = headerTemplate.trim();
    if (existingContent) {
      const firstBlockIndex = existingContent.indexOf("/**");
      if (firstBlockIndex > 0) {
        header = existingContent.slice(0, firstBlockIndex).trim();
      }
    }

    return header + "\n\n" + Array.from(sections.values()).join("\n\n") + "\n";
  }

  // Prepare new sections
  const newTypeSections = docTypeData.map((dt) => ({
    name: dt.name,
    content: generateInterface(dt.name, dt.fields),
  }));

  const newSchemaSections = docTypeData.map((dt) => ({
    name: dt.name,
    content: generateZodSchema(dt.name, dt.fields),
  }));

  const typesHeader = `// AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
// Generated at: ${new Date().toISOString()}
// Source: Frappe DocType Metadata API
// Script: scripts/generate-types.js`;

  const schemasHeader = `${typesHeader}

import { z } from "zod";`;

  if (dryRun) {
    console.log("=== DRY RUN: Generation complete (sections calculated) ===");
  } else {
    // Ensure directories exist
    const typesDir = path.dirname(CONFIG.outputTypesPath);
    const schemasDir = path.dirname(CONFIG.outputSchemasPath);

    if (!fs.existsSync(typesDir)) {
      fs.mkdirSync(typesDir, { recursive: true });
    }
    if (!fs.existsSync(schemasDir)) {
      fs.mkdirSync(schemasDir, { recursive: true });
    }

    // Read existing content
    let existingTypesContent = "";
    if (fs.existsSync(CONFIG.outputTypesPath)) {
      existingTypesContent = fs.readFileSync(CONFIG.outputTypesPath, "utf-8");
    }

    let existingSchemasContent = "";
    if (fs.existsSync(CONFIG.outputSchemasPath)) {
      existingSchemasContent = fs.readFileSync(
        CONFIG.outputSchemasPath,
        "utf-8"
      );
    }

    // Merge and write
    const finalTypesContent = mergeContent(
      existingTypesContent,
      newTypeSections,
      typesHeader
    );
    const finalSchemasContent = mergeContent(
      existingSchemasContent,
      newSchemaSections,
      schemasHeader
    );

    fs.writeFileSync(CONFIG.outputTypesPath, finalTypesContent);
    console.log(`  ✅ Written: ${CONFIG.outputTypesPath}`);

    fs.writeFileSync(CONFIG.outputSchemasPath, finalSchemasContent);
    console.log(`  ✅ Written: ${CONFIG.outputSchemasPath}`);
  }

  console.log("\n✨ Type generation complete!\n");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
