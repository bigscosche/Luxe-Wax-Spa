-- =============================================================
-- Luxe Wax Spa — leads table
-- Run this once in Supabase → SQL Editor → New query → Run.
-- =============================================================

create extension if not exists "pgcrypto";

create table if not exists public.leads (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null check (char_length(name)  between 1 and 120),
  phone       text not null check (char_length(phone) between 1 and 40),
  email       text not null check (char_length(email) between 3 and 160),
  service     text not null check (service  in ('brazilian-wax','bikini-wax','eyebrow-design','lash-lift','body-waxing','mens-waxing','other')),
  location    text not null check (location in ('newtown','danbury','bethel','ridgefield','monroe','other')),
  message     text        check (message is null or char_length(message) <= 2000),
  source      text        check (source  is null or char_length(source)  <= 200),
  submitted   timestamptz
);

-- Indexes used by the Netlify Function
create index if not exists leads_created_at_desc on public.leads (created_at desc);
create index if not exists leads_email_created   on public.leads (email, created_at desc);

-- Row Level Security: deny all client access. Only the service-role key
-- (used by the Netlify Function server-side) can read or write.
alter table public.leads enable row level security;

-- Intentionally NO policies → anon/authenticated clients cannot select/insert.
-- If you later want authenticated admins to read:
--   create policy "admins read" on public.leads for select using (auth.role() = 'authenticated');
