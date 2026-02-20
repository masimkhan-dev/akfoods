# 🍔 AKF POS System

A fast-food Point of Sale (POS) system built for **AKF Burgers**, Peshawar. Designed for daily restaurant operations — billing, menu management, expense tracking, sales reports, and user management.

---

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| UI Components | shadcn/ui + Tailwind CSS |
| State Management | Zustand |
| Backend / Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Edge Functions | Supabase Edge Functions (Deno) |
| Print | react-to-print (80mm thermal receipt) |
| Charts | Recharts |

---

## 🚀 Features

### 🧾 Billing
- Fast menu browsing with category filters and search
- Cart with quantity controls (add, adjust, remove)
- Supports Dine-In, Takeaway, Delivery order types
- Cash, Card, and Mobile payment methods
- Dynamic discount entry and change calculation
- **Atomic bill number generation** — no duplicates under concurrent cashiers (`AKF-YYYYMMDD-XXX` format)
- Full error handling: bill save failure retains cart data for retry
- Today's Revenue, Expenses, and Net Profit overview bar

### 🖨️ Receipt
- 80mm thermal printer format
- Dynamic branding: restaurant name, address, phone pulled from Settings
- Itemized list with quantity and totals
- GST/Tax display (if enabled)
- Discount and change breakdown
- Configurable footer message (supports line breaks)

### 🍔 Menu Management
- Add, edit, delete menu items
- Toggle item availability (hides from billing instantly)
- Category assignment
- Image upload to Supabase Storage

### 📊 Reports
- Today's sales summary (auto-loaded)
- Date range filtering
- Payment method breakdown (Cash / Card / Mobile)
- Top selling items by quantity and revenue
- Hourly sales bar chart
- Recent bills table

### 💸 Expenses
- Daily expense logging
- Visible in today's net profit calculation

### ⚙️ Settings
- Restaurant name, address, phone numbers
- Tax (GST) toggle and percentage
- Receipt footer message
- All settings are live — receipt reflects changes immediately

### 👤 User Management
- Admin can create Cashier or Admin accounts
- Role-based access control (RLS enforced at DB level)
- Cashiers cannot access Settings or User Management
- User creation via secure Edge Function (does not log out current admin)

---

## 🗂️ Project Structure

```
src/
├── components/
│   └── billing/
│       └── Receipt.tsx         # Thermal receipt component (print-ready)
├── pages/
│   ├── Billing.tsx             # Main POS billing screen
│   ├── MenuManagement.tsx      # Menu CRUD
│   ├── Reports.tsx             # Sales reports
│   ├── SettingsPage.tsx        # Store settings
│   ├── UserManagement.tsx      # User CRUD
│   └── expenses/               # Expense pages
├── stores/
│   ├── cartStore.ts            # Cart state (Zustand)
│   └── authStore.ts            # Auth + role state (Zustand)
supabase/
├── functions/
│   └── quick-processor/        # Edge Function: secure user creation
└── migrations/
    ├── 20260217033622_*.sql    # Full schema: tables, RLS, seed data
    ├── 20260218032249_*.sql    # Additional schema updates
    └── 20260219185500_uat_fix_bill_numbers.sql  # Atomic bill counter fix
```

---

## ⚙️ Local Development Setup

### 1. Clone the repository
```bash
git clone <repo-url>
cd akf-pos-system-main
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Copy `.env.example` to `.env` and fill in your Supabase credentials:
```bash
cp .env.example .env
```

```env
VITE_SUPABASE_PROJECT_ID=your_project_id
VITE_SUPABASE_URL=https://your_project_id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
```

> ⚠️ **Never commit `.env` to version control.** It is already in `.gitignore`.

### 4. Run database migrations
Go to your [Supabase Dashboard](https://supabase.com) → SQL Editor and run all `.sql` files in `supabase/migrations/` in chronological order.

### 5. Deploy the Edge Function
```bash
npx supabase functions deploy quick-processor
```

### 6. Start the dev server
```bash
npm run dev
```

---

## 🗄️ Database Schema Overview

| Table | Purpose |
|-------|---------|
| `user_profiles` | Stores username linked to auth user |
| `user_roles` | Role assignment (`admin` / `cashier`) |
| `categories` | Menu categories with display order |
| `menu_items` | Menu items with price, availability, image |
| `deals` | Combo deals (future use) |
| `bills` | Bill header: totals, payment, order type |
| `bill_items` | Bill line items: name, qty, price |
| `expenses` | Daily expense entries |
| `settings` | Key-value store for all app settings |
| `bill_counters` | Atomic daily bill number counter |

All tables have **Row Level Security (RLS)** enabled.

---

## 🔐 Security

- All tables protected by **RLS policies** — unauthenticated access is denied
- Admin-only mutations enforced at the database level via `has_role()` function
- User creation handled by a **server-side Edge Function** using the Service Role key (never exposed to frontend)
- Cashiers can: create bills, view menu, view their own data
- Cashiers cannot: access Settings, User Management, or modify menu
- `.env` file is excluded from version control

---

## 🖨️ Thermal Printer Setup

The receipt is formatted for **80mm thermal printers**.

1. Connect your thermal printer and set it as the **default printer** in Windows
2. In the browser print dialog, set:
   - Paper size: **80mm** (or closest available)
   - Margins: **None**
   - Scale: **100%**
3. Click "Print Bill" — it will auto-trigger the print dialog

---

## 👥 Default Roles

| Role | Billing | Menu Mgmt | Reports | Settings | User Mgmt |
|------|---------|-----------|---------|----------|-----------|
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Cashier** | ✅ | ❌ | ✅ (view) | ❌ | ❌ |

---

## 📋 Deployment Checklist

Before going live, verify the following:

- [ ] All SQL migrations run in Supabase SQL Editor
- [ ] Edge Function `quick-processor` deployed and confirmed active
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set in Edge Function secrets
- [ ] Settings page updated with correct restaurant name, address, phone
- [ ] Test bill created and receipt printed with correct branding
- [ ] Test cashier account created and role restrictions verified
- [ ] Tax setting toggled and confirmed on receipt
- [ ] `.env` **not** committed to git

---

## 📄 License

Private — AKF Burgers internal use only.

---

*Built with ❤️ for AKF Burgers, Peshawar.*
