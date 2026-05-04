-- Migration: Khata (Loan) System Foundation
-- Date: 2026-05-03

BEGIN;

-- 1. Create Customers Table
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT UNIQUE,
    address TEXT,
    current_balance DECIMAL(12,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add Customer Link to Bills
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;

-- 3. Create Customer Ledger
CREATE TABLE IF NOT EXISTS public.customer_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    bill_id UUID REFERENCES public.bills(id) ON DELETE SET NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('credit', 'payment')),
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create Index for Performance
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customer_ledger_customer_id ON public.customer_ledger(customer_id);

-- 5. Trigger Function for Automatic Balance Maintenance
CREATE OR REPLACE FUNCTION public.sync_customer_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.customers
        SET current_balance = current_balance + (CASE WHEN NEW.transaction_type = 'credit' THEN NEW.amount ELSE -NEW.amount END),
            updated_at = now()
        WHERE id = NEW.customer_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.customers
        SET current_balance = current_balance - (CASE WHEN OLD.transaction_type = 'credit' THEN OLD.amount ELSE -OLD.amount END),
            updated_at = now()
        WHERE id = OLD.customer_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Attach Trigger
DROP TRIGGER IF EXISTS tr_sync_customer_balance ON public.customer_ledger;
CREATE TRIGGER tr_sync_customer_balance
AFTER INSERT OR DELETE ON public.customer_ledger
FOR EACH ROW EXECUTE FUNCTION public.sync_customer_balance();

-- 7. RLS Policies
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can view customers" ON public.customers;
CREATE POLICY "Anyone authenticated can view customers" ON public.customers
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can manage customers" ON public.customers;
CREATE POLICY "Admins can manage customers" ON public.customers
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Anyone authenticated can view ledger" ON public.customer_ledger;
CREATE POLICY "Anyone authenticated can view ledger" ON public.customer_ledger
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can manage ledger" ON public.customer_ledger;
CREATE POLICY "Admins can manage ledger" ON public.customer_ledger
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 8. Atomic Order Creation V4 (Supports Khata)
CREATE OR REPLACE FUNCTION public.create_order_atomic_v4(
  p_idempotency_key UUID,
  p_customer_id UUID,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_order_type TEXT,
  p_discount NUMERIC,
  p_tax_rate NUMERIC,
  p_payment_method TEXT,
  p_amount_paid NUMERIC,
  p_delivery_charge NUMERIC,
  p_created_by UUID,
  p_items JSONB
) RETURNS JSONB 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_bill_number TEXT;
  v_bill_id UUID;
  v_subtotal NUMERIC := 0;
  v_tax NUMERIC := 0;
  v_total NUMERIC := 0;
  v_change NUMERIC := 0;
  v_bill_number TEXT;
BEGIN
  -- Idempotency Check
  SELECT bill_number, id INTO v_existing_bill_number, v_bill_id 
  FROM public.bills 
  WHERE idempotency_key = p_idempotency_key
    AND created_at > NOW() - INTERVAL '30 days';

  IF v_existing_bill_number IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true, 
      'is_duplicate', true, 
      'bill_number', v_existing_bill_number, 
      'bill_id', v_bill_id
    );
  END IF;

  -- Calculations
  SELECT SUM((item->>'quantity')::NUMERIC * (item->>'unit_price')::NUMERIC)
  INTO v_subtotal FROM jsonb_array_elements(p_items) AS item;

  IF v_subtotal IS NULL OR v_subtotal <= 0 THEN RAISE EXCEPTION 'Financial Error: Invalid subtotal'; END IF;

  v_tax := ROUND((v_subtotal - COALESCE(p_discount, 0)) * COALESCE(p_tax_rate, 0), 2);
  v_total := (v_subtotal - COALESCE(p_discount, 0)) + v_tax + COALESCE(p_delivery_charge, 0);
  v_change := GREATEST(0, p_amount_paid - v_total);

  v_bill_number := public.generate_next_bill_number();

  -- Insert Bill
  INSERT INTO public.bills (
    idempotency_key, customer_id, bill_number, customer_name, customer_phone, order_type,
    subtotal, discount, tax, total, delivery_charge, payment_method, 
    amount_paid, change_returned, created_by, created_at
  ) VALUES (
    p_idempotency_key, p_customer_id, v_bill_number, p_customer_name, p_customer_phone, p_order_type,
    v_subtotal, p_discount, v_tax, v_total, p_delivery_charge, p_payment_method, 
    p_amount_paid, v_change, p_created_by, now()
  ) RETURNING id INTO v_bill_id;

  -- Insert Items
  INSERT INTO public.bill_items (bill_id, item_name, quantity, unit_price, total_price)
  SELECT v_bill_id, (item->>'item_name'), (item->>'quantity')::INTEGER, (item->>'unit_price')::NUMERIC,
         ROUND((item->>'quantity')::NUMERIC * (item->>'unit_price')::NUMERIC, 2)
  FROM jsonb_array_elements(p_items) AS item;

  -- Khata Integration
  IF p_payment_method = 'credit' AND p_customer_id IS NOT NULL THEN
    INSERT INTO public.customer_ledger (customer_id, bill_id, transaction_type, amount, description)
    VALUES (p_customer_id, v_bill_id, 'credit', v_total, 'Sale: Bill #' || v_bill_number);
  END IF;

  RETURN jsonb_build_object(
    'success', true, 
    'bill_id', v_bill_id, 
    'bill_number', v_bill_number,
    'total', v_total,
    'created_at', now()
  );
END;
$$;

-- 9. Function to record customer manual entries (Credit or Payment)
CREATE OR REPLACE FUNCTION public.record_customer_manual_entry(
  p_customer_id UUID,
  p_amount NUMERIC,
  p_transaction_type TEXT,
  p_description TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be greater than zero'; END IF;
  IF p_transaction_type NOT IN ('credit', 'payment') THEN RAISE EXCEPTION 'Invalid transaction type'; END IF;

  INSERT INTO public.customer_ledger (customer_id, transaction_type, amount, description)
  VALUES (p_customer_id, p_transaction_type, p_amount, COALESCE(p_description, CASE WHEN p_transaction_type = 'credit' THEN 'Manual Charge' ELSE 'Payment Received' END));

  RETURN jsonb_build_object('success', true);
END;
$$;

COMMIT;
