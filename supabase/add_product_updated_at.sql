-- Adds product update timestamps for restocking traceability.
-- Run this in Supabase SQL Editor before deploying the product-card
-- LAST UPDATE display.

alter table products
add column if not exists updated_at timestamptz not null default now();

update products
set updated_at = coalesce(updated_at, created_at, now());
