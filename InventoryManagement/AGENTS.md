# Repository Guide

## Project

Single-folder full-stack Inventory Management System.
Root: `InventoryManagement/`.

Stack: Next.js 15 App Router + API Routes, Prisma 6, MongoDB, shadcn/ui (base-ui
variant), Tailwind v4, Recharts, exceljs, pdf-lib, jose, bcryptjs, nodemailer.

## Commands

```bash
npm run dev        # dev server
npm run build      # production build
npm run start      # serve build
npm run seed       # reload demo dataset (scripts/seed.ts)
npm run db:push    # sync prisma/schema.prisma to MongoDB
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
```

## Environment notes

- MongoDB MUST run as a replica set; Prisma transactions fail otherwise (P2031).
  A single-node set works:
  `docker run -d --name ims-mongo -p 27017:27017 mongo:7 --replSet rs0 --bind_ip_all`
  then `rs.initiate(...)`.
- `.env` holds `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `APP_URL` (password
  reset links), `NEXT_PUBLIC_SESSION_TIMEOUT_MINUTES` (idle logout), optional
  SMTP_* and `ALERT_RECIPIENTS`. See `.env.example`.
- Password reset never returns the token to the browser. It is emailed via
  Nodemailer; with no SMTP configured the link is printed to the server console
  as `[password-reset] <email> -> <link>` so local demos still work.
- Demo password for all seeded users is `password123`
  (admin@ims.com, manager@ims.com, purchase@ims.com, sales@ims.com).

## Architecture rules

- The UI never talks to the DB directly. All access goes through `src/app/api/**`.
- Route handlers are wrapped with `withAuth` / `withModule(mod)` (reads) or
  `withManage(mod)` (writes) from `src/lib/api.ts`. `withModule` enforces
  `canAccess(role, module)` and `withManage` enforces `canManage(role, module)`,
  both from `src/lib/rbac.ts`. `WRITE_PERMISSIONS` mirrors section 3 of the PDF:
  Admin everything; Inventory Manager products/categories/warehouses/stock/alerts;
  Purchase Staff suppliers/purchases; Sales Staff customers/sales.
- Notifications mark-read stays on `withModule` so any role that can see the
  alerts page can clear its own bell.
- Page-level fetches that pull reference lists from modules a role cannot read
  (e.g. Products fetching categories/suppliers) must tolerate a 403 and render
  read-only rather than erroring out.
- Responses use `ok(data)` / `fail(message, status, errors)`; errors go through
  `handleError` which maps Prisma bad-ObjectId → 422, duplicate → 409, P2014
  (delete blocked by references) → 409, P2025/P2003 → 404.
- Every stock change funnels through `applyStock` in `src/lib/stock.ts`, which
  updates the per-warehouse `Stock` row, keeps `Product.quantity` in sync via
  `syncProductQuantity`, writes a `StockMovement`, and raises low-stock alerts.
- Purchase receiving uses `receiveOrder` (`src/lib/purchase.ts`); sales issuing
  uses `issueSalesOrder` (`src/lib/sales.ts`). Both push stock through `applyStock`.
- When creating an order that should immediately receive/issue, create it with the
  intermediate status (`approved` / `confirmed`) then call the helper — the helpers
  reject orders already in the terminal state.

## shadcn/ui gotchas (base-ui variant, not Radix)

- `Button`, `DialogTrigger`, `SheetTrigger`, `DropdownMenuItem`, `Select` etc. do
  NOT support `asChild`. Use the `render` prop instead:
  `<Button render={<Link href="/x" />}>label</Button>`.
- `Select` `onValueChange` receives `string | null`, so handlers must coerce:
  `onValueChange={(v) => setX(v ?? "")}`.
- UI primitives live in `src/components/ui/`; shared app components in
  `src/components/shared/`.

## Layout

- `src/app/(auth)/` login, forgot-password, reset-password
- `src/app/(dashboard)/` dashboard, products, categories, warehouses, suppliers,
  customers, purchases, sales, stock, alerts, reports, users, settings
- `src/lib/` prisma, api, auth, rbac, stock, purchase, sales, validators, seed,
  client, mailer
- `prisma/schema.prisma` models users, roles, products, categories, warehouses,
  suppliers, customers, purchase_orders/items, sales_orders/items, stock,
  stock_movements, notifications
