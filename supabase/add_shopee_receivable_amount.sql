-- Run this if you already executed shopee_inventory_backend.sql before receivable_amount existed.
-- This makes Supabase the source of truth for revenue/receivable calculation.

alter table shopee_orders
add column if not exists receivable_amount integer
generated always as (
  case
    when status = 'Delivered' then estimated_receipt_amount
    else 0
  end
) stored;
