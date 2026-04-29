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

-- ── 매장방송 테이블 ──────────────────────────────────────────

-- 방송 목록
create table if not exists broadcasts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  text text not null,
  category text not null default '영업안내',
  is_active boolean default true,
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- 방송 이력
create table if not exists broadcast_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  text text not null,
  triggered_by text not null default 'manual',
  played_at timestamptz default now()
);

-- 방송 설정
create table if not exists broadcast_settings (
  user_id uuid references auth.users(id) on delete cascade primary key,
  interval_minutes integer default 10,
  play_mode text default 'sequential',
  tts_rate float default 0.9,
  tts_volume float default 1.0,
  tts_pitch float default 1.0,
  updated_at timestamptz default now()
);

-- RLS 활성화
alter table broadcasts enable row level security;
alter table broadcast_logs enable row level security;
alter table broadcast_settings enable row level security;

-- 정책: 본인 데이터만 접근
create policy "broadcasts: own data" on broadcasts for all using (auth.uid() = user_id);
create policy "broadcast_logs: own data" on broadcast_logs for all using (auth.uid() = user_id);
create policy "broadcast_settings: own data" on broadcast_settings for all using (auth.uid() = user_id);
