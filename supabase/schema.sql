-- stores table
create table if not exists stores (
  id uuid primary key default gen_random_uuid(),
  store_name text not null unique,
  region text,
  target_sales bigint default 0,
  created_at timestamptz default now()
);

-- sales_daily table
create table if not exists sales_daily (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references stores(id) on delete cascade,
  store_name text not null,
  purchase_group text,
  season_year text,
  season text,
  season_month text,
  brand text,
  mch2_code text,
  mch2 text,
  mc_code text,
  mc text,
  style_code text,
  current_price numeric,
  product_code text,
  date date not null,
  total_sales numeric default 0,
  actual_sales numeric default 0,
  total_cogs numeric default 0,
  gross_profit numeric default 0,
  gross_margin numeric default 0,
  quantity integer default 0,
  sales_at_original_price numeric default 0,
  estimated_cogs numeric default 0,
  valuation_adj numeric default 0,
  upload_id uuid,
  created_at timestamptz default now()
);

-- reports table
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  store_name text not null,
  date date not null,
  summary_json jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- email_logs table
create table if not exists email_logs (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references reports(id),
  recipients text[],
  sent_at timestamptz default now(),
  status text default 'sent'
);

-- RLS
alter table stores enable row level security;
alter table sales_daily enable row level security;
alter table reports enable row level security;
alter table email_logs enable row level security;

create policy "authenticated read stores" on stores for select using (auth.role() = 'authenticated');
create policy "authenticated read sales" on sales_daily for select using (auth.role() = 'authenticated');
create policy "authenticated insert sales" on sales_daily for insert with check (auth.role() = 'authenticated');
create policy "authenticated read reports" on reports for select using (auth.role() = 'authenticated');
create policy "authenticated insert reports" on reports for insert with check (auth.role() = 'authenticated');
create policy "authenticated read email_logs" on email_logs for select using (auth.role() = 'authenticated');
create policy "authenticated insert email_logs" on email_logs for insert with check (auth.role() = 'authenticated');

-- default store
insert into stores (store_name, region) values ('강서점', '서울') on conflict do nothing;
