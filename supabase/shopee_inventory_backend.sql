-- Run this in Supabase SQL Editor after products, shopee_orders, and shopee_order_items exist.
-- This moves Shopee stock changes into database-side transactions.

alter table products
add column if not exists updated_at timestamptz not null default now();

update products
set updated_at = coalesce(updated_at, created_at, now());

create table if not exists inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id),
  movement_type text not null check (movement_type in (
    'SHOPEE_SHIPPED',
    'SHOPEE_RETURNED',
    'SHOPEE_REACTIVATED',
    'SHOPEE_DELETED_RESTOCK',
    'SHOPEE_EDIT_RESTOCK',
    'SHOPEE_EDIT_SHIPPED',
    'SHOPEE_RETURN_GOOD_RESTOCK',
    'SHOPEE_RETURN_GOOD_REVERSED',
    'STORE_SHIPPED',
    'STORE_DELETED_RESTOCK',
    'MANUAL_ADJUSTMENT'
  )),
  direction text not null check (direction in ('IN', 'OUT')),
  quantity integer not null check (quantity > 0),
  reference_type text not null check (reference_type in ('shopee_order', 'store_shipment', 'manual')),
  reference_id uuid,
  note text,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists idx_inventory_movements_product_id
on inventory_movements(product_id);

create index if not exists idx_inventory_movements_reference
on inventory_movements(reference_type, reference_id);

do $$
declare
  v_constraint_name text;
begin
  select conname
  into v_constraint_name
  from pg_constraint
  where conrelid = 'inventory_movements'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%movement_type%'
    and pg_get_constraintdef(oid) like '%SHOPEE_SHIPPED%'
  limit 1;

  if v_constraint_name is not null then
    execute format('alter table inventory_movements drop constraint %I', v_constraint_name);
  end if;

  alter table inventory_movements
  add constraint inventory_movements_movement_type_check
  check (movement_type in (
    'SHOPEE_SHIPPED',
    'SHOPEE_RETURNED',
    'SHOPEE_REACTIVATED',
    'SHOPEE_DELETED_RESTOCK',
    'SHOPEE_EDIT_RESTOCK',
    'SHOPEE_EDIT_SHIPPED',
    'SHOPEE_RETURN_GOOD_RESTOCK',
    'SHOPEE_RETURN_GOOD_REVERSED',
    'STORE_SHIPPED',
    'STORE_DELETED_RESTOCK',
    'MANUAL_ADJUSTMENT'
  ));
end $$;

alter table inventory_movements enable row level security;

alter table shopee_orders
add column if not exists final_receipt_amount integer
check (final_receipt_amount is null or final_receipt_amount >= 0);

alter table shopee_orders
drop column if exists receivable_amount;

alter table shopee_orders
add column if not exists receivable_amount integer
generated always as (
  case
    when status = 'Delivered' then coalesce(final_receipt_amount, estimated_receipt_amount)
    else 0
  end
) stored;

alter table shopee_orders
add column if not exists delivery_method text not null default 'Shopee Xpress'
check (delivery_method in ('Shopee Xpress', 'J&T Express', 'JNE', 'SiCepat', 'Anteraja', 'Lainnya'));

alter table shopee_orders
add column if not exists delivery_id text not null default '';

alter table shopee_orders
add column if not exists note text;

create table if not exists shopee_return_cases (
  id uuid primary key default gen_random_uuid(),
  shopee_order_id uuid not null unique references shopee_orders(id) on delete cascade,
  return_status text not null default 'Barang Rusak - Menunggu Shopee' check (return_status in (
    'Barang Bagus',
    'Barang Rusak - Menunggu Shopee',
    'Barang Rusak - Dikompensasi',
    'Barang Rusak - Ditolak'
  )),
  compensation_amount integer not null default 0 check (compensation_amount >= 0),
  note text,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_shopee_return_cases_order_id
on shopee_return_cases(shopee_order_id);

update shopee_return_cases
set return_status = 'Barang Rusak - Menunggu Shopee',
    updated_at = now()
where return_status = 'Menunggu Cek';

alter table shopee_return_cases
alter column return_status set default 'Barang Rusak - Menunggu Shopee';

alter table shopee_return_cases
drop constraint if exists shopee_return_cases_return_status_check;

alter table shopee_return_cases
add constraint shopee_return_cases_return_status_check
check (return_status in (
  'Barang Bagus',
  'Barang Rusak - Menunggu Shopee',
  'Barang Rusak - Dikompensasi',
  'Barang Rusak - Ditolak'
));

alter table shopee_return_cases enable row level security;

drop policy if exists "Authenticated users can read inventory movements" on inventory_movements;
create policy "Authenticated users can read inventory movements"
on inventory_movements
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can insert inventory movements" on inventory_movements;
create policy "Authenticated users can insert inventory movements"
on inventory_movements
for insert
to authenticated
with check (true);

drop policy if exists "Authenticated users can read Shopee return cases" on shopee_return_cases;
create policy "Authenticated users can read Shopee return cases"
on shopee_return_cases
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can insert Shopee return cases" on shopee_return_cases;
create policy "Authenticated users can insert Shopee return cases"
on shopee_return_cases
for insert
to authenticated
with check (true);

drop policy if exists "Authenticated users can update Shopee return cases" on shopee_return_cases;
create policy "Authenticated users can update Shopee return cases"
on shopee_return_cases
for update
to authenticated
using (true)
with check (true);

insert into shopee_return_cases (
  shopee_order_id,
  created_by
)
select
  id,
  created_by
from shopee_orders
where status = 'Returned'
on conflict (shopee_order_id) do nothing;

drop function if exists create_shopee_order(text, date, text, text, integer, jsonb);
drop function if exists create_shopee_order(text, date, text, text, text, integer, jsonb);
drop function if exists create_shopee_order(text, text, date, text, text, text, integer, jsonb);
drop function if exists create_shopee_order(text, text, date, text, text, text, integer, jsonb, integer);
drop function if exists create_shopee_order(text, text, date, text, text, text, integer, jsonb, integer, text);

create or replace function create_shopee_order(
  p_order_id text,
  p_delivery_id text,
  p_order_date date,
  p_status text,
  p_payment_method text,
  p_delivery_method text,
  p_estimated_receipt_amount integer,
  p_items jsonb,
  p_final_receipt_amount integer default null,
  p_note text default null
)
returns uuid
language plpgsql
as $$
declare
  v_order_uuid uuid;
  v_item record;
  v_available_stock integer;
  v_is_active boolean;
begin
  if p_status not in ('Shipped', 'Delivered', 'Returned', 'Postponed', 'Cancelled') then
    raise exception 'Invalid Shopee order status: %', p_status;
  end if;

  if p_payment_method not in ('Online Payment', 'COD', 'Shopee Pay Later', 'Instant') then
    raise exception 'Invalid Shopee payment method: %', p_payment_method;
  end if;

  if p_delivery_method not in ('Shopee Xpress', 'J&T Express', 'JNE', 'SiCepat', 'Anteraja', 'Lainnya') then
    raise exception 'Invalid Shopee delivery method: %', p_delivery_method;
  end if;

  if p_estimated_receipt_amount < 0 then
    raise exception 'Estimated receipt amount cannot be negative';
  end if;

  if p_final_receipt_amount is not null and p_final_receipt_amount < 0 then
    raise exception 'Final receipt amount cannot be negative';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Shopee order must contain at least one item';
  end if;

  insert into shopee_orders (
    order_id,
    delivery_id,
    order_date,
    status,
    payment_method,
    delivery_method,
    estimated_receipt_amount,
    final_receipt_amount,
    note,
    created_by
  )
  values (
    trim(p_order_id),
    trim(coalesce(p_delivery_id, '')),
    p_order_date,
    p_status,
    p_payment_method,
    p_delivery_method,
    p_estimated_receipt_amount,
    case when p_status = 'Delivered' then p_final_receipt_amount else null end,
    nullif(trim(coalesce(p_note, '')), ''),
    auth.uid()
  )
  returning id into v_order_uuid;

  v_is_active := p_status in ('Shipped', 'Delivered', 'Returned');

  for v_item in
    select
      product_id::uuid as product_id,
      sum(quantity)::integer as quantity
    from jsonb_to_recordset(p_items) as item(product_id text, quantity integer)
    group by product_id
  loop
    if v_item.quantity <= 0 then
      raise exception 'Shopee item quantity must be greater than zero';
    end if;

    insert into shopee_order_items (
      shopee_order_id,
      product_id,
      quantity
    )
    values (
      v_order_uuid,
      v_item.product_id,
      v_item.quantity
    );

    if v_is_active then
      select current_stock
      into v_available_stock
      from products
      where id = v_item.product_id
      for update;

      if v_available_stock is null then
        raise exception 'Product not found: %', v_item.product_id;
      end if;

      if v_available_stock < v_item.quantity then
        raise exception 'Insufficient stock for product %. Available %, requested %',
          v_item.product_id, v_available_stock, v_item.quantity;
      end if;

      update products
      set current_stock = current_stock - v_item.quantity,
          updated_at = now()
      where id = v_item.product_id;

      insert into inventory_movements (
        product_id,
        movement_type,
        direction,
        quantity,
        reference_type,
        reference_id,
        note,
        created_by
      )
      values (
        v_item.product_id,
        'SHOPEE_SHIPPED',
        'OUT',
        v_item.quantity,
        'shopee_order',
        v_order_uuid,
        'Stock deducted from Shopee order creation',
        auth.uid()
      );
    end if;
  end loop;

  if p_status = 'Returned' then
    insert into shopee_return_cases (
      shopee_order_id,
      created_by
    )
    values (
      v_order_uuid,
      auth.uid()
    )
    on conflict (shopee_order_id) do nothing;
  end if;

  return v_order_uuid;
end;
$$;

drop function if exists update_shopee_order_status(uuid, text);
drop function if exists update_shopee_order_status(uuid, text, integer);

create or replace function update_shopee_order_status(
  p_shopee_order_id uuid,
  p_status text,
  p_final_receipt_amount integer default null
)
returns void
language plpgsql
as $$
declare
  v_old_status text;
  v_item record;
  v_available_stock integer;
  v_was_inventory_out boolean;
  v_is_inventory_out boolean;
begin
  if p_status not in ('Shipped', 'Delivered', 'Returned', 'Postponed', 'Cancelled') then
    raise exception 'Invalid Shopee order status: %', p_status;
  end if;

  if p_final_receipt_amount is not null and p_final_receipt_amount < 0 then
    raise exception 'Final receipt amount cannot be negative';
  end if;

  select status
  into v_old_status
  from shopee_orders
  where id = p_shopee_order_id
  for update;

  if v_old_status is null then
    raise exception 'Shopee order not found: %', p_shopee_order_id;
  end if;

  if v_old_status = p_status then
    update shopee_orders
    set final_receipt_amount = case
          when p_status = 'Delivered' then coalesce(p_final_receipt_amount, final_receipt_amount, estimated_receipt_amount)
          else null
        end,
        updated_at = now()
    where id = p_shopee_order_id;
    return;
  end if;

  v_was_inventory_out := v_old_status in ('Shipped', 'Delivered', 'Returned');
  v_is_inventory_out := p_status in ('Shipped', 'Delivered', 'Returned');

  if v_was_inventory_out and not v_is_inventory_out then
    for v_item in
      select product_id, quantity
      from shopee_order_items
      where shopee_order_id = p_shopee_order_id
    loop
      update products
      set current_stock = current_stock + v_item.quantity,
          updated_at = now()
      where id = v_item.product_id;

      insert into inventory_movements (
        product_id,
        movement_type,
        direction,
        quantity,
        reference_type,
        reference_id,
        note,
        created_by
      )
      values (
        v_item.product_id,
        'SHOPEE_RETURNED',
        'IN',
        v_item.quantity,
        'shopee_order',
        p_shopee_order_id,
        'Stock restored because Shopee order was returned',
        auth.uid()
      );
    end loop;
  elsif not v_was_inventory_out and v_is_inventory_out then
    for v_item in
      select product_id, quantity
      from shopee_order_items
      where shopee_order_id = p_shopee_order_id
    loop
      select current_stock
      into v_available_stock
      from products
      where id = v_item.product_id
      for update;

      if v_available_stock < v_item.quantity then
        raise exception 'Insufficient stock for product %. Available %, requested %',
          v_item.product_id, v_available_stock, v_item.quantity;
      end if;

      update products
      set current_stock = current_stock - v_item.quantity,
          updated_at = now()
      where id = v_item.product_id;

      insert into inventory_movements (
        product_id,
        movement_type,
        direction,
        quantity,
        reference_type,
        reference_id,
        note,
        created_by
      )
      values (
        v_item.product_id,
        'SHOPEE_REACTIVATED',
        'OUT',
        v_item.quantity,
        'shopee_order',
        p_shopee_order_id,
        'Stock deducted because returned Shopee order became active again',
        auth.uid()
      );
    end loop;
  end if;

  update shopee_orders
  set status = p_status,
      final_receipt_amount = case
        when p_status = 'Delivered' then coalesce(p_final_receipt_amount, estimated_receipt_amount)
        else null
      end,
      updated_at = now()
  where id = p_shopee_order_id;

  if p_status = 'Returned' then
    insert into shopee_return_cases (
      shopee_order_id,
      created_by
    )
    values (
      p_shopee_order_id,
      auth.uid()
    )
    on conflict (shopee_order_id) do nothing;
  end if;
end;
$$;

drop function if exists update_shopee_order(uuid, text, text, date, text, text, text, integer, jsonb);
drop function if exists update_shopee_order(uuid, text, text, date, text, text, text, integer, jsonb, integer);
drop function if exists update_shopee_order(uuid, text, text, date, text, text, text, integer, jsonb, integer, text);

create or replace function update_shopee_order(
  p_shopee_order_id uuid,
  p_order_id text,
  p_delivery_id text,
  p_order_date date,
  p_status text,
  p_payment_method text,
  p_delivery_method text,
  p_estimated_receipt_amount integer,
  p_items jsonb,
  p_final_receipt_amount integer default null,
  p_note text default null
)
returns void
language plpgsql
as $$
declare
  v_old_status text;
  v_item record;
  v_available_stock integer;
  v_old_is_active boolean;
  v_new_is_active boolean;
  v_stock_delta integer;
begin
  if p_status not in ('Shipped', 'Delivered', 'Returned', 'Postponed', 'Cancelled') then
    raise exception 'Invalid Shopee order status: %', p_status;
  end if;

  if p_payment_method not in ('Online Payment', 'COD', 'Shopee Pay Later', 'Instant') then
    raise exception 'Invalid Shopee payment method: %', p_payment_method;
  end if;

  if p_delivery_method not in ('Shopee Xpress', 'J&T Express', 'JNE', 'SiCepat', 'Anteraja', 'Lainnya') then
    raise exception 'Invalid Shopee delivery method: %', p_delivery_method;
  end if;

  if p_estimated_receipt_amount < 0 then
    raise exception 'Estimated receipt amount cannot be negative';
  end if;

  if p_final_receipt_amount is not null and p_final_receipt_amount < 0 then
    raise exception 'Final receipt amount cannot be negative';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Shopee order must contain at least one item';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_items) as item(product_id text, quantity integer)
    where item.product_id is null
       or trim(item.product_id) = ''
       or item.quantity is null
       or item.quantity <= 0
  ) then
    raise exception 'Shopee item product and quantity must be valid';
  end if;

  select status
  into v_old_status
  from shopee_orders
  where id = p_shopee_order_id
  for update;

  if v_old_status is null then
    raise exception 'Shopee order not found: %', p_shopee_order_id;
  end if;

  v_old_is_active := v_old_status in ('Shipped', 'Delivered', 'Returned');
  v_new_is_active := p_status in ('Shipped', 'Delivered', 'Returned');

  for v_item in
    with old_items as (
      select product_id, sum(quantity)::integer as quantity
      from shopee_order_items
      where shopee_order_id = p_shopee_order_id
      group by product_id
    ),
    new_items as (
      select product_id::uuid as product_id, sum(quantity)::integer as quantity
      from jsonb_to_recordset(p_items) as item(product_id text, quantity integer)
      group by product_id
    )
    select
      coalesce(old_items.product_id, new_items.product_id) as product_id,
      case when v_old_is_active then coalesce(old_items.quantity, 0) else 0 end as old_active_quantity,
      case when v_new_is_active then coalesce(new_items.quantity, 0) else 0 end as new_active_quantity,
      coalesce(new_items.quantity, 0) as new_order_quantity
    from old_items
    full outer join new_items on old_items.product_id = new_items.product_id
  loop
    v_stock_delta := v_item.new_active_quantity - v_item.old_active_quantity;

    if v_stock_delta > 0 then
      select current_stock
      into v_available_stock
      from products
      where id = v_item.product_id
      for update;

      if v_available_stock is null then
        raise exception 'Product not found: %', v_item.product_id;
      end if;

      if v_available_stock < v_stock_delta then
        raise exception 'Insufficient stock for product %. Available %, requested %',
          v_item.product_id, v_available_stock, v_stock_delta;
      end if;

      update products
      set current_stock = current_stock - v_stock_delta,
          updated_at = now()
      where id = v_item.product_id;

      insert into inventory_movements (
        product_id,
        movement_type,
        direction,
        quantity,
        reference_type,
        reference_id,
        note,
        created_by
      )
      values (
        v_item.product_id,
        'SHOPEE_EDIT_SHIPPED',
        'OUT',
        v_stock_delta,
        'shopee_order',
        p_shopee_order_id,
        'Stock deducted from Shopee order edit',
        auth.uid()
      );
    elsif v_stock_delta < 0 then
      update products
      set current_stock = current_stock + abs(v_stock_delta),
          updated_at = now()
      where id = v_item.product_id;

      insert into inventory_movements (
        product_id,
        movement_type,
        direction,
        quantity,
        reference_type,
        reference_id,
        note,
        created_by
      )
      values (
        v_item.product_id,
        'SHOPEE_EDIT_RESTOCK',
        'IN',
        abs(v_stock_delta),
        'shopee_order',
        p_shopee_order_id,
        'Stock restored from Shopee order edit',
        auth.uid()
      );
    end if;
  end loop;

  delete from shopee_order_items
  where shopee_order_id = p_shopee_order_id;

  for v_item in
    select
      product_id::uuid as product_id,
      sum(quantity)::integer as quantity
    from jsonb_to_recordset(p_items) as item(product_id text, quantity integer)
    group by product_id
  loop
    insert into shopee_order_items (
      shopee_order_id,
      product_id,
      quantity
    )
    values (
      p_shopee_order_id,
      v_item.product_id,
      v_item.quantity
    );
  end loop;

  update shopee_orders
  set order_id = trim(p_order_id),
      delivery_id = trim(coalesce(p_delivery_id, '')),
      order_date = p_order_date,
      status = p_status,
      payment_method = p_payment_method,
      delivery_method = p_delivery_method,
      estimated_receipt_amount = p_estimated_receipt_amount,
      final_receipt_amount = case when p_status = 'Delivered' then p_final_receipt_amount else null end,
      note = nullif(trim(coalesce(p_note, '')), ''),
      updated_at = now()
  where id = p_shopee_order_id;

  if p_status = 'Returned' then
    insert into shopee_return_cases (
      shopee_order_id,
      created_by
    )
    values (
      p_shopee_order_id,
      auth.uid()
    )
    on conflict (shopee_order_id) do nothing;
  end if;
end;
$$;

create or replace function update_shopee_return_case(
  p_return_case_id uuid,
  p_return_status text,
  p_compensation_amount integer,
  p_note text
)
returns void
language plpgsql
as $$
declare
  v_old_status text;
  v_shopee_order_id uuid;
  v_item record;
  v_available_stock integer;
  v_old_is_restocked boolean;
  v_new_is_restocked boolean;
  v_final_compensation_amount integer;
begin
  if p_return_status not in (
    'Barang Bagus',
    'Barang Rusak - Menunggu Shopee',
    'Barang Rusak - Dikompensasi',
    'Barang Rusak - Ditolak'
  ) then
    raise exception 'Invalid Shopee return status: %', p_return_status;
  end if;

  if p_compensation_amount < 0 then
    raise exception 'Compensation amount cannot be negative';
  end if;

  select return_status, shopee_order_id
  into v_old_status, v_shopee_order_id
  from shopee_return_cases
  where id = p_return_case_id
  for update;

  if v_shopee_order_id is null then
    raise exception 'Shopee return case not found: %', p_return_case_id;
  end if;

  if not exists (
    select 1
    from shopee_orders
    where id = v_shopee_order_id
      and status = 'Returned'
  ) then
    raise exception 'Shopee order is not marked as returned: %', v_shopee_order_id;
  end if;

  v_old_is_restocked := v_old_status = 'Barang Bagus';
  v_new_is_restocked := p_return_status = 'Barang Bagus';
  v_final_compensation_amount := case
    when p_return_status = 'Barang Rusak - Dikompensasi' then p_compensation_amount
    else 0
  end;

  if not v_old_is_restocked and v_new_is_restocked then
    for v_item in
      select product_id, quantity
      from shopee_order_items
      where shopee_order_id = v_shopee_order_id
    loop
      update products
      set current_stock = current_stock + v_item.quantity,
          updated_at = now()
      where id = v_item.product_id;

      insert into inventory_movements (
        product_id,
        movement_type,
        direction,
        quantity,
        reference_type,
        reference_id,
        note,
        created_by
      )
      values (
        v_item.product_id,
        'SHOPEE_RETURN_GOOD_RESTOCK',
        'IN',
        v_item.quantity,
        'shopee_order',
        v_shopee_order_id,
        'Stock restored because returned Shopee item is sellable',
        auth.uid()
      );
    end loop;
  elsif v_old_is_restocked and not v_new_is_restocked then
    for v_item in
      select product_id, quantity
      from shopee_order_items
      where shopee_order_id = v_shopee_order_id
    loop
      select current_stock
      into v_available_stock
      from products
      where id = v_item.product_id
      for update;

      if v_available_stock < v_item.quantity then
        raise exception 'Insufficient stock to reverse returned product %. Available %, requested %',
          v_item.product_id, v_available_stock, v_item.quantity;
      end if;

      update products
      set current_stock = current_stock - v_item.quantity,
          updated_at = now()
      where id = v_item.product_id;

      insert into inventory_movements (
        product_id,
        movement_type,
        direction,
        quantity,
        reference_type,
        reference_id,
        note,
        created_by
      )
      values (
        v_item.product_id,
        'SHOPEE_RETURN_GOOD_REVERSED',
        'OUT',
        v_item.quantity,
        'shopee_order',
        v_shopee_order_id,
        'Stock deducted because returned Shopee item is no longer sellable',
        auth.uid()
      );
    end loop;
  end if;

  update shopee_return_cases
  set return_status = p_return_status,
      compensation_amount = v_final_compensation_amount,
      note = nullif(trim(coalesce(p_note, '')), ''),
      updated_at = now()
  where id = p_return_case_id;
end;
$$;

create or replace function delete_shopee_order(
  p_shopee_order_id uuid
)
returns void
language plpgsql
as $$
declare
  v_old_status text;
  v_item record;
  v_return_was_restocked boolean;
begin
  select status
  into v_old_status
  from shopee_orders
  where id = p_shopee_order_id
  for update;

  if v_old_status is null then
    raise exception 'Shopee order not found: %', p_shopee_order_id;
  end if;

  select exists (
    select 1
    from shopee_return_cases
    where shopee_order_id = p_shopee_order_id
      and return_status = 'Barang Bagus'
  )
  into v_return_was_restocked;

  if v_old_status in ('Shipped', 'Delivered', 'Returned') and not v_return_was_restocked then
    for v_item in
      select product_id, quantity
      from shopee_order_items
      where shopee_order_id = p_shopee_order_id
    loop
      update products
      set current_stock = current_stock + v_item.quantity,
          updated_at = now()
      where id = v_item.product_id;

      insert into inventory_movements (
        product_id,
        movement_type,
        direction,
        quantity,
        reference_type,
        reference_id,
        note,
        created_by
      )
      values (
        v_item.product_id,
        'SHOPEE_DELETED_RESTOCK',
        'IN',
        v_item.quantity,
        'shopee_order',
        p_shopee_order_id,
        'Stock restored because active Shopee order was deleted',
        auth.uid()
      );
    end loop;
  end if;

  delete from shopee_orders
  where id = p_shopee_order_id;
end;
$$;
