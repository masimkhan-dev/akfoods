-- Migration: Hardened Order Creation v3
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS idempotency_key UUID UNIQUE;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS delivery_charge DECIMAL(10,2) DEFAULT 0;

DROP INDEX IF EXISTS idx_bills_created_at_fixed;
CREATE INDEX idx_bills_created_at_fixed ON public.bills(created_at DESC);

CREATE OR REPLACE FUNCTION public.create_order_atomic_v3(
  p_idempotency_key UUID,
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
  SELECT bill_number, id INTO v_existing_bill_number, v_bill_id 
  FROM public.bills 
  WHERE idempotency_key = p_idempotency_key
    AND created_at > NOW() - INTERVAL '30 days';

  IF v_existing_bill_number IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true, 
      'is_duplicate', true, 
      'bill_number', v_existing_bill_number, 
      'bill_id', v_bill_id,
      'total', (SELECT total FROM public.bills WHERE id = v_bill_id),
      'change_returned', (SELECT change_returned FROM public.bills WHERE id = v_bill_id)
    );
  END IF;

  IF jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'Order must contain items'; END IF;

  SELECT SUM((item->>'quantity')::NUMERIC * (item->>'unit_price')::NUMERIC)
  INTO v_subtotal FROM jsonb_array_elements(p_items) AS item;

  IF v_subtotal IS NULL OR v_subtotal <= 0 THEN RAISE EXCEPTION 'Financial Error: Invalid subtotal'; END IF;

  v_tax := ROUND((v_subtotal - COALESCE(p_discount, 0)) * COALESCE(p_tax_rate, 0), 2);
  v_total := (v_subtotal - COALESCE(p_discount, 0)) + v_tax + COALESCE(p_delivery_charge, 0);
  v_change := GREATEST(0, p_amount_paid - v_total);

  v_bill_number := public.generate_next_bill_number();

  INSERT INTO public.bills (
    idempotency_key, bill_number, customer_name, customer_phone, order_type,
    subtotal, discount, tax, total, delivery_charge, payment_method, 
    amount_paid, change_returned, created_by, created_at
  ) VALUES (
    p_idempotency_key, v_bill_number, p_customer_name, p_customer_phone, p_order_type,
    v_subtotal, p_discount, v_tax, v_total, p_delivery_charge, p_payment_method, 
    p_amount_paid, v_change, p_created_by, now()
  ) RETURNING id INTO v_bill_id;

  INSERT INTO public.bill_items (bill_id, item_name, quantity, unit_price, total_price)
  SELECT v_bill_id, (item->>'item_name'), (item->>'quantity')::INTEGER, (item->>'unit_price')::NUMERIC,
         ROUND((item->>'quantity')::NUMERIC * (item->>'unit_price')::NUMERIC, 2)
  FROM jsonb_array_elements(p_items) AS item;

  RETURN jsonb_build_object(
    'success', true, 
    'bill_id', v_bill_id, 
    'bill_number', v_bill_number,
    'subtotal', v_subtotal,
    'tax', v_tax,
    'total', v_total, 
    'change_returned', v_change,
    'created_at', now()
  );
END;
$$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bills_backup_2026') THEN
        CREATE TABLE public.bills_backup_2026 AS SELECT * FROM public.bills;
    END IF;
END $$;

UPDATE public.bills b
SET total = sub.items_sum + b.tax - b.discount + COALESCE(b.delivery_charge, 0),
    subtotal = sub.items_sum
FROM (
  SELECT bill_id, SUM(total_price) AS items_sum
  FROM public.bill_items GROUP BY bill_id
) sub
WHERE b.id = sub.bill_id 
AND ABS(b.total - (sub.items_sum + b.tax - b.discount + COALESCE(b.delivery_charge, 0))) > 0.01;
