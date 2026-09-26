-- mesook / Supabase schema
-- Run this whole file in Supabase SQL Editor.
-- Designed so storefront + CMS + POS use the SAME data source.

create extension if not exists pgcrypto;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  name text not null,
  category text not null default 'other',
  description text not null default '',
  image_url text not null default '',
  image_scale numeric(4,2) not null default 1,
  image_position text not null default 'center',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.variants (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  product_id uuid not null references public.products(id) on delete cascade,
  label text not null,
  sku text unique,
  image_url text not null default '',
  image_scale numeric(4,2) not null default 1,
  image_position text not null default 'center',
  price numeric(12,2) not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.categories(slug,name,sort_order) values
  ('water','น้ำดื่ม',1),('rice','ข้าวสาร',2),('noodle','มาม่า',3),('other','อื่นๆ',4)
on conflict (slug) do nothing;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  room text not null default '',
  phone text not null default '',
  line_display_name text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_no text unique,
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text not null default '',
  room text not null default '',
  phone text not null default '',
  pickup_time text not null default '',
  delivery_type text not null default 'lobby',
  delivery_location text not null default '',
  note text not null default '',
  subtotal numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  status text not null default 'pending' check (status in ('pending','paid','ready','done','cancelled')),
  payment_status text not null default 'pending' check (payment_status in ('pending','paid','refunded','void')),
  payment_method text not null default '',
  channel text not null default 'Web',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  variant_id uuid references public.variants(id) on delete set null,
  product_name text not null,
  variant_label text not null default '',
  unit_price numeric(12,2) not null check (unit_price >= 0),
  qty integer not null check (qty > 0),
  line_total numeric(12,2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 0),
  method text not null default '',
  status text not null default 'paid',
  reference text not null default '',
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.variants(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  movement_type text not null check (movement_type in ('sale','restock','adjustment','cancel_restore')),
  qty_delta integer not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.cms_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Only users listed here can access the admin dashboard and mutate store data.
-- Create the Auth user first, then insert its UUID here from the Supabase dashboard.
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create sequence if not exists public.order_no_seq start 1;

create or replace function public.set_order_no()
returns trigger
language plpgsql
as $$
begin
  if new.order_no is null or new.order_no = '' then
    new.order_no := 'MS' || lpad(nextval('public.order_no_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_orders_order_no on public.orders;
create trigger trg_orders_order_no
before insert on public.orders
for each row execute function public.set_order_no();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists trg_products_updated on public.products;
create trigger trg_products_updated before update on public.products for each row execute function public.touch_updated_at();
drop trigger if exists trg_variants_updated on public.variants;
create trigger trg_variants_updated before update on public.variants for each row execute function public.touch_updated_at();
drop trigger if exists trg_customers_updated on public.customers;
create trigger trg_customers_updated before update on public.customers for each row execute function public.touch_updated_at();
drop trigger if exists trg_orders_updated on public.orders;
create trigger trg_orders_updated before update on public.orders for each row execute function public.touch_updated_at();

-- Atomic create order + deduct stock.
create or replace function public.create_store_order(p_order jsonb, p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_order_no text;
  v_customer_id uuid;
  item jsonb;
  v_stock integer;
begin
  v_customer_id := nullif(p_order->>'customer_id','')::uuid;
  if v_customer_id is null then
    insert into public.customers(name, room, phone)
    values(
      coalesce(p_order->>'customer_name',''),
      coalesce(p_order->>'room',''),
      coalesce(p_order->>'phone','')
    )
    returning id into v_customer_id;
  end if;

  insert into public.orders(
    customer_id, customer_name, room, phone, pickup_time,
    delivery_type, delivery_location, note, subtotal, total,
    status, payment_status, payment_method, channel
  )
  values(
    v_customer_id,
    coalesce(p_order->>'customer_name',''),
    coalesce(p_order->>'room',''),
    coalesce(p_order->>'phone',''),
    coalesce(p_order->>'pickup_time',''),
    coalesce(p_order->>'delivery_type','lobby'),
    coalesce(p_order->>'delivery_location',''),
    coalesce(p_order->>'note',''),
    coalesce((p_order->>'subtotal')::numeric,0),
    coalesce((p_order->>'total')::numeric,0),
    coalesce(p_order->>'status','pending'),
    coalesce(p_order->>'payment_status','pending'),
    coalesce(p_order->>'payment_method',''),
    coalesce(p_order->>'channel','Web')
  )
  returning id, order_no into v_order_id, v_order_no;

  for item in select * from jsonb_array_elements(p_items)
  loop
    select stock into v_stock from public.variants where id=(item->>'variant_id')::uuid for update;
    if v_stock is null then raise exception 'Variant not found: %', item->>'variant_id'; end if;
    if v_stock < (item->>'qty')::int then raise exception 'Insufficient stock for variant %', item->>'variant_id'; end if;

    insert into public.order_items(order_id, variant_id, product_name, variant_label, unit_price, qty, line_total)
    values(
      v_order_id,
      (item->>'variant_id')::uuid,
      item->>'product_name',
      coalesce(item->>'variant_label',''),
      (item->>'unit_price')::numeric,
      (item->>'qty')::int,
      (item->>'unit_price')::numeric * (item->>'qty')::int
    );

    update public.variants set stock = stock - (item->>'qty')::int where id=(item->>'variant_id')::uuid;
    insert into public.inventory_movements(variant_id,order_id,movement_type,qty_delta,note)
    values((item->>'variant_id')::uuid,v_order_id,'sale',-((item->>'qty')::int),'order '||v_order_no);
  end loop;

  return jsonb_build_object('order_id',v_order_id,'order_no',v_order_no);
end;
$$;

-- Restore stock when an order is cancelled (call manually from admin workflow if needed).
create or replace function public.restore_order_stock(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare item record;
begin
  for item in select variant_id, qty from public.order_items where order_id=p_order_id and variant_id is not null
  loop
    update public.variants set stock=stock+item.qty where id=item.variant_id;
    insert into public.inventory_movements(variant_id,order_id,movement_type,qty_delta,note)
    values(item.variant_id,p_order_id,'cancel_restore',item.qty,'restore cancelled order');
  end loop;
end;
$$;

insert into public.cms_settings(key,value)
values('storefront','{
  "hero_title":"ของกิน ของใช้ ส่งถึงง่ายๆ",
  "delivery_copy":"ส่งฟรีที่ล็อบบี้ IDEO MOBI EASTGATE / พื้นที่ใกล้เคียง",
  "help_title":"ไม่พบสินค้าที่หาอยู่?",
  "help_body":"สอบถามสินค้าอื่น เช็กสต๊อก หรือพื้นที่จัดส่งเพิ่มเติมได้เลย",
  "line_url":"https://line.me/R/ti/p/@435ktnsf"
}'::jsonb)
on conflict (key) do nothing;

-- RLS
alter table public.products enable row level security;
alter table public.categories enable row level security;
alter table public.variants enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.cms_settings enable row level security;
alter table public.admin_users enable row level security;

drop policy if exists "admins read own record" on public.admin_users;
create policy "admins read own record" on public.admin_users
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Public storefront can READ active catalog + CMS.
drop policy if exists "public read categories" on public.categories;
create policy "public read categories" on public.categories for select using (active = true);
drop policy if exists "public read products" on public.products;
create policy "public read products" on public.products for select using (active = true);
drop policy if exists "public read variants" on public.variants;
create policy "public read variants" on public.variants for select using (active = true);
drop policy if exists "public read cms" on public.cms_settings;
create policy "public read cms" on public.cms_settings for select using (true);

-- For production, use authenticated admin users for direct CRUD.
drop policy if exists "authenticated manage categories" on public.categories;
create policy "authenticated manage categories" on public.categories for all to authenticated
  using (exists (select 1 from public.admin_users where user_id=(select auth.uid()) and active))
  with check (exists (select 1 from public.admin_users where user_id=(select auth.uid()) and active));
drop policy if exists "authenticated manage products" on public.products;
create policy "authenticated manage products" on public.products for all to authenticated
  using (exists (select 1 from public.admin_users where user_id=(select auth.uid()) and active))
  with check (exists (select 1 from public.admin_users where user_id=(select auth.uid()) and active));
drop policy if exists "authenticated manage variants" on public.variants;
create policy "authenticated manage variants" on public.variants for all to authenticated
  using (exists (select 1 from public.admin_users where user_id=(select auth.uid()) and active))
  with check (exists (select 1 from public.admin_users where user_id=(select auth.uid()) and active));
drop policy if exists "authenticated manage customers" on public.customers;
create policy "authenticated manage customers" on public.customers for all to authenticated
  using (exists (select 1 from public.admin_users where user_id=(select auth.uid()) and active))
  with check (exists (select 1 from public.admin_users where user_id=(select auth.uid()) and active));
drop policy if exists "authenticated manage orders" on public.orders;
create policy "authenticated manage orders" on public.orders for all to authenticated
  using (exists (select 1 from public.admin_users where user_id=(select auth.uid()) and active))
  with check (exists (select 1 from public.admin_users where user_id=(select auth.uid()) and active));
drop policy if exists "authenticated manage order items" on public.order_items;
create policy "authenticated manage order items" on public.order_items for all to authenticated
  using (exists (select 1 from public.admin_users where user_id=(select auth.uid()) and active))
  with check (exists (select 1 from public.admin_users where user_id=(select auth.uid()) and active));
drop policy if exists "authenticated manage payments" on public.payments;
create policy "authenticated manage payments" on public.payments for all to authenticated
  using (exists (select 1 from public.admin_users where user_id=(select auth.uid()) and active))
  with check (exists (select 1 from public.admin_users where user_id=(select auth.uid()) and active));
drop policy if exists "authenticated manage inventory" on public.inventory_movements;
create policy "authenticated manage inventory" on public.inventory_movements for all to authenticated
  using (exists (select 1 from public.admin_users where user_id=(select auth.uid()) and active))
  with check (exists (select 1 from public.admin_users where user_id=(select auth.uid()) and active));
drop policy if exists "authenticated manage cms" on public.cms_settings;
create policy "authenticated manage cms" on public.cms_settings for all to authenticated
  using (exists (select 1 from public.admin_users where user_id=(select auth.uid()) and active))
  with check (exists (select 1 from public.admin_users where user_id=(select auth.uid()) and active));

grant execute on function public.create_store_order(jsonb,jsonb) to anon, authenticated;
grant execute on function public.restore_order_stock(uuid) to authenticated;

-- Product image uploads (public read, admin-only write).
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists "public read product images" on storage.objects;
create policy "public read product images" on storage.objects
  for select to public using (bucket_id = 'product-images');

drop policy if exists "admins upload product images" on storage.objects;
create policy "admins upload product images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and exists (select 1 from public.admin_users where user_id = (select auth.uid()) and active));

drop policy if exists "admins update product images" on storage.objects;
create policy "admins update product images" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and exists (select 1 from public.admin_users where user_id = (select auth.uid()) and active))
  with check (bucket_id = 'product-images' and exists (select 1 from public.admin_users where user_id = (select auth.uid()) and active));

drop policy if exists "admins delete product images" on storage.objects;
create policy "admins delete product images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and exists (select 1 from public.admin_users where user_id = (select auth.uid()) and active));
