-- Cleanup script for HOKY Teknik test data.
-- Run this in the Supabase SQL Editor when you want to reset operational data
-- before a fresh testing round.
--
-- This removes app data only. It keeps:
-- - auth.users / employee login accounts
-- - table schemas
-- - RLS policies
-- - RPC functions
-- - indexes and constraints

begin;

truncate table
  inventory_movements,
  shopee_return_cases,
  shopee_order_items,
  shopee_orders,
  products
restart identity cascade;

commit;
