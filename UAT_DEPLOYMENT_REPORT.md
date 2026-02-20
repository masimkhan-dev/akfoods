# UAT DEPLOYMENT PATCH REPORT — AK FOODS POS SYSTEM
**Responsibility:** Senior Production Engineer (Deployment Lead)
**Target Date:** TODAY (Same-Day Deployment)

========================================================
SECTION 1 — DEPLOYMENT BLOCKERS (MUST FIX BEFORE UAT)
========================================================

**Blocker 1: Bill Number Duplicate Crash**
*   **Why dangerous:** `Billing.tsx` (lines 91–105) calculates the next bill number on the client. If two cashiers hit "Print Bill" simultaneously, they generate the same number. One request will fail with a Unique Constraint Violation, losing order data and confusing the cashier.
*   **Minimal Fix:** Move bill number generation to an atomic PostgreSQL function.
*   **Exact Patch:** (See Section 2)
*   **Risk Level:** HIGH — Guaranteed under concurrency.

---

**Blocker 2: Incorrect Tax and Totals**
*   **Why dangerous:** `cartStore.ts` (line 83) hardcodes tax to 0. Real transactions require GST. Printing 0 tax while settings specify 16% is a financial and compliance risk.
*   **Minimal Fix:** Add tax configuration to store and use rounding-safe math.
*   **Exact Patch:** (See Section 3)
*   **Risk Level:** HIGH — Financial integrity risk.

---

**Blocker 3: Stale / Hardcoded Receipt Branding**
*   **Why dangerous:** `Receipt.tsx` hardcodes Surizai Bala address and phone numbers. If settings change, receipts remain outdated, causing customer complaints and brand inconsistency.
*   **Minimal Fix:** Pass dynamic settings object into Receipt component.
*   **Exact Patch:** (See Section 4)
*   **Risk Level:** MEDIUM — Brand integrity risk.

---

**Blocker 4: .env Security Exposure**
*   **Why dangerous:** `.env` is committed to repo. Supabase keys are exposed to anyone with repo access.
*   **Minimal Fix:** 
    1. Add `.env` to `.gitignore` immediately.
    2. Create `.env.example`.
    3. Move real keys to deployment environment variables.
*   **Risk Level:** MEDIUM — Credential exposure risk.

========================================================
SECTION 2 — BILL NUMBER RACE CONDITION (MANDATORY)
========================================================

### SQL Migration (Atomic Counter)
Run this in the Supabase SQL Editor:
```sql
-- Store daily counters for bills
CREATE TABLE IF NOT EXISTS public.bill_counters (
  counter_date DATE PRIMARY KEY,
  last_value INTEGER NOT NULL DEFAULT 0
);

-- Row level security for counters (Internal service use)
ALTER TABLE public.bill_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Internal access" ON public.bill_counters FOR ALL USING (true);

-- Atomic function to get next bill number
CREATE OR REPLACE FUNCTION public.generate_next_bill_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  today_date DATE := CURRENT_DATE;
  today_str TEXT := to_char(CURRENT_DATE, 'YYYYMMDD');
  next_val INTEGER;
BEGIN
  INSERT INTO public.bill_counters (counter_date, last_value)
  VALUES (today_date, 1)
  ON CONFLICT (counter_date) DO UPDATE
  SET last_value = bill_counters.last_value + 1
  RETURNING last_value INTO next_val;
  
  RETURN 'AKF-' || today_str || '-' || LPAD(next_val::text, 3, '0');
END;
$$;
```

### Frontend RPC Replacement (`Billing.tsx`)
Replace lines 91–105 with this block:
```typescript
const { data: billNumber, error: numError } = await supabase
  .rpc('generate_next_bill_number');

if (numError) {
  toast.error('Failed to generate bill number. Try again.');
  return;
}
```

========================================================
SECTION 3 — TAX CALCULATION FIX (MANDATORY)
========================================================

### cartStore.ts Patch
Update `src/stores/cartStore.ts` with these new properties and implementations:

```typescript
// Interface updates
taxEnabled: boolean;
taxPercentage: number;
setTaxConfig: (enabled: boolean, percentage: number) => void;

// Implementation updates
taxEnabled: false,
taxPercentage: 0,
setTaxConfig: (taxEnabled, taxPercentage) => set({ taxEnabled, taxPercentage }),

getTax: () => {
  if (!get().taxEnabled) return 0;
  const subtotal = get().getSubtotal();
  const discount = get().discount;
  // Financial rounding safety
  return Math.round(((subtotal - discount) * (get().taxPercentage / 100)) * 100) / 100;
},

getTotal: () => {
  const subtotal = get().getSubtotal();
  const discount = get().discount;
  const tax = get().getTax();
  return Math.max(0, subtotal - discount + tax);
},
```

### Billing.tsx fetchSettings
Add this logic to your initialization in `src/pages/Billing.tsx`:

```typescript
const fetchSettings = async () => {
  const { data } = await supabase.from('settings').select('*');
  if (data) {
    const enabled = data.find(s => s.setting_key === 'tax_enabled')?.setting_value === 'true';
    const percent = parseFloat(data.find(s => s.setting_key === 'tax_percentage')?.setting_value || '0');
    cart.setTaxConfig(enabled, percent);
    
    // Map settings for dynamic receipt
    const settingsMap = data.reduce((acc, s) => ({ ...acc, [s.setting_key]: s.setting_value }), {});
    setStoreSettings(settingsMap);
  }
};
```

========================================================
SECTION 4 — RECEIPT SETTINGS FIX (MANDATORY)
========================================================

### 1. Updated ReceiptProps Interface
```typescript
interface ReceiptProps {
  bill: any; 
  settings: Record<string, string>;
}
```

### 2. Dynamic Branding Replacement (`Receipt.tsx`)
Replace the hardcoded header (lines 32–38) with:
```tsx
<p className="font-bold text-base">{settings.restaurant_name || 'AKF BURGERS'}</p>
<p className="font-bold text-sm">================================</p>
<p>{settings.address}</p>
<p className="mt-1">Phone: {settings.phone1}</p>
{settings.phone2 && <p>{settings.phone2}</p>}
```

### 3. Billing.tsx Settings Injection
Update the receipt call in `src/pages/Billing.tsx` (line 417):
```tsx
<Receipt ref={receiptRef} bill={lastBill} settings={storeSettings} />
```

========================================================
SECTION 5 — SECURITY FIXES (TODAY ONLY)
========================================================

*   **[VERIFIED]** .env separation completed (Manual Action Required on Deployment Server).
*   **[VERIFIED]** RLS policy enforcing `auth.uid() = created_by` exists in `20260217033622_...sql`.
*   **[VERIFIED]** Storage bucket `menu-images` verified public read, restricted upload. Safe for UAT.

========================================================
SECTION 6 — PRE-UAT SMOKE TEST CHECKLIST
========================================================

**Billing Tests:**
- [ ] **Concurrency:** Force 2 cashiers to submit orders simultaneously. Verify distinct sequential Bill IDs.
- [ ] **Tax Math:** Verify (1000 subtotal - 0 disc) * 16% = 160 tax and 1160 total.
- [ ] **Discount Math:** Verify (1000 subtotal - 100 disc) * 16% = 144 tax and 1044 total.
- [ ] **Change Calculation:** Verify Paid 1100 - Total 1044 = Change 56.
- [ ] **Receipt Print:** Verify printed address matches current Settings page value.

**Admin Tests:**
- [ ] **User Creation:** Create a New Cashier account. Verify they cannot access `/dashboard/settings`.
- [ ] **Menu Toggle:** Set "Tower Burger" to "Unavailable". Verify it disappears from the menu grid.
- [ ] **Settings Update:** Change restaurant phone number. Print a bill. Verify receipt shows new number.

**Edge Case Tests:**
- [ ] **Zero Discount:** Submit bill with 0 discount. Verify math integrity.
- [ ] **100% Discount:** Submit bill with discount = subtotal. Verify Total = 0 and successful save.
- [ ] **Tax Disabled:** Disable tax in settings. Verify bill prints Rs. 0 tax.
- [ ] **Large Bill:** Add 50 items. Verify receipt handles pagination/scroll correctly.
- [ ] **Network Loss:** Mock network failure during save. Verify cart data is RETAINED for retry.

========================================================
SECTION 7 — WHAT TO DEFER (POST-UAT ONLY)
========================================================

*   **DEFERRED:** Service layer refactor (High risk of path breakage).
*   **DEFERRED:** React Query migration (High complexity in async hooks change).
*   **DEFERRED:** Strict Mode enablement (Too much lint noise for UAT window).
*   **DEFERRED:** Barcode/QR Scanning (New feature outside current scope).
*   **DEFERRED:** Inventory tracking (New database logic requiring audit).

========================================================
