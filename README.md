# GENIUSONE ERP

Enterprise operations platform built with **Laravel**, **React**, **TypeScript**, and **Vite**, covering Procurement, Warehouse, Customs / EXIM, Reporting, and Role-Based Access Control.

## Key Modules

- **Procurement**: Purchase Requisitions (PR), Purchase Orders (PO), Approval Workflows, Master Data (Suppliers, Job Numbers, Rafaksi Types, Payment Terms, PPh Types), and PR–PO Traceability Reports.
- **Warehouse**: Gate Receive Notes (RN), Inbound Material Slips (BPB), Material Requests (RM), Stock Adjustments, Transfer Stock Returns (TSR), Stock Card & Stock Item Reports, and Master Facilities/Coordinates.
- **EXIM & Customs**: Item, Unit, HS Code, Classification, Style/Model, Color, Country, Currency, Department/Section masters, Receive Note Returns, and Customs Document History.
- **Administration**: Users & Granular Permission Roles (`UserPermissionAdmin`), System Context & Fiscal Year settings, Audit Logs, and API/session authentication.

## Local Development Setup

```bash
composer install
npm install
cp .env.example .env
php artisan key:generate
php artisan migrate
```

Run the development server and asset watcher:

```bash
php artisan serve
npm run dev
```

Build production frontend assets:

```bash
npm run build
```

## Verification Commands

- **PHPUnit test suite**: `php artisan test`
- **TypeScript type-check**: `npx tsc --noEmit`
- **Production Vite build**: `npm run build`
- **Route inspection**: `php artisan route:list`

## Frontend & UI Conventions

- Follow all UI/UX rules in [`AGENTS.md`](./AGENTS.md) (dedicated create/edit form pages, external stylesheets under `resources/css/`, strict icon-only OR text-only `<Button>`, sequential `No` column regardless of sort, footer-only pagination).
- Styling tokens, glassmorphism layers, responsive breakpoints (`< 768px` via `max-width: 767px`), and component contracts are documented in [`CSS.md`](./CSS.md).
- Shared spreadsheet utilities live in `resources/js/utils/csvExport.ts` and `resources/js/utils/xlsxExport.ts` (lazy-loaded `xlsx` chunk).
