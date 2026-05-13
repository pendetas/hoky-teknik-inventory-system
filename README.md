# HOKY Teknik Inventory System

Inventory and sales tracking dashboard for HOKY Teknik. The app helps manage product stock, Shopee orders, Shopee return cases, store shipments, and Excel reporting from one authenticated web interface.

## Showcase

<video src="./docs/assets/hoky-inventory-commercial.mp4" controls width="100%"></video>

If the video does not render in your browser, open it here:
[Watch the showcase video](./docs/assets/hoky-inventory-commercial.mp4)

## Features

- Product catalog with stock count, descriptions, and product images.
- Shopee order entry with multi-product orders, delivery ID, payment method, shipment status, and Rupiah price input.
- Shopee return tracking with return status, compensation amount, and stock restoration logic.
- Store shipment tracking for direct sales, payment type, delivery ID, and credit deadlines.
- Dashboard summary with revenue cards, recent activity, low-stock warnings, and vertical best-selling product chart.
- Excel exports for Shopee and store reports, including summary sheets and top-selling product sections.
- Supabase-backed authentication, product data, Shopee order data, return cases, and stock movement functions.

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

## Getting Started

This repository is intended for internal use. Access to the deployed app and database is managed by authorized maintainers.

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

Set the environment values provided by the project maintainer in `.env.local`:

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

## Deployment

Deployment is handled internally. For Vite-compatible hosts, the app uses:

```text
Build command: npm run build
Output directory: dist
```

Make sure the deployment environment includes:

```env
VITE_SUPABASE_URL
VITE_SUPABASE_API_KEY
```

Database changes are maintained under `supabase/` for internal maintainers. Do not run schema scripts against production without review and approval.

## Notes

- `dist/`, `node_modules/`, `.env.local`, `.playwright-mcp/`, and `out/` are intentionally ignored.
- The showcase video in `docs/assets/` is tracked so the README video link works on GitHub.
