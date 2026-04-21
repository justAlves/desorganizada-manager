-- =====================================================================
-- Desorganizada Manager — schema
-- Loja de camisetas de futebol: produtos, pedidos, itens de pedido
-- =====================================================================

-- Extensão para gerar UUIDs
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
do $$ begin
  create type public.product_size as enum ('P', 'M', 'G', 'GG', 'XGG');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_status as enum (
    'pending',
    'confirmed',
    'shipped',
    'delivered',
    'cancelled'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------
create table if not exists public.products (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  team       text not null,
  size       public.product_size not null,
  quantity   integer not null default 0 check (quantity >= 0),
  price      numeric(10, 2) not null check (price >= 0),
  image_url  text,
  created_at timestamptz not null default now()
);

-- Adiciona coluna em bases já criadas (idempotente).
alter table public.products add column if not exists image_url text;

create index if not exists products_team_idx on public.products (team);
create index if not exists products_name_idx on public.products using gin (to_tsvector('portuguese', name));

create table if not exists public.orders (
  id               uuid primary key default gen_random_uuid(),
  customer_name    text not null,
  customer_phone   text not null,
  customer_address text not null,
  status           public.order_status not null default 'pending',
  total_price      numeric(10, 2) not null default 0 check (total_price >= 0),
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists orders_phone_idx on public.orders (customer_phone);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_created_idx on public.orders (created_at desc);

create table if not exists public.order_items (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  quantity   integer not null check (quantity > 0),
  unit_price numeric(10, 2) not null check (unit_price >= 0)
);

create index if not exists order_items_order_idx on public.order_items (order_id);
create index if not exists order_items_product_idx on public.order_items (product_id);

-- ---------------------------------------------------------------------
-- Trigger: atualizar updated_at em orders
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- RPC: criar pedido decrementando o estoque atomicamente
--
-- Recebe um payload com dados do cliente e um array de itens
-- [{ product_id uuid, quantity int }]. Bloqueia cada produto com
-- FOR UPDATE, valida estoque, calcula total e decrementa.
-- Retorna (order_id, total_price, status).
--
-- Executa como SECURITY DEFINER para permitir chamada anônima via
-- a rota pública protegida por x-api-key (backend usa service role,
-- mas assim a lógica fica auditável em um único lugar).
-- ---------------------------------------------------------------------
create or replace function public.create_order_with_items(
  p_customer_name    text,
  p_customer_phone   text,
  p_customer_address text,
  p_notes            text,
  p_items            jsonb
)
returns table (order_id uuid, total_price numeric, status public.order_status)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id    uuid;
  v_total       numeric(10, 2) := 0;
  v_item        jsonb;
  v_product_id  uuid;
  v_quantity    integer;
  v_product     public.products%rowtype;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'items must not be empty' using errcode = '22023';
  end if;

  insert into public.orders (
    customer_name, customer_phone, customer_address, notes, total_price, status
  ) values (
    p_customer_name, p_customer_phone, p_customer_address, p_notes, 0, 'pending'
  ) returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_quantity   := (v_item ->> 'quantity')::integer;

    if v_quantity is null or v_quantity <= 0 then
      raise exception 'invalid quantity for product %', v_product_id using errcode = '22023';
    end if;

    select * into v_product
      from public.products
      where id = v_product_id
      for update;

    if not found then
      raise exception 'product % not found', v_product_id using errcode = 'P0002';
    end if;

    if v_product.quantity < v_quantity then
      raise exception 'insufficient stock for product % (have %, need %)',
        v_product_id, v_product.quantity, v_quantity using errcode = 'P0001';
    end if;

    update public.products
      set quantity = quantity - v_quantity
      where id = v_product_id;

    insert into public.order_items (order_id, product_id, quantity, unit_price)
      values (v_order_id, v_product_id, v_quantity, v_product.price);

    v_total := v_total + (v_product.price * v_quantity);
  end loop;

  update public.orders set total_price = v_total where id = v_order_id;

  return query
    select v_order_id, v_total, 'pending'::public.order_status;
end;
$$;

-- ---------------------------------------------------------------------
-- Row Level Security
--
-- Estratégia:
--   - Dashboard (browser) usa sessão autenticada -> role = authenticated
--   - Rotas /api/public (WhatsApp agent) usam SERVICE_ROLE no backend,
--     que bypassa RLS. A autorização dessas rotas é feita no Next.js
--     via header x-api-key.
--   - Anônimos não enxergam nada.
-- ---------------------------------------------------------------------
alter table public.products    enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "authenticated full access" on public.products;
create policy "authenticated full access" on public.products
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated full access" on public.orders;
create policy "authenticated full access" on public.orders
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated full access" on public.order_items;
create policy "authenticated full access" on public.order_items
  for all to authenticated using (true) with check (true);

-- Permite que a RPC seja chamada via service role. Revoga do público.
revoke all on function public.create_order_with_items(text, text, text, text, jsonb) from public;
grant execute on function public.create_order_with_items(text, text, text, text, jsonb) to service_role;
grant execute on function public.create_order_with_items(text, text, text, text, jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- Storage: bucket de imagens de produto
--
-- Bucket público (leitura por URL) com upload/update/delete restrito
-- a usuários autenticados. O service_role bypassa as policies.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
  values ('product-images', 'product-images', true)
  on conflict (id) do update set public = excluded.public;

drop policy if exists "product-images public read"   on storage.objects;
drop policy if exists "product-images auth upload"   on storage.objects;
drop policy if exists "product-images auth update"   on storage.objects;
drop policy if exists "product-images auth delete"   on storage.objects;

create policy "product-images public read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'product-images');

create policy "product-images auth upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images');

create policy "product-images auth update" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images')
  with check (bucket_id = 'product-images');

create policy "product-images auth delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images');
