-- Migration: Atomic Bill Number Generation Fix for UAT
-- Date: 2026-02-19

-- 1. Store daily counters for bills to handle concurrency
CREATE TABLE IF NOT EXISTS public.bill_counters (
  counter_date DATE PRIMARY KEY,
  last_value INTEGER NOT NULL DEFAULT 0
);

-- 2. Enable RLS and provide basic access
ALTER TABLE public.bill_counters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Any authenticated user can manage counters" ON public.bill_counters;
CREATE POLICY "Any authenticated user can manage counters" ON public.bill_counters 
  FOR ALL USING (auth.uid() IS NOT NULL);

-- 3. Atomic function to get next bill number (The key fix)
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
  -- Insert or increment the counter for today in a single atomic transaction
  INSERT INTO public.bill_counters (counter_date, last_value)
  VALUES (today_date, 1)
  ON CONFLICT (counter_date) DO UPDATE
  SET last_value = bill_counters.last_value + 1
  RETURNING last_value INTO next_val;
  
  -- Return formatted number: AKF-YYYYMMDD-001
  RETURN 'AKF-' || today_str || '-' || LPAD(next_val::text, 3, '0');
END;
$$;
