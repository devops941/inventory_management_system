# Inventory Management System

A single-folder full-stack IMS built with Next.js (App Router), Next.js API Routes,
Prisma and MongoDB, with a shadcn/ui + Tailwind frontend.

It tracks products, stock levels, suppliers, purchases and sales in real time,
updates stock automatically, warns when items run low or near expiry, and
produces stock / purchase / sales reports with Excel and PDF export.

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js (React) pages/components, Tailwind CSS, shadcn/ui, Recharts |
| Backend | Next.js API Routes (auth, business logic, all DB access) |
| Database | MongoDB (run as a replica set) |
| ORM | Prisma Client |
| Auth | Custom JWT in an HttpOnly cookie, bcrypt password hashing |
| Reporting | exceljs (Excel), pdf-lib (PDF), Recharts (charts) |
| Email | Nodemailer (optional; in-app alerts work without SMTP) |

The UI never touches the database directly: every read/write goes through the
API Routes, which validate the session, apply role checks and talk to MongoDB
via Prisma.

## Roles

Every role sees its own dashboard, products, stock, alerts and reports. Write
access is narrower than read access and follows section 3 of the project brief.

| Role | Read access | Can create/edit |
| --- | --- | --- |
| Admin | Everything | Everything, including users, roles and settings |
| Inventory Manager | Products, categories, warehouses, suppliers, stock, alerts, reports | Products, categories, warehouses, stock adjustments/transfers |
| Purchase Staff | Suppliers, purchases, products, stock, alerts, reports | Suppliers, purchase orders, goods received |
| Sales Staff | Customers, sales, products, stock, alerts, reports | Customers, sales orders, stock issue/returns |

Reads are guarded by `withModule(mod)` and writes by `withManage(mod)` in
`src/lib/api.ts`, both driven by `PERMISSIONS` / `WRITE_PERMISSIONS` in
`src/lib/rbac.ts`. The sidebar and page controls hide what a role cannot use.

## Getting started

### 1. Start MongoDB as a replica set

Prisma needs a replica set for transactions. A single-node set is enough:

```bash
docker run -d --name ims-mongo -p 27017:27017 mongo:7 --replSet rs0 --bind_ip_all
docker exec ims-mongo mongosh --quiet --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"localhost:27017"}]})'
```

### 2. Configure the environment

```bash
cp .env.example .env
```

### 3. Install, push the schema and seed demo data

```bash
npm install
npm run db:push
npm run seed
```

### 4. Run

```bash
npm run dev      # development on http://localhost:3000
npm run build && npm run start   # production
```

## Demo accounts

All seeded accounts use the password `password123`.

| Role | Email |
| --- | --- |
| Admin | admin@ims.com |
| Inventory Manager | manager@ims.com |
| Purchase Staff | purchase@ims.com |
| Sales Staff | sales@ims.com |

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run seed` | Reload the demo dataset |
| `npm run db:push` | Sync the Prisma schema to MongoDB |
| `npm run db:generate` | Regenerate Prisma Client |
| `npm run typecheck` | TypeScript check with no emit |
| `npm run lint` | ESLint |

## Modules

- Authentication: login, logout, session (JWT cookie), idle session timeout,
  forgot/reset password (token emailed, never returned to the browser)
- Admin dashboard: stock summary, low-stock items, recent purchases and sales, KPIs
- User & role management: create/block users, assign roles
- Product management: SKU, barcode, category, unit, cost/selling price, expiry
- Categories & warehouses: grouping and storage locations
- Supplier management: profiles and purchase history
- Purchase management: purchase orders, goods received (auto stock update)
- Stock management: stock in/out, adjustments, warehouse transfers, movement history
- Sales & customers: sales orders, stock issue, printable invoice, sales returns
- Alerts & notifications: low-stock and expiry alerts, optional email notifications
- Reports & analytics: stock valuation, purchase and sales reports, charts, Excel/PDF export

## API overview

All endpoints live under `src/app/api` and return `{ success, data }` or
`{ success, message, errors }`.

| Endpoint | Purpose |
| --- | --- |
| `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` | Session |
| `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` | Password reset |
| `/api/products`, `/api/categories`, `/api/warehouses` | Catalogue |
| `/api/suppliers`, `/api/customers` | Parties |
| `/api/purchases`, `POST /api/purchases/[id]/receive` | Purchasing |
| `/api/sales`, `POST /api/sales/[id]/issue`, `POST /api/sales/[id]/return` | Selling |
| `/api/stock`, `POST /api/stock/adjust`, `POST /api/stock/transfer`, `GET /api/stock/movements` | Stock |
| `/api/notifications`, `POST /api/alerts/scan` | Alerts |
| `/api/reports/dashboard`, `/stock`, `/purchases`, `/sales`, `/export` | Reports |
| `/api/users`, `/api/roles`, `POST /api/seed` | Administration |
