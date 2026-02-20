-- =============================================================
-- AKF POS SYSTEM — Dummy Data Cleanup Script
-- Purpose : Delete all test/dummy transactional data
-- Safe    : Does NOT touch users, menu, categories, or settings
-- Run in  : Supabase Dashboard → SQL Editor
-- Date    : 2026-02-20
-- =============================================================

BEGIN;

-- Step 1: Delete bill line items FIRST (foreign key child of bills)
DELETE FROM public.bill_items;

-- Step 2: Delete all bills
DELETE FROM public.bills;

-- Step 3: Reset the daily bill counter (so next bill starts at AKF-YYYYMMDD-001)
DELETE FROM public.bill_counters;

-- Step 4: Delete all test expenses
DELETE FROM public.expenses;

-- =============================================================
-- The following tables are INTENTIONALLY NOT TOUCHED:
--   ✅ auth.users          → real user accounts preserved
--   ✅ public.user_profiles → preserved
--   ✅ public.user_roles    → preserved
--   ✅ public.menu_items    → your menu setup preserved
--   ✅ public.categories    → preserved
--   ✅ public.deals         → preserved
--   ✅ public.settings      → restaurant config preserved
-- =============================================================

COMMIT;

-- Verify everything is clean
SELECT 'bills'       AS table_name, COUNT(*) AS remaining_rows FROM public.bills
UNION ALL
SELECT 'bill_items'  AS table_name, COUNT(*) AS remaining_rows FROM public.bill_items
UNION ALL
SELECT 'bill_counters' AS table_name, COUNT(*) AS remaining_rows FROM public.bill_counters
UNION ALL
SELECT 'expenses'    AS table_name, COUNT(*) AS remaining_rows FROM public.expenses;
