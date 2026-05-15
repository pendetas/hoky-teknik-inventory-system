# HOKY Teknik Inventory System

Internal inventory and sales operations dashboard built for HOKY Teknik. The project centralizes product stock, Shopee sales, Shopee returns, store shipments, and Excel reporting into one authenticated web app.

This repository is intended to show the system design and implementation progress behind a real operational tool. It does not include production secrets, private business data, or public onboarding instructions for the live database.

## Showcase

<video src="./docs/assets/hoky-inventory-commercial.mp4" controls width="100%"></video>

If the embedded video does not render in your browser, open it directly:
[Watch the showcase video](./docs/assets/hoky-inventory-commercial.mp4)

## Project Goal

HOKY Teknik needed a lightweight internal system for tracking stock movement across Shopee orders and direct store shipments. The app focuses on practical daily workflows:

- Know current product stock without manual spreadsheet checks.
- Record Shopee orders with multiple products in one order.
- Track returned Shopee orders and whether returned items can be restocked.
- Track direct store shipments and credit deadlines.
- Generate Excel reports for Shopee and store activity.
- Give staff a dashboard view of sales, returns, low stock, and best-selling items.

## Current Progress

The project is already implemented as a working React/Vite application connected to Supabase.

Implemented:

- Supabase authentication gate before users can access the inventory system.
- Product catalog CRUD with stock, description, and image support.
- Shopee order workflow with order ID, delivery ID, delivery method, payment method, status, date, multiple products, and Rupiah-masked price input.
- Shopee return workflow with return status, compensation tracking, and return-case table.
- Database-side Shopee stock movement logic through Supabase RPC functions.
- Store shipment workflow for direct sales, payment type, delivery ID, and credit deadline tracking.
- Dashboard cards for product count, Shopee revenue, store revenue, return count, pending return cases, recent activity, low-stock warnings, and a vertical orange best-selling-product chart.
- Excel exports for Shopee and store reports using `xlsx`.
- Remotion-based showcase video included as a tracked README asset.
- Git hygiene for deploy/push readiness: generated outputs, local env files, browser traces, and build artifacts are ignored.

In progress / planned:

- Full Supabase migration for store shipment persistence. Store shipment data currently remains local while the Shopee workflow is database-backed.
- Future Shopee Open Platform integration for automated order synchronization.
- More formal automated tests around report calculations and inventory movement rules.

## Feature Walkthrough

### Dashboard

The dashboard gives a quick operational overview:

- Total product count.
- Shopee revenue from delivered orders and compensated returns.
- Store revenue.
- Returned order count.
- Pending return-case count.
- Recent activity across Shopee and store workflows.
- Low-stock warnings.
- Best-selling products as a vertical bar chart.

### Product Management

The product catalog supports creating, editing, deleting, and reviewing products. Each product can include a name, description, current stock, and image.

### Shopee Sales

The Shopee sales page supports multi-product orders and operational order metadata:

- Order ID.
- Delivery / tracking ID.
- Product quantities.
- Estimated receipt amount in Rupiah input format.
- Delivery method.
- Payment method.
- Shipment status: shipped, delivered, or returned.
- Search, date filtering, status filtering, delivery filtering, and payment filtering.

### Shopee Returns

Returned orders are tracked separately so the business can decide whether returned stock should be restored or treated as damaged.

Supported return states:

- Waiting for check.
- Item is good.
- Damaged item, waiting for Shopee.
- Damaged item, compensated.
- Damaged item, rejected.

### Store Shipments

The store workflow covers direct sales outside Shopee:

- Product sold.
- Quantity.
- Price.
- Delivery ID.
- Payment method.
- Optional credit deadline.

### Excel Reports

The app exports Excel reports for:

- Shopee orders and returns.
- Store sales.
- Inventory snapshot.
- Summary metrics.
- Top-selling product sections.

## Architecture

```text
React UI
  -> Inventory Context
    -> Product service
    -> Shopee order service
      -> Supabase tables
      -> Supabase RPC functions
```

Key structure:

```text
src/
  components/          Shared layout shell
  lib/                 Types, helpers, Supabase client, report utilities
  pages/               Dashboard and workflow pages
  services/            Supabase-facing service layer
  store/               Inventory context and app-level state
  remotion/            Showcase video composition

supabase/              Internal schema/RPC scripts for maintainers
docs/assets/           README showcase media
```

The frontend keeps UI workflows separate from Supabase data access. Product and Shopee data access lives in service modules, while shared state and reload behavior live in `InventoryContext`.

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Supabase Auth and Database
- React Router
- SheetJS `xlsx` for Excel exports
- Remotion for the showcase video
- Lucide React icons
- Motion for modal transitions

## Why This Project Matters

This project demonstrates:

- Building an operational CRUD dashboard from real business workflow requirements.
- Designing inventory logic around stock movement, returns, and revenue recognition.
- Using Supabase as a backend for authentication, relational data, and database-side business rules.
- Keeping report generation inside the business application instead of relying on manual spreadsheet preparation.
- Turning a working internal tool into a clean, reviewable repository without exposing private credentials.

## Running Locally

This repository is intended for internal review. Access to the live deployed app and database is managed by authorized maintainers.

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

Set the environment values provided by the project maintainer:

```env
VITE_SUPABASE_URL="..."
VITE_SUPABASE_API_KEY="..."
```

Run the development server:

```bash
npm run dev
```

Run checks:

```bash
npm run lint
npm run build
```

## Deployment Notes

Deployment is handled internally. For Vite-compatible hosts, the app uses:

```text
Build command: npm run build
Output directory: dist
```

Required deployment environment variables:

```env
VITE_SUPABASE_URL
VITE_SUPABASE_API_KEY
```

Database changes are maintained under `supabase/` for internal maintainers. Schema scripts should not be run against production without review and approval.

## Repository Hygiene

The repository intentionally excludes local/generated artifacts:

- `dist/`
- `node_modules/`
- `.env.local`
- `.playwright-mcp/`
- `out/`

The showcase video is copied into `docs/assets/` so the README can display it without tracking the generated render output folder.
