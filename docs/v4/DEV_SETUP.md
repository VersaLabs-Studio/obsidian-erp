# Obsidian ERP v4.0 — Development Setup Guide

## Prerequisites

- **Node.js** ≥ 20.x (LTS recommended)
- **pnpm** ≥ 9.x
- **Frappe v15** bench site (for backend API)
- **Git**

## Quick Start

### 1. Clone and Install

```bash
git clone <repo-url>
cd obsidian-erp
pnpm install
```

### 2. Environment Variables

Create `.env.local`:

```env
# Frappe Backend
NEXT_PUBLIC_ERP_API_URL=http://localhost:8000
NEXT_PUBLIC_FRAPPE_URL=http://localhost:8000
ERP_API_KEY=<your-api-key>
ERP_API_SECRET=<your-api-secret>

# AI (Phase 3)
OPENROUTER_API_KEY=<optional-for-phase-3>
```

### 3. Frappe Backend Setup

```bash
# In your Frappe bench directory
bench new-site obsidian.localhost
bench --site obsidian.localhost install-app erpnext
bench --site obsidian.localhost set-admin-password admin

# Generate API key/secret for the Administrator user
bench --site obsidian.localhost execute frappe.client.generate_keys --args '["Administrator"]'
```

### 4. Seed Data

```bash
# Run the seed script against your dev Frappe site
node scripts/seed-data.js
```

This creates demo data including:
- **Abebe Trading PLC** — Customer
- **BC-PM** — Printing item (Business Cards - Premium Matte)
- Sample Quotation, Sales Order, and other transactional documents

### 5. Start Development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Testing

### Unit & Component Tests (Vitest)

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# With coverage
pnpm test -- --coverage
```

### E2E Tests (Playwright)

```bash
# Install Playwright browsers (first time)
npx playwright install

# Run E2E tests
pnpm test:e2e

# Run with UI
pnpm test:e2e -- --ui
```

## Code Quality

### TypeScript Check

```bash
pnpm tsc --noEmit
```

### Lint

```bash
pnpm lint
```

### Build

```bash
pnpm build
```

## Project Structure

```
obsidian-erp/
├── app/                    # Next.js App Router pages & API routes
│   ├── api/               # API route handlers (factory pattern)
│   ├── crm/               # CRM module pages
│   ├── sales/             # Sales module pages
│   ├── buying/            # Buying module pages
│   ├── manufacturing/     # Manufacturing module pages
│   ├── accounting/        # Accounting module pages
│   ├── hr/                # HR module pages
│   └── stock/             # Stock module pages
├── components/            # Shared components
│   ├── flows/             # Flow engine UI components
│   ├── dashboard/         # Dashboard widgets
│   ├── smart/             # Smart shared components
│   ├── command/           # Command palette
│   ├── ai/                # AI copilot components
│   └── ui/                # Base UI primitives
├── hooks/                 # Custom React hooks
│   └── generic/           # Generic CRUD hooks (factory pattern)
├── lib/                   # Core libraries
│   ├── flows/             # Flow engine logic
│   ├── ai/                # AI integration
│   ├── tenant/            # Multi-tenant utilities
│   ├── auth/              # Authentication
│   └── schemas/           # Zod schemas (auto-generated)
├── types/                 # TypeScript type definitions
├── tests/                 # Unit & component tests
└── e2e/                   # End-to-end tests
```

## Key Patterns

### Schema-First Development

Types are generated from Frappe DocType metadata:

```bash
pnpm generate-types
```

### Factory Pattern

All CRUD operations use generic factories — no bespoke hooks or routes.

### Query Key Factory

All TanStack Query keys follow the pattern in `lib/query-keys.ts`.

## Troubleshooting

### pnpm install fails with virtual store error

```bash
$env:CI="true"; pnpm install
```

### TypeScript errors after pulling

```bash
pnpm generate-types
pnpm tsc --noEmit
```

### Frappe connection refused

Ensure your Frappe bench is running:
```bash
cd /path/to/frappe-bench
bench start
```
