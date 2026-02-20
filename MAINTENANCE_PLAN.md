# 🗓️ AKF POS System — Future Maintenance Plan

**System:** AKF Burgers POS  
**Version:** 1.0 (UAT Release)  
**Last Updated:** 2026-02-20  
**GitHub:** https://github.com/masimkhan-dev/akfoods

---

## 📅 DAILY (Cashier Responsibility)

| Task | Action |
|------|--------|
| **Start of Day** | Open app → verify menu items are correct |
| **End of Day** | Check Reports → Today's summary for revenue/expenses |
| **Any Issue** | Note the bill number if error occurs, report to admin |

---

## 📅 WEEKLY (Admin Responsibility)

| Task | Action |
|------|--------|
| **Sales Review** | Reports → Date Range → check weekly revenue |
| **Expense Check** | Expense Reports → This Week → verify all logged |
| **P&L Check** | Profit & Loss → weekly range → confirm positive margin |
| **Menu Review** | Mark unavailable items → toggle availability OFF |

---

## 📅 MONTHLY (Admin + Developer)

| Task | Action |
|------|--------|
| **DB Backup** | Supabase Dashboard → Settings → Database → Download backup |
| **Bill Counter Check** | Verify `bill_counters` table is auto-resetting daily |
| **User Audit** | User Management → remove any old/unused accounts |
| **Settings Verify** | Check restaurant info, tax %, receipt footer are correct |
| **Supabase Plan Check** | Verify free tier limits not exceeded (500MB DB, 5GB bandwidth) |

---

## 🚀 PHASE 2 — Feature Additions (Post-UAT)

> These were deferred from UAT. Safe to add after a stable production run of 30+ days.

### 🔴 High Value — Add First

| Feature | Why | Estimated Effort |
|---------|-----|-----------------|
| **Inventory Tracking** | Know when stock is low | 1 week |
| **Bill Reprint** | Reprint old bills by number | 1 day |
| **Auto Daily DB Backup** | Safety net for all data | 2 days |
| **Kitchen Order Display** | Show orders in kitchen without printing | 3 days |

### 🟡 Medium Value — Add Later

| Feature | Why | Estimated Effort |
|---------|-----|-----------------|
| **Customer Loyalty Points** | Reward repeat customers | 1 week |
| **Shift Management** | Track which cashier worked when | 3 days |
| **SMS/WhatsApp Receipt** | Send receipt to customer phone | 3 days |
| **Multi-Branch Support** | If AKF opens new locations | 2 weeks |

### 🟢 Nice to Have — Future

| Feature | Why | Estimated Effort |
|---------|-----|-----------------|
| **Mobile App (PWA)** | Works offline on phone/tablet | 1 week |
| **Barcode Scanner** | Scan items instead of clicking | 3 days |
| **Online Order Integration** | Accept orders from website | 2 weeks |

---

## 🔐 SECURITY MAINTENANCE

| Frequency | Task |
|-----------|------|
| **Monthly** | Review Supabase RLS policies — no unexpected changes |
| **Monthly** | Rotate Supabase anon key if any technical staff leaves |
| **Quarterly** | Change all cashier passwords |
| **On staff change** | Immediately delete old user account from User Management |
| **Never** | Share `.env` file or Service Role key with anyone |
| **Never** | Commit `.env` to GitHub (already gitignored ✅) |

---

## 🐛 BUG REPORTING PROCESS

When a bug is found, collect this information before calling the developer:

```
1. Which page?         e.g. Billing, Reports, Settings
2. What action?        e.g. "Clicked Print Bill"
3. Error message?      e.g. exact text shown on screen
4. Bill number?        e.g. AKF-20260220-005 (if billing related)
5. Time it occurred?   e.g. 3:45 PM
```

---

## 💾 SUPABASE FREE TIER LIMITS

| Resource | Free Limit | Action If Near Limit |
|----------|-----------|---------------------|
| Database size | 500 MB | Archive/delete `bill_items` older than 1 year |
| Bandwidth | 5 GB/month | Compress menu images |
| Edge Function calls | 500K/month | Fine for normal restaurant usage |
| Auth users | Unlimited | No issue |
| Storage | 1 GB | Compress menu images before upload |

---

## 📋 QUICK REFERENCE — Common Admin Tasks

| Situation | What To Do |
|-----------|-----------|
| New menu item | Menu Management → Add Item |
| Price change | Menu Management → Edit Item → Update Price |
| Item out of stock | Menu Management → Toggle Availability OFF |
| Item back in stock | Menu Management → Toggle Availability ON |
| New cashier hired | User Management → Add User → Role: Cashier |
| Staff leaves | User Management → contact developer to delete account |
| Tax rate changes | Settings → Tax Percentage → Save |
| New phone number | Settings → Phone 1 or Phone 2 → Save |
| Receipt footer change | Settings → Receipt Footer → Save |
| Clean test/dummy data | Run `supabase/migrations/cleanup_dummy_data.sql` in Supabase SQL Editor |

---

## 🗄️ DATABASE BACKUP — Manual Steps

1. Go to [supabase.com](https://supabase.com) → Login
2. Select project → **Settings** (left sidebar)
3. Go to **Database** section
4. Click **Download backup**
5. Save the `.sql` file with today's date, e.g. `backup-2026-02-20.sql`
6. Store in a secure location (Google Drive, external drive)

> ⚠️ **Recommended:** Take backup before any major change (price updates, menu overhaul, etc.)

---

## 🔄 HOW TO UPDATE THE APP (for Developer)

```bash
# 1. Pull latest changes
git pull origin main

# 2. Install any new dependencies
npm install

# 3. Run any new migrations in Supabase SQL Editor

# 4. Test locally
npm run dev

# 5. Build for production (if deploying to hosting)
npm run build

# 6. Commit and push
git add .
git commit -m "fix: description of what changed"
git push origin main
```

---

## 🆘 EMERGENCY CONTACTS

> Fill in before handover to client.

```
Developer Name:   ___________________
Developer Phone:  ___________________
Developer Email:  ___________________

GitHub Repo:      https://github.com/masimkhan-dev/akfoods
Supabase Login:   https://supabase.com (use owner email)
Supabase Project: darumovnmlhwpclwlmdt
```

---

## 📊 VERSION HISTORY

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | 2026-02-20 | Initial UAT release — billing, menu, reports, expenses, settings, user management |

---

*Maintained by the AKF POS development team.*
