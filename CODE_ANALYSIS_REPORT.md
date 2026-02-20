# AK Foods POS System — Code Analysis Report

**Generated:** 2026-02-18  
**Codebase:** `akf-pos-system-main`  
**Origin:** Lovable.dev (AI-generated scaffold, then customized)

---

## 1. Executive Summary

The AKF Burgers POS system is a **well-structured, production-ready** single-page application built with **Vite + React + TypeScript**. It uses **shadcn/ui** for components, **Tailwind CSS** for styling, **Zustand** for state management, **Supabase** for database/auth, and **Recharts** for visualizations. The codebase is relatively clean with ~2,700 lines of custom application logic across 14 page/component files.

**Strengths:**
- Clean separation of concerns (stores, pages, components, integrations)
- Proper TypeScript types auto-generated from Supabase
- RLS (Row Level Security) policies for all tables
- Role-based access (admin/cashier) enforced at both UI and database levels
- Expense management **already implemented** (4 pages + DB migration)
- Smart use of Zustand for cart and auth state

**Weaknesses:**
- No dedicated API/service layer — all Supabase calls are inline in components
- Receipt has hardcoded restaurant info instead of pulling from settings
- `.env` file is committed to the repo with real credentials
- `App.css` is a leftover Vite template file (unused)
- `index.html` still has "Lovable App" branding
- No dark mode despite `darkMode: ["class"]` in tailwind config
- Tax settings exist in DB/UI but are not wired into cart calculations
- No tests beyond a placeholder example
- `Index.tsx` page is unused boilerplate

---

## 2. Tech Stack Confirmed

| Layer | Technology | Version |
|---|---|---|
| **Build Tool** | Vite | 5.4.19 |
| **Framework** | React | 18.3.1 |
| **Language** | TypeScript | 5.8.3 |
| **UI Library** | shadcn/ui (Radix + CVA) | Latest |
| **Styling** | Tailwind CSS | 3.4.17 |
| **Routing** | React Router DOM | 6.30.1 |
| **State Management** | Zustand | 5.0.11 |
| **API State** | TanStack React Query | 5.83.0 |
| **Database** | Supabase (PostgreSQL) | Client 2.95.3 |
| **Charts** | Recharts | 2.15.4 |
| **Forms** | React Hook Form + Zod | 7.61.1 / 3.25.76 |
| **Printing** | react-to-print | 2.15.1 |
| **Date Utils** | date-fns | 3.6.0 |
| **Notifications** | Sonner | 1.7.4 |
| **Icons** | Lucide React | 0.462.0 |
| **Font** | Space Grotesk + JetBrains Mono | Google Fonts |

---

## 3. Project Structure

```
d:\akf-pos-system-main\
├── .env                          # Supabase credentials (⚠️ committed!)
├── .gitignore
├── README.md                     # Lovable boilerplate README
├── index.html                    # Entry HTML (⚠️ still says "Lovable App")
├── package.json                  # Dependencies & scripts
├── bun.lockb                     # Bun lockfile
├── package-lock.json             # NPM lockfile
├── components.json               # shadcn/ui config
├── tailwind.config.ts            # Tailwind + custom theme
├── tsconfig.json                 # TypeScript config
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts                # Vite config (port 8080, @ alias)
├── vitest.config.ts              # Vitest test config
├── eslint.config.js              # ESLint flat config
├── postcss.config.js             # PostCSS for Tailwind
│
├── public/
│   ├── favicon.ico
│   ├── placeholder.svg
│   └── robots.txt
│
├── supabase/
│   ├── config.toml
│   ├── functions/
│   │   └── create-user/
│   │       └── index.ts          # Edge function: admin user creation
│   └── migrations/
│       ├── 2026...12532.sql      # Initial schema (all core tables + seed)
│       └── 2026...df080.sql      # Expenses schema migration
│
└── src/
    ├── main.tsx                  # App entry point
    ├── App.tsx                   # Root component + routing
    ├── App.css                   # ⚠️ Unused Vite template CSS
    ├── index.css                 # Global styles + CSS variables + print
    ├── vite-env.d.ts
    │
    ├── stores/
    │   ├── authStore.ts          # Authentication state (Zustand)
    │   └── cartStore.ts          # Shopping cart state (Zustand)
    │
    ├── integrations/
    │   └── supabase/
    │       ├── client.ts         # Supabase client init
    │       └── types.ts          # Auto-generated DB types
    │
    ├── lib/
    │   └── utils.ts              # cn() utility for Tailwind
    │
    ├── hooks/
    │   ├── use-mobile.tsx        # Mobile breakpoint hook
    │   └── use-toast.ts          # Toast hook (shadcn)
    │
    ├── components/
    │   ├── NavLink.tsx           # NavLink wrapper component
    │   ├── layout/
    │   │   └── DashboardLayout.tsx  # Sidebar + protected layout
    │   ├── billing/
    │   │   └── Receipt.tsx       # 80mm thermal receipt template
    │   └── ui/                   # 49 shadcn/ui components
    │       ├── button.tsx
    │       ├── card.tsx
    │       ├── dialog.tsx
    │       ├── table.tsx
    │       ├── tabs.tsx
    │       ├── toast.tsx
    │       ├── chart.tsx
    │       └── ... (49 total)
    │
    ├── pages/
    │   ├── Index.tsx             # ⚠️ Unused placeholder page
    │   ├── Login.tsx             # Login page
    │   ├── NotFound.tsx          # 404 page
    │   ├── Billing.tsx           # Main POS billing page
    │   ├── Reports.tsx           # Sales reports
    │   ├── MenuManagement.tsx    # Menu CRUD
    │   ├── SettingsPage.tsx      # Restaurant settings
    │   ├── UserManagement.tsx    # User management (admin)
    │   ├── expenses/
    │   │   ├── AddExpense.tsx    # Add expense form
    │   │   ├── EditExpense.tsx   # Edit expense form
    │   │   ├── ExpenseList.tsx   # Expense list + filters
    │   │   └── ExpenseReports.tsx  # Expense analytics
    │   └── reports/
    │       └── ProfitLoss.tsx    # P&L statement
    │
    └── test/
        ├── setup.ts             # Vitest setup
        └── example.test.ts      # Placeholder test
```

---

## 4. Existing Features (Verified)

### ✅ Fully Implemented
| Feature | Status | Files |
|---|---|---|
| Login / Authentication | ✅ Working | `Login.tsx`, `authStore.ts` |
| Role-based access (Admin/Cashier) | ✅ Working | `DashboardLayout.tsx`, `authStore.ts`, RLS policies |
| Sidebar navigation with collapsible sections | ✅ Working | `DashboardLayout.tsx` |
| Menu management (CRUD) | ✅ Working | `MenuManagement.tsx` |
| Category-based filtering | ✅ Working | `Billing.tsx`, `MenuManagement.tsx` |
| Image upload for menu items | ✅ Working | `MenuManagement.tsx` (Supabase Storage) |
| Billing / Order taking | ✅ Working | `Billing.tsx`, `cartStore.ts` |
| Cart with add/remove/quantity | ✅ Working | `cartStore.ts` |
| Discount support | ✅ Working | `cartStore.ts`, `Billing.tsx` |
| Multiple payment methods (cash/card/mobile) | ✅ Working | `Billing.tsx`, `cartStore.ts` |
| Order types (dine-in/takeaway/delivery) | ✅ Working | `Billing.tsx` |
| Bill number generation (AKF-YYYYMMDD-NNN) | ✅ Working | `Billing.tsx` |
| Change calculation | ✅ Working | `Billing.tsx` |
| 80mm thermal receipt printing | ✅ Working | `Receipt.tsx`, `react-to-print` |
| Sales reports (today + date range) | ✅ Working | `Reports.tsx` |
| Hourly sales chart | ✅ Working | `Reports.tsx` (Recharts) |
| Top selling items | ✅ Working | `Reports.tsx` |
| Payment breakdown | ✅ Working | `Reports.tsx` |
| Settings (restaurant info, tax, receipt footer) | ✅ Working | `SettingsPage.tsx` |
| User management (admin creates users) | ✅ Working | `UserManagement.tsx` + Edge Function |
| Expense management (full CRUD) | ✅ Working | `expenses/` folder (4 pages) |
| Expense categories (typed/grouped) | ✅ Working | `AddExpense.tsx`, `EditExpense.tsx` |
| Expense reports (daily/monthly/trends) | ✅ Working | `ExpenseReports.tsx` |
| Profit & Loss statement | ✅ Working | `ProfitLoss.tsx` |
| Today's overview (revenue/expenses/profit) on billing | ✅ Working | `Billing.tsx` |
| Receipt image upload for expenses | ✅ Working | `AddExpense.tsx` |

### ⚠️ Partial / Not Wired
| Feature | Status | Notes |
|---|---|---|
| Tax calculation | ⚠️ Exists in settings but NOT wired | `cartStore.ts` returns `getTax: () => 0` hardcoded |
| Deals | ⚠️ DB table seeded but no UI | `deals` table exists with seed data, no page |
| Dark mode | ⚠️ Tailwind config ready, no toggle | `darkMode: ["class"]` configured |

### ❌ Missing Features
| Feature | Status |
|---|---|
| Inventory tracking | ❌ Not implemented |
| Customer management / loyalty | ❌ Not implemented |
| Table management | ❌ Not implemented |
| Kitchen display system (KDS) | ❌ Not implemented |
| Bill editing / void / refund | ❌ Not implemented |
| Item variants/sizes (pizza sizes handled as separate items) | ❌ No variant system |
| Employee attendance / shift management | ❌ Not implemented |
| Barcode/QR scanning | ❌ Not implemented |
| Multi-branch support | ❌ Not implemented |
| Offline mode | ❌ Not implemented |
| Export to Excel/PDF | ❌ Not implemented |

---

## 5. Database Schema

### Tables (10 total)

#### `user_roles`
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK, auto |
| user_id | UUID | FK → auth.users, NOT NULL |
| role | app_role (enum) | DEFAULT 'cashier' |
| | | UNIQUE(user_id, role) |

#### `user_profiles`
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK, FK → auth.users |
| username | TEXT | UNIQUE, NOT NULL |
| created_at | TIMESTAMPTZ | DEFAULT now() |

#### `categories`
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK, auto |
| category_name | TEXT | UNIQUE, NOT NULL |
| display_order | INTEGER | DEFAULT 0 |
| created_at | TIMESTAMPTZ | DEFAULT now() |

#### `menu_items`
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK, auto |
| item_name | TEXT | NOT NULL |
| category | TEXT | NOT NULL |
| price | DECIMAL(10,2) | NOT NULL |
| description | TEXT | nullable |
| image_url | TEXT | nullable |
| is_available | BOOLEAN | DEFAULT true |
| created_at | TIMESTAMPTZ | DEFAULT now() |
| updated_at | TIMESTAMPTZ | DEFAULT now() |

#### `deals`
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK, auto |
| deal_name | TEXT | NOT NULL |
| deal_code | TEXT | UNIQUE, NOT NULL |
| deal_items | JSONB | DEFAULT '[]' |
| deal_price | DECIMAL(10,2) | NOT NULL |
| is_active | BOOLEAN | DEFAULT true |
| created_at / updated_at | TIMESTAMPTZ | defaults |

#### `bills`
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK, auto |
| bill_number | TEXT | UNIQUE, NOT NULL |
| customer_name | TEXT | nullable |
| customer_phone | TEXT | nullable |
| order_type | TEXT | DEFAULT 'takeaway' |
| subtotal | DECIMAL(10,2) | NOT NULL |
| discount | DECIMAL(10,2) | DEFAULT 0 |
| tax | DECIMAL(10,2) | DEFAULT 0 |
| total | DECIMAL(10,2) | NOT NULL |
| payment_method | TEXT | DEFAULT 'cash' |
| amount_paid | DECIMAL(10,2) | nullable |
| change_returned | DECIMAL(10,2) | nullable |
| created_at | TIMESTAMPTZ | DEFAULT now() |
| created_by | UUID | FK → auth.users |

#### `bill_items`
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK, auto |
| bill_id | UUID | FK → bills(id) CASCADE |
| item_name | TEXT | NOT NULL |
| quantity | INTEGER | NOT NULL |
| unit_price | DECIMAL(10,2) | NOT NULL |
| total_price | DECIMAL(10,2) | NOT NULL |
| created_at | TIMESTAMPTZ | DEFAULT now() |

#### `settings`
| Column | Type | Constraints |
|---|---|---|
| setting_key | TEXT | PK |
| setting_value | TEXT | NOT NULL |
| updated_at | TIMESTAMPTZ | DEFAULT now() |

#### `expenses`
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK, auto |
| date | DATE | NOT NULL, DEFAULT CURRENT_DATE |
| category | VARCHAR(100) | NOT NULL |
| description | TEXT | NOT NULL |
| amount | DECIMAL(10,2) | NOT NULL |
| payment_method | VARCHAR(20) | DEFAULT 'cash' |
| paid_to | VARCHAR(200) | nullable |
| receipt_image | TEXT | nullable |
| created_by | UUID | FK → auth.users |
| created_at / updated_at | TIMESTAMPTZ | defaults |

#### `expense_categories`
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK, auto |
| category_name | VARCHAR(100) | UNIQUE, NOT NULL |
| category_type | VARCHAR(50) | NOT NULL |
| is_active | BOOLEAN | DEFAULT true |
| created_at | TIMESTAMPTZ | DEFAULT now() |

### Enums
- `app_role`: `'admin'` | `'cashier'`

### Functions
- `has_role(user_id, role)` — RLS helper
- `handle_new_user()` — Trigger: auto-create profile on signup
- `update_expenses_updated_at()` — Trigger: auto-update timestamp

### Indexes
- `idx_menu_items_category`, `idx_menu_items_available`
- `idx_bills_date`, `idx_bills_number`
- `idx_expenses_date`, `idx_expenses_category`
- `idx_bill_items_bill_id`

### RLS Policies
All tables have RLS enabled with appropriate policies:
- **Public read** for `categories`, `menu_items`, `deals`
- **Authenticated read** for `bills`, `bill_items`, `settings`, `expenses`, `expense_categories`
- **Admin-only write** for `menu_items`, `categories`, `deals`, `settings`, `expenses`
- **User insert** for `bills`, `bill_items` (with `created_by` check)

### Storage
- Bucket: `menu-images` (public read, authenticated upload)

---

## 6. Key Files & Their Purpose

| File | Purpose | Lines |
|---|---|---|
| `src/App.tsx` | Root routing + providers | 66 |
| `src/stores/authStore.ts` | Auth state (login/logout/role) | 81 |
| `src/stores/cartStore.ts` | Cart state (items/discount/payment) | 91 |
| `src/pages/Billing.tsx` | **Main POS billing page** — menu grid + cart + print | 424 |
| `src/pages/Reports.tsx` | Sales reports w/ charts | 285 |
| `src/pages/MenuManagement.tsx` | Menu CRUD with image upload | 221 |
| `src/pages/SettingsPage.tsx` | Restaurant settings management | 110 |
| `src/pages/UserManagement.tsx` | User creation (via edge function) | 144 |
| `src/pages/Login.tsx` | Login form | 78 |
| `src/pages/expenses/ExpenseList.tsx` | Expense list + filters + delete | 277 |
| `src/pages/expenses/AddExpense.tsx` | Add expense form | 235 |
| `src/pages/expenses/EditExpense.tsx` | Edit expense form | 161 |
| `src/pages/expenses/ExpenseReports.tsx` | Expense analytics (pie/bar/line charts) | 279 |
| `src/pages/reports/ProfitLoss.tsx` | P&L statement | 194 |
| `src/components/layout/DashboardLayout.tsx` | Sidebar nav + auth guard | 131 |
| `src/components/billing/Receipt.tsx` | 80mm thermal receipt template | 111 |
| `src/integrations/supabase/types.ts` | Auto-generated DB types | 462 |
| `supabase/functions/create-user/index.ts` | Edge function for user creation | 62 |

---

## 7. How Current Features Work

### Billing Flow
1. User navigates to `/dashboard/billing` (default page)
2. Menu items load from `menu_items` table (filtered by `is_available`)
3. Categories load from `categories` table (ordered by `display_order`)
4. User selects category filter or searches by name
5. Clicking an item calls `cart.addItem()` → adds to Zustand cart store
6. Cart shows items with +/- controls and remove button
7. User sets customer info, order type, payment method, discount, amount paid
8. "Print Bill" button:
   - Generates bill number: `AKF-YYYYMMDD-NNN` (sequential per day)
   - Inserts into `bills` table
   - Inserts each item into `bill_items` table
   - Sets `lastBill` state → renders hidden `Receipt` component
   - Calls `react-to-print` to trigger browser print dialog
   - Clears cart & refreshes today's overview

### Menu Management
1. Admin sees grid of all menu items with category filter
2. "Add Item" opens dialog with name/category/price/description/image/availability
3. Images uploaded to Supabase Storage `menu-images` bucket
4. Edit/Delete operations directly on the Supabase `menu_items` table
5. Toggle availability switch for quick enable/disable

### Authentication
1. Login uses `username@akfburgers.local` email convention
2. Supabase Auth `signInWithPassword` 
3. On auth state change, profile + roles are fetched
4. Role determined by checking `user_roles` table (`admin` or `cashier`)
5. `DashboardLayout` redirects to `/login` if no user
6. Admin-only routes (Menu, Settings, Users) hidden from cashier sidebar
7. New users created via Supabase Edge Function (avoids logging out current admin)

### Receipt Printing
1. Uses `react-to-print` library with a hidden `<Receipt>` component
2. Receipt is styled for 80mm thermal paper (monospace font)
3. Print CSS hides everything except `.print-receipt`
4. ⚠️ Restaurant info is **hardcoded** in Receipt.tsx (should use settings)

### Reports
1. **Sales Reports**: Fetches bills for today or custom date range; shows total orders, revenue, avg order, payment breakdown, top selling items, hourly chart
2. **Expense Reports**: Daily/monthly/30-day trend views with pie charts and line graphs
3. **Profit & Loss**: Revenue vs expenses comparison with profit margin calculation

---

## 8. Current Issues Found

### 🔴 Critical Issues

1. **`.env` committed to repo** — Contains real Supabase URL and anon key. While the anon key is a publishable key (not secret), the `.env` pattern should still be in `.gitignore`. The actual security is maintained by RLS policies, but this is bad practice.

2. **Receipt hardcodes restaurant info** — `Receipt.tsx` has restaurant name, address, and phone numbers hardcoded instead of reading from the `settings` table. Any changes in Settings page won't reflect on receipts.

3. **Tax not wired** — `cartStore.ts` line 83: `getTax: () => 0` — Tax is hardcoded to zero despite Settings page having tax toggle and percentage input.

### 🟡 Warning Issues

4. **No service/API layer** — All Supabase queries are inline in page components. No reusable functions, no custom hooks for data fetching. Makes maintenance and testing harder.

5. **No error boundaries** — If any component throws, the whole app crashes. No React error boundary implemented.

6. **`App.css` is unused** — Leftover from Vite template. It has conflicting styles (`max-width: 1280px`, `padding: 2rem`, `text-align: center`) that would break the layout if imported.

7. **`Index.tsx` is dead code** — Says "Welcome to Your Blank App" — never rendered (root `/` redirects to billing).

8. **`index.html` has Lovable branding** — Title says "Lovable App" instead of "AKF Burgers POS".

9. **Bill number race condition** — Two simultaneous bills could get the same number since the counter is read then incremented without a lock.

10. **No loading states on initial data fetch** — `Billing.tsx` shows no loading indicator while fetching menu items.

11. **`deals` table seeded but has no UI** — Deals exist in DB but cannot be managed or used in billing.

12. **`menu_items.category` is text, not FK** — No foreign key to `categories` table. Could lead to orphaned categories.

13. **React Query not used** — `@tanstack/react-query` is installed and Provider is set up, but **zero** queries use it. All data fetching is plain `async/await` in `useEffect`. This means no caching, no auto-refresh, no loading/error states from RQ.

### 🟢 Minor Issues

14. **`@ts-ignore` in Billing.tsx** — Line 46: `// @ts-ignore` for react-to-print v2 compatibility.

15. **`any` types used** — `lastBill` is `any`, `onValueChange` casts to `any` in several places.

16. **`noImplicitAny: false`** and **`strictNullChecks: false`** in tsconfig — Reduces TypeScript safety.

17. **`lovable-tagger`** devDependency — Development tool for Lovable.dev platform, not needed for production.

18. **No accessibility attributes** — No `aria-labels` on icon-only buttons.

19. **No form validation feedback** — Category select shows no error state, only toast messages.

20. **Expense categories not seeded** — Unlike menu categories, `expense_categories` has no seed data in migrations.

---

## 9. Code Quality Score

| Category | Score | Notes |
|---|---|---|
| **TypeScript Usage** | 6/10 | Types exist but `any`, `noImplicitAny: false`, `strictNullChecks: false` weaken them |
| **Error Handling** | 5/10 | Toast messages on errors, but no error boundaries, no global error handling |
| **Code Organization** | 7/10 | Clean folder structure, stores separated, but no service layer |
| **Performance** | 6/10 | No React Query caching, no memo/useCallback on renders, full table scans |
| **Security** | 7/10 | RLS policies correct, role checks in UI + DB, but .env committed |
| **Testing** | 1/10 | Only a placeholder test exists (`1 + 1 = 2`) |
| **Accessibility** | 3/10 | Basic form labels, but no aria attributes, no keyboard nav |
| **Print/Receipt** | 7/10 | Good 80mm template, proper print CSS, but hardcoded info |
| **State Management** | 8/10 | Clean Zustand stores, proper cart logic |
| **UI/UX** | 8/10 | Professional shadcn/ui, consistent design, good hover states |

**Overall: 6.5/10** — Solid for an MVP, needs improvements before serious production use.

---

## 10. Readiness for Expense Feature

**Expense management is already implemented!** 🎉

The codebase already contains:
- ✅ `expenses` and `expense_categories` tables with RLS
- ✅ Full CRUD pages (Add, Edit, List, Reports)
- ✅ Category grouping (by type: Raw Material, Staff, Operating, Other)
- ✅ Filtering by period (today/week/month/custom)
- ✅ Category and search filters
- ✅ Receipt image upload
- ✅ Expense reports with pie charts, bar charts, line trends
- ✅ Profit & Loss statement integrating revenue + expenses
- ✅ Today's revenue/expenses/profit overview on billing page
- ✅ Admin-only access for add/edit/delete
- ✅ Delete confirmation dialog

The expense feature appears to have been added in the second migration (`20260218...`) and is fully integrated into the routing and sidebar.

---

## 11. Integration Plan for Additional Features

Since expenses are already done, here are the recommended next priorities:

### Priority 1: Fix Critical Issues
1. Wire tax calculation from settings into `cartStore.getTax()`
2. Make receipt read from `settings` table instead of hardcoded values
3. Update `index.html` title/meta to "AKF Burgers POS"
4. Add `.env` to `.gitignore` (create `.env.example` instead)

### Priority 2: Code Quality
1. Create a `src/services/` layer for Supabase queries
2. Convert data fetching to React Query `useQuery` hooks  
3. Add React error boundary wrapper
4. Remove unused `App.css` and `Index.tsx`
5. Enable `strictNullChecks` gradually

### Priority 3: Feature Gaps
1. Seed `expense_categories` with common categories
2. Wire deals into billing page
3. Add bill void/edit functionality
4. Add export to PDF/Excel for reports

---

## 12. Next Steps

Based on the analysis, here's the recommended order of work:

1. **Fix the 3 critical issues** (receipt hardcoding, tax wiring, .env)
2. **Seed expense categories** if not already done via Supabase dashboard
3. **Clean up dead code** (App.css, Index.tsx, Lovable branding)
4. **Create service layer** for reusable data fetching
5. **Add React Query** for caching and loading states
6. **Implement deals UI** in billing
7. **Add dark mode toggle** (infrastructure already exists)
8. **Add bill management** (view/void past bills)
9. **Add export functionality** (PDF/Excel)
10. **Write tests** for critical flows (billing, cart, auth)
