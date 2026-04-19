-- =============================================================
-- Luxe Wax Spa — Admin / business-operating tables
-- Run AFTER leads.sql. Idempotent — safe to run more than once.
--
-- Auth model:
--   • Owner creates one user in Supabase Auth dashboard (Cida).
--   • All admin tables are RLS-protected to authenticated users only.
--   • The browser uses the ANON key — RLS enforces access.
--   • The `reviews` table additionally allows anonymous INSERT
--     so the public /review.html page can submit feedback.
-- =============================================================

create extension if not exists "pgcrypto";

-- ─── 1. CLIENTS ─────────────────────────────────────────────
create table if not exists public.clients (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 120),
  phone       text check (phone is null or char_length(phone) <= 40),
  email       text check (email is null or char_length(email) <= 160),
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists clients_name_idx       on public.clients (lower(name));
create index if not exists clients_email_idx      on public.clients (lower(email));
create index if not exists clients_created_idx    on public.clients (created_at desc);

-- ─── 2. APPOINTMENTS ────────────────────────────────────────
create table if not exists public.appointments (
  id                       uuid primary key default gen_random_uuid(),
  client_id                uuid references public.clients(id) on delete cascade,
  service                  text not null,
  appointment_date         timestamptz not null,
  price                    numeric(8,2) check (price is null or price >= 0),
  status                   text not null default 'booked'
                            check (status in ('booked','completed','cancelled','no_show')),
  notes                    text,
  reminder_sent_at         timestamptz,   -- 24h reminder
  thanks_sent_at           timestamptz,   -- post-visit thank you
  rebook_reminder_sent_at  timestamptz,   -- 14-day rebook nudge
  created_at               timestamptz not null default now()
);
create index if not exists appointments_date_idx        on public.appointments (appointment_date);
create index if not exists appointments_client_idx      on public.appointments (client_id, appointment_date desc);
create index if not exists appointments_status_idx      on public.appointments (status, appointment_date);

-- ─── 3. INVENTORY ───────────────────────────────────────────
create table if not exists public.inventory (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null check (char_length(name) between 1 and 120),
  unit                  text not null default 'unit',     -- e.g. 'g', 'roll', 'box'
  quantity              numeric not null default 0 check (quantity >= 0),
  usage_per_client      numeric not null default 0 check (usage_per_client >= 0),
  low_stock_threshold   numeric not null default 0 check (low_stock_threshold >= 0),
  notes                 text,
  updated_at            timestamptz not null default now()
);
create index if not exists inventory_name_idx on public.inventory (lower(name));

-- ─── 4. TRANSACTIONS ────────────────────────────────────────
create table if not exists public.transactions (
  id                uuid primary key default gen_random_uuid(),
  amount            numeric(10,2) not null check (amount >= 0),
  type              text not null check (type in ('income','expense')),
  category          text,
  description       text,
  transaction_date  date not null default current_date,
  created_at        timestamptz not null default now()
);
create index if not exists transactions_date_idx     on public.transactions (transaction_date desc);
create index if not exists transactions_type_idx     on public.transactions (type, transaction_date desc);

-- ─── 5. REVIEWS / FEEDBACK ──────────────────────────────────
create table if not exists public.reviews (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid references public.clients(id) on delete set null,
  client_name  text,                                 -- captured for unlinked submissions
  rating       int not null check (rating between 1 and 5),
  comment      text check (comment is null or char_length(comment) <= 2000),
  source       text check (source is null or char_length(source) <= 200),
  resolved     boolean not null default false,       -- admin marks low ratings as handled
  created_at   timestamptz not null default now()
);
create index if not exists reviews_rating_idx  on public.reviews (rating, created_at desc);
create index if not exists reviews_unresolved  on public.reviews (created_at desc) where resolved = false;

-- ─── HELPER VIEWS / FUNCTIONS ───────────────────────────────

-- Items at or below their low-stock threshold.
create or replace view public.inventory_alerts as
  select
    id, name, unit, quantity, low_stock_threshold, usage_per_client,
    case
      when usage_per_client > 0
        then floor(quantity / usage_per_client)::int
      else null
    end as estimated_clients_remaining
  from public.inventory
  where quantity <= low_stock_threshold;

-- Appointments that should receive a 24h reminder right now.
create or replace function public.appointments_needing_reminder()
returns setof public.appointments
language sql stable
as $$
  select * from public.appointments
  where status = 'booked'
    and reminder_sent_at is null
    and appointment_date between now() and now() + interval '24 hours';
$$;

-- Appointments that finished today and need a thank-you message.
create or replace function public.appointments_needing_thanks()
returns setof public.appointments
language sql stable
as $$
  select * from public.appointments
  where status = 'completed'
    and thanks_sent_at is null
    and appointment_date >= now() - interval '36 hours'
    and appointment_date <= now();
$$;

-- Completed appointments from ~14 days ago that haven't been nudged.
create or replace function public.appointments_needing_rebook()
returns setof public.appointments
language sql stable
as $$
  select * from public.appointments
  where status = 'completed'
    and rebook_reminder_sent_at is null
    and appointment_date between now() - interval '15 days' and now() - interval '13 days';
$$;

-- Today's revenue (for dashboard).
create or replace view public.dashboard_today as
  select
    (select count(*) from public.appointments
       where appointment_date::date = current_date and status in ('booked','completed')) as appointments_today,
    (select count(*) from public.appointments
       where appointment_date::date = current_date and status = 'completed') as completed_today,
    (select coalesce(sum(price), 0) from public.appointments
       where appointment_date::date = current_date and status = 'completed') as revenue_today,
    (select count(*) from public.inventory_alerts) as low_stock_count,
    (select count(*) from public.reviews where resolved = false and rating < 5) as open_feedback_count;

-- ─── ROW LEVEL SECURITY ─────────────────────────────────────
alter table public.clients       enable row level security;
alter table public.appointments  enable row level security;
alter table public.inventory     enable row level security;
alter table public.transactions  enable row level security;
alter table public.reviews       enable row level security;

-- Drop and recreate so this script is rerunnable.
drop policy if exists "auth full access" on public.clients;
drop policy if exists "auth full access" on public.appointments;
drop policy if exists "auth full access" on public.inventory;
drop policy if exists "auth full access" on public.transactions;
drop policy if exists "auth full access" on public.reviews;
drop policy if exists "anon insert reviews" on public.reviews;

-- Authenticated users (the owner) get full access.
create policy "auth full access" on public.clients      for all to authenticated using (true) with check (true);
create policy "auth full access" on public.appointments for all to authenticated using (true) with check (true);
create policy "auth full access" on public.inventory    for all to authenticated using (true) with check (true);
create policy "auth full access" on public.transactions for all to authenticated using (true) with check (true);
create policy "auth full access" on public.reviews      for all to authenticated using (true) with check (true);

-- Public review form: anon may INSERT only (cannot read others' reviews).
create policy "anon insert reviews" on public.reviews for insert to anon with check (
  rating between 1 and 5
  and (comment is null or char_length(comment) <= 2000)
);

-- =============================================================
-- One-time setup after running this:
--   1. Supabase → Authentication → Users → "Add user"
--      Create the owner account (email + password). No signup flow needed.
--   2. Supabase → Project Settings → API
--      Copy the anon key into /admin/assets/admin.js (SUPABASE_ANON_KEY).
--   3. Run the seed below if you want a starter inventory list.
-- =============================================================

-- Optional starter inventory (uncomment to seed)
-- insert into public.inventory (name, unit, quantity, usage_per_client, low_stock_threshold) values
--   ('Hard wax beads',   'g',    2000, 25, 500),
--   ('Soft wax cartridge','unit',   8,  0.2, 3),
--   ('Wax sticks (large)','unit', 500, 5,   100),
--   ('Wax sticks (small)','unit', 800, 6,   150),
--   ('Nitrile gloves (M)','box',   4,  0,   2),
--   ('Pre-wax cleanser', 'ml',  1000, 5,   200),
--   ('Post-wax oil',     'ml',  1000, 4,   200);
