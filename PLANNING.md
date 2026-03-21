# Tallybase — Planning Document

**Status:** Pre-implementation planning
**Last updated:** 2026-03-11
**Stack:** Next.js · TailwindCSS · shadcn/ui · PostgreSQL · Prisma · Vercel · Neon

---

## 1. Vision & Scope

Tallybase is a mobile-first inventory management webapp — a personal tool for tracking material inventory with a clear upgrade path toward a multitenant SaaS product for small businesses.

### MVP Goals
- Catalogue existing inventory with flexible, category-aware attributes
- Track running totals in/out with timestamps and notes
- Generate QR codes per item for fast mobile-based transactions
- Single user, single "workspace"
- Support configurable units of measure

### Future Goals (Post-MVP)
- Location tracking (racks, storage areas, sites)
- Supplier/vendor management
- Job/project linkage for transactions ("used X bf of walnut for Coffee Table build")
- Low-stock alerts
- Reporting and analytics
- Multitenancy (organization model, user roles, invitations)
- Full desktop UX polish

---

## 2. App Name

**Tallybase** — tally + base. A base of operations for your tallies; the source of truth for what you have.

- Domain: `tallybase.app`
- Repo: `tallybase`
- Vercel project: `tallybase`
- Neon DB: `tallybase`

---

## 3. Data Model

### 3.1 Core Philosophy

Inventory items are typed by **category**, and each category can define what **attributes** its items carry. A lumber item has species, thickness, and width; a consumable item has a vendor SKU and pack size. Rather than separate tables per category, we use a `JSONB` `attributes` column on items, with the valid attribute shape defined (loosely at first) per category. This keeps the schema general without forcing a rigid EAV pattern.

Quantities are stored as **decimals** to support fractional units (e.g., 12.5 board-feet).

---

### 3.2 MVP Schema

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── AUTH ───────────────────────────────────────────────────────────────────

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  image     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  transactions Transaction[]
}

// ─── INVENTORY CORE ──────────────────────────────────────────────────────────

model Category {
  id          String  @id @default(cuid())
  name        String  @unique          // "Lumber", "Hardware", "Consumables", etc.
  description String?
  color       String?                  // hex color for UI labeling
  icon        String?                  // icon name/slug (e.g. lucide icon)

  // Defines what attribute keys are expected for items in this category.
  // Stored as JSON array. Used for dynamic form generation and display — not enforced at DB level in MVP.
  //
  // Supported types:
  //   "string"   — text input; optional "options" array renders as select
  //   "number"   — numeric input; stored as number
  //   "quarters" — fraction input displayed/entered as X/4 (e.g. 8/4); stored as integer numerator
  //   "boolean"  — checkbox
  attributeSchema Json?

  items     Item[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model UnitOfMeasure {
  id           String @id @default(cuid())
  name         String @unique           // "Board Feet", "Linear Feet", "Piece", "Gallon", etc.
  abbreviation String @unique           // "bf", "lf", "pc", "gal"
  isDecimal    Boolean @default(true)   // false = whole-number only (e.g. "pieces" of hardware)

  items     Item[]
  createdAt DateTime @default(now())
}

model Item {
  id          String  @id @default(cuid())
  name        String                    // Human-readable: "8/4 Walnut", "Wood Glue - Titebond III"
  description String?
  sku         String? @unique           // Optional internal or vendor SKU

  categoryId      String
  category        Category      @relation(fields: [categoryId], references: [id])

  unitOfMeasureId String
  unitOfMeasure   UnitOfMeasure @relation(fields: [unitOfMeasureId], references: [id])

  // Running total — updated on every transaction
  quantity        Decimal       @default(0) @db.Decimal(10, 4)

  // Optional soft floor — for future low-stock alerting
  lowStockThreshold Decimal?    @db.Decimal(10, 4)

  // Flexible per-category attributes
  // Lumber example: { species: "Walnut", thickness_quarters: 8, width_inches: 10, grade: "FAS", finish: "Rough" }
  // Consumable example: { brand: "Titebond", size_oz: 16 }
  attributes     Json?

  // QR code value — typically a URL: https://{app-domain}/scan/{id}
  // Generated on item creation, stored so it can be re-rendered/printed without recomputing
  qrCodeValue    String?

  // imageUrl — excluded from MVP; added in usable product with Vercel Blob storage
  imageUrl       String?
  notes          String?

  transactions   Transaction[]

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

// ─── TRANSACTIONS ────────────────────────────────────────────────────────────

enum TransactionType {
  IN          // Receiving stock (purchase, found, acquired)
  OUT         // Consuming/removing stock
  ADJUSTMENT  // Correction to quantity (e.g., after physical count)
}

model Transaction {
  id       String          @id @default(cuid())
  itemId   String
  item     Item            @relation(fields: [itemId], references: [id])

  type     TransactionType

  // Positive number for all types; direction is determined by type.
  // ADJUSTMENT can represent either direction — use `adjustedTo` instead of a delta.
  quantity Decimal         @db.Decimal(10, 4)

  // For ADJUSTMENT only: the quantity the item was set to (not the delta).
  // Null for IN/OUT.
  adjustedTo Decimal?      @db.Decimal(10, 4)

  // Snapshot of quantity BEFORE this transaction (for audit/history display)
  quantityBefore Decimal   @db.Decimal(10, 4)

  notes    String?

  createdById String?
  createdBy   User?        @relation(fields: [createdById], references: [id])

  createdAt DateTime       @default(now())
}
```

---

### 3.3 Seeded Reference Data (Units of Measure)

```
Board Feet     (bf)   — decimal
Linear Feet    (lf)   — decimal
Square Feet    (sqft) — decimal
Piece          (pc)   — whole number
Sheet          (sh)   — whole number
Gallon         (gal)  — decimal
Quart          (qt)   — decimal
Pound          (lb)   — decimal
Ounce          (oz)   — decimal
Box            (bx)   — whole number
Roll           (rl)   — whole number
```

---

### 3.4 Seeded Categories & Attribute Schemas

#### Lumber
```json
[
  { "key": "species",           "label": "Species",              "type": "string",  "required": true },
  { "key": "thickness_quarters","label": "Thickness", "type": "quarters", "required": true,
    "hint": "Entered and displayed as X/4 (e.g. 8/4). Stored as integer numerator." },
  { "key": "width_inches",      "label": "Width (inches)",       "type": "number",  "required": false },
  { "key": "grade",             "label": "Grade",                "type": "string",  "required": false,
    "options": ["FAS", "Select", "No.1 Common", "No.2 Common", "Utility"] },
  { "key": "finish",            "label": "Surface Finish",       "type": "string",  "required": false,
    "options": ["Rough", "S2S", "S4S"] },
  { "key": "kiln_dried",        "label": "Kiln Dried",           "type": "boolean", "required": false }
]
```

#### Sheet Goods
```json
[
  { "key": "material",   "label": "Material",        "type": "string", "required": true,
    "options": ["Plywood", "MDF", "Particle Board", "Melamine", "OSB"] },
  { "key": "thickness",  "label": "Thickness (in)",  "type": "number", "required": true },
  { "key": "dimensions", "label": "Sheet Size",      "type": "string", "required": false,
    "options": ["4x8", "4x10", "5x5"] },
  { "key": "grade",      "label": "Grade",           "type": "string", "required": false }
]
```

#### Consumables
```json
[
  { "key": "brand",       "label": "Brand",       "type": "string", "required": false },
  { "key": "sku",         "label": "Vendor SKU",  "type": "string", "required": false }
]
```

#### Hardware
```json
[
  { "key": "brand",       "label": "Brand",       "type": "string", "required": false },
  { "key": "size",        "label": "Size/Spec",   "type": "string", "required": false },
  { "key": "finish",      "label": "Finish",      "type": "string", "required": false }
]
```

---

### 3.5 Future Schema Additions (Post-MVP)

These are **not** built for MVP, but the MVP schema should not block adding them later.

```
Location          — name, description, parent_location_id (nested: building → rack → shelf)
Item.locationId   — FK to Location

Supplier          — name, contact, website, notes
SupplierItem      — join: supplier → item, with cost, lead_time, vendor_sku

Project           — name, description, status, start_date, end_date
Transaction.projectId — FK to Project (nullable)

Organization      — name, slug, plan, settings
User.organizationId — FK to Organization (multitenancy pivot)
Item.organizationId — scopes all data per org
```

---

## 4. QR Code Strategy

Every item gets a unique QR code generated at creation time. The QR code encodes a URL:

```
https://{app-domain}/scan/{item-id}
```

### Flow
1. Item is created → server generates the QR code URL and stores it in `Item.qrCodeValue`
2. On the item detail page, the QR code is rendered (using a library like `qrcode.react` or `react-qr-code`) and can be downloaded or printed as a label
3. Scanning the QR code on any mobile device opens the `/scan/[id]` page — a minimal, touch-optimized interface for logging a transaction

### `/scan/[id]` Page (Mobile)
- Shows item name, category, and **current quantity** prominently
- Three large tap targets: **Add Stock**, **Use Stock**, **Adjust**
- Tapping opens a minimal form: quantity field + optional notes + confirm button
- Confirmation triggers an API call, updates quantity, and shows a success state
- No login required in MVP (single-user, local use) — optionally protect with a simple PIN or session in future

### Label Printing
- The item detail page should have a "Print Label" button that opens a print-optimized view
- Label shows: QR code + item name + category + current unit of measure
- Basic CSS `@media print` handling is sufficient for MVP; no dedicated label printer integration needed yet

---

## 5. User Flows

### 5.1 Adding a New Item
1. Tap/click **"+ New Item"** from dashboard or inventory list
2. Select **Category** → form fields update dynamically based on `attributeSchema`
3. Fill in: Name, Unit of Measure, Initial Quantity, dynamic attribute fields, optional notes
4. Submit → item created, QR code generated, redirect to item detail page
5. Optional: print label from item detail

### 5.2 Adding Stock (IN)
**Via QR scan:**
1. Scan item's QR code → `/scan/[id]` loads
2. Tap **Add Stock**
3. Enter quantity and optional note (e.g., "received from supplier")
4. Confirm → transaction logged, quantity updated, success feedback

**Via dashboard:**
1. Find item via search or list
2. Open item detail → tap **Add Stock**
3. Same quantity/note form

### 5.3 Using Stock (OUT)
**Via QR scan:**
1. Scan QR code → `/scan/[id]`
2. Tap **Use Stock**
3. Enter quantity and optional note
4. Confirm → if quantity would go negative, warn and require confirmation (do not hard-block)

**Via dashboard:** same as above via item detail

### 5.4 Manual Adjustment
Used when a physical count reveals a discrepancy.
1. Open item → tap **Adjust**
2. Enter the **actual current quantity** (not a delta)
3. System calculates delta and records as `ADJUSTMENT` type
4. Note field auto-populated with "Manual count adjustment" (editable)

### 5.5 Viewing Transaction History
- Item detail page shows a chronological log of all transactions
- Each entry: date, type badge (IN/OUT/ADJUSTMENT), quantity, delta from before, notes, user
- Filterable by type in future; MVP shows all in reverse-chron order

---

## 6. App Structure / Routes

```
app/
├── (auth)/
│   └── login/               # better-auth: credentials + Google OAuth
│
├── (app)/
│   ├── dashboard/           # Overview: total items, recent activity, low-stock warnings
│   ├── inventory/
│   │   ├── page.tsx         # Item list — search, filter by category, sort
│   │   ├── new/
│   │   │   └── page.tsx     # New item form
│   │   └── [id]/
│   │       └── page.tsx     # Item detail: attributes, QR, history, actions
│   └── transactions/
│       └── page.tsx         # Global transaction log (all items)
│
└── scan/
    └── [id]/
        └── page.tsx         # Mobile QR scan landing — minimal, no nav chrome
```

---

## 7. Key UI Decisions

### Mobile-First
- `/scan/[id]` is the primary mobile surface — should work with one thumb, large tap targets
- The inventory list and dashboard should be usable on mobile but optimized progressively for desktop
- Use shadcn's responsive patterns; avoid data-dense desktop-only tables in the initial build

### Component Plan (shadcn/ui)
- `Card` — item cards in list view
- `Sheet` / `Drawer` — slide-up for transaction forms on mobile
- `Dialog` — confirmations, adjustments on desktop
- `Badge` — category label, transaction type
- `Table` — transaction history (scrollable on mobile)
- `Command` / `Combobox` — searchable species/category selectors
- `Form` + `Input` + `Select` — item creation form

### Quantity Display
- Always show unit abbreviation alongside quantity: **12.5 bf**, **4 pc**, **2 gal**
- Color-code low stock (yellow/red threshold indicator) — even if alerting is post-MVP, the visual signal is free

---

## 8. Auth Strategy

**Package:** `better-auth` — mirrors the pattern in cinemix.

### Server config (`src/lib/auth.ts`)
```ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import prisma from "@/lib/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),

  // Credentials (email + password) — no external service required
  emailAndPassword: {
    enabled: true,
  },

  // Google OAuth — requires GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET in env
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },

  plugins: [nextCookies()],

  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24,
  },
});

export type Session = typeof auth.$Infer.Session;

export async function getAuthSession() {
  const { headers } = await import("next/headers");
  return auth.api.getSession({ headers: await headers() });
}
```

### Client helper (`src/lib/auth-client.ts`)
```ts
import { createAuthClient } from "better-auth/react";
export const authClient = createAuthClient();
export const { signIn, signOut, useSession } = authClient;
```

### Route handler (`src/app/api/auth/[...all]/route.ts`)
```ts
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
export const { GET, POST } = toNextJsHandler(auth);
```

### Notes
- better-auth generates its own `user`, `session`, `account`, `verification` tables via migration — these sit alongside Prisma models (use `@@map` on lowercase table names, same as cinemix)
- All app routes are protected — no anonymous/guest access
- **Future:** Add `Organization` model, invite flow, and role-based access (admin, editor, viewer) when moving to multitenancy

---

## 9. Board-Feet Calculator (Lumber-Specific)

Board feet formula: `(thickness_quarters / 4) * width_inches / 12 * length_feet`

Consider adding a **BF calculator utility** on the item creation and transaction forms for lumber items — user enters the physical dimensions of a board and the system calculates board feet to add/remove. This avoids user math errors and is a high-value UX feature for the lumber use case.

```
Thickness: [8] quarters   Width: [10] inches   Length: [8] feet
→ (8/4) × (10/12) × 8 = 13.33 bf
```

This is a UI component, not a schema concern — the DB always stores the computed bf value.

---

## 10. Open Questions

> Items to resolve before or during implementation

- [x] **App name** — **Tallybase** · tallybase.app
- [x] **Auth provider** — credentials (email + password) + Google OAuth via better-auth. Same pattern as cinemix.
- [x] **Image uploads** — excluded from MVP; added in usable product phase
- [x] **Attribute schema enforcement** — advisory only for MVP; Zod per-category validation added post-MVP
- [x] **Fractional quantity input** — decimal (e.g. 12.5 bf). Lumber thickness displayed as X/4 quarters notation via dedicated `"quarters"` attribute type.
- [ ] **QR label format** — plain paper print CSS for MVP; label sheet or dedicated printer (Avery, Dymo) post-MVP
- [ ] **Offline support** — QR scanning requires network in MVP; acceptable for personal use; revisit for SaaS

---

## 11. Implementation Order (MVP)

1. Project setup — Next.js, Tailwind, shadcn init, Prisma + Neon connection
2. DB schema + migrations + seed data (UOMs, categories)
3. Auth (better-auth: credentials + Google OAuth)
4. Item CRUD (list, create, detail, edit)
5. Transaction engine (IN / OUT / ADJUSTMENT, quantity updates)
6. QR code generation + `/scan/[id]` mobile page
7. Dashboard (counts, recent transactions)
8. Label print view
9. Board-feet calculator utility (lumber items)
10. Deploy to Vercel

---

## 12. Scaffolding Guide

> AI-executable step-by-step setup. Follow in order. Do not skip steps.

### Decisions already made — do not ask about these
- Framework: Next.js App Router (not Pages Router)
- Directory: `src/`
- Language: TypeScript
- Styling: Tailwind CSS v4 + shadcn/ui (New York style, Zinc base color)
- Auth: better-auth with credentials + Google OAuth (no magic link, no anonymous plugin)
- ORM: Prisma with PostgreSQL (Neon)
- All `(app)/` routes are auth-protected via middleware
- QR codes rendered client-side via `react-qr-code`
- Forms via `react-hook-form` + `zod`

---

### Step 1 — Create Next.js app

```bash
npx create-next-app@latest tallybase \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --turbopack
cd tallybase
```

---

### Step 2 — Install dependencies

```bash
# Runtime
npm install better-auth @prisma/client zod react-hook-form @hookform/resolvers react-qr-code

# Dev
npm install -D prisma
```

---

### Step 3 — Initialize Prisma

```bash
npx prisma init
```

Replace the contents of `prisma/schema.prisma` with the full schema from **Section 3.2** of this document.

---

### Step 4 — Initialize shadcn

```bash
npx shadcn@latest init
```

When prompted: **New York** style · **Zinc** base color · **Yes** to CSS variables.

Then add all components needed for the initial build:

```bash
npx shadcn@latest add button input form label select card badge dialog drawer sheet table command popover separator skeleton sonner tooltip
```

---

### Step 5 — Environment variables

Create `.env.local` (never commit this file):

```env
# Neon PostgreSQL — copy from Neon dashboard (use the "pooled" connection string)
DATABASE_URL=

# better-auth — generate with: openssl rand -hex 32
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000

# Google OAuth — from Google Cloud Console (see Step 8)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

Create `.env.example` with the same keys but empty values and commit it.

---

### Step 6 — Generate better-auth Prisma tables

better-auth requires its own models (`user`, `session`, `account`, `verification`). Generate them:

```bash
npx @better-auth/cli@latest generate
```

This appends the required models to `prisma/schema.prisma`. They use `@@map` to lowercase table names — do not rename them.

---

### Step 7 — Run initial migration

```bash
npx prisma migrate dev --name init
```

This creates all tables (app models + better-auth models) and generates the Prisma client.

---

### Step 8 — Google OAuth setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → Create or select a project
2. APIs & Services → Credentials → Create OAuth 2.0 Client ID
3. Application type: **Web application**
4. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (dev)
   - `https://tallybase.app/api/auth/callback/google` (prod — add when deploying)
5. Copy Client ID and Client Secret into `.env.local`

---

### Step 9 — Create better-auth files

These mirror the pattern from cinemix exactly (minus the anonymous plugin).

**`src/lib/prisma.ts`** — Prisma singleton:
```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
export default prisma;
```

**`src/lib/auth.ts`** — server config (see full code in Section 8)

**`src/lib/auth-client.ts`** — client helper (see full code in Section 8)

**`src/app/api/auth/[...all]/route.ts`** — catch-all handler (see full code in Section 8)

---

### Step 10 — Middleware

Protect all `(app)/` routes, leave `(auth)/` and `/scan/` public:

**`src/middleware.ts`**:
```ts
import { betterFetch } from "@better-fetch/fetch";
import type { Session } from "@/lib/auth";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/auth", "/scan"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const { data: session } = await betterFetch<Session>(
    "/api/auth/get-session",
    {
      baseURL: request.nextUrl.origin,
      headers: { cookie: request.headers.get("cookie") ?? "" },
    }
  );

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)"],
};
```

---

### Step 11 — Seed reference data

Create `prisma/seed.ts` with the UOMs from Section 3.3 and categories + attribute schemas from Section 3.4.

Add the seed script to `package.json`:
```json
"prisma": {
  "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
}
```

Install `ts-node` if not already present:
```bash
npm install -D ts-node
```

Run the seed:
```bash
npx prisma db seed
```

---

### Step 12 — Verify file structure

After scaffolding, the project should look like this:

```
tallybase/
├── prisma/
│   ├── schema.prisma       # full schema from Section 3.2 + better-auth tables
│   ├── seed.ts             # UOMs + categories from Sections 3.3–3.4
│   └── migrations/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       └── page.tsx
│   │   ├── (app)/
│   │   │   ├── layout.tsx          # verifies session, renders app shell
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── inventory/
│   │   │   │   ├── page.tsx        # item list
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx    # new item form
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx    # item detail
│   │   │   └── transactions/
│   │   │       └── page.tsx
│   │   ├── api/
│   │   │   └── auth/
│   │   │       └── [...all]/
│   │   │           └── route.ts
│   │   ├── scan/
│   │   │   └── [id]/
│   │   │       └── page.tsx        # public, mobile QR landing
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   └── ui/                     # shadcn components
│   ├── lib/
│   │   ├── auth.ts
│   │   ├── auth-client.ts
│   │   └── prisma.ts
│   └── middleware.ts
├── .env.local                      # never commit
├── .env.example                    # commit this
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

### Step 13 — Dev server

```bash
npm run dev
```

App runs at `http://localhost:3000`. Verify:
- `/login` loads without redirect
- `/dashboard` redirects to `/login` when unauthenticated
- `/api/auth/get-session` returns `null` when unauthenticated
- Prisma Studio (`npx prisma studio`) shows all tables seeded correctly
