-- Run this entire file in your Supabase project:
-- Dashboard → SQL Editor → New query → paste → Run

-- ============================================================
-- TABLES
-- ============================================================

create table public.subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid references auth.users not null unique,
  stripe_customer_id     text unique,
  stripe_subscription_id text,
  status                 text not null default 'active', -- 'active' | 'cancelled'
  plan                   text,                           -- 'monthly' | 'yearly'
  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
);

alter table public.subscriptions enable row level security;

create policy "Users read own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

create table public.templates (
  id          uuid primary key,
  user_id     uuid references auth.users not null,
  name        text not null,
  file_name   text not null,
  file_type   text not null,
  file_url    text not null,
  uploaded_at timestamptz default now(),
  fields      jsonb default '[]'::jsonb,
  page_count  integer default 0
);

create table public.clients (
  id         uuid primary key,
  user_id    uuid references auth.users not null,
  name       text not null,
  email      text,
  company    text,
  created_at timestamptz default now()
);

create table public.client_documents (
  id          uuid primary key,
  client_id   uuid references public.clients(id) on delete cascade not null,
  user_id     uuid references auth.users not null,
  file_name   text not null,
  file_type   text not null,
  file_url    text not null,
  uploaded_at timestamptz default now(),
  fields      jsonb default '[]'::jsonb,
  page_count  integer default 0
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.templates        enable row level security;
alter table public.clients          enable row level security;
alter table public.client_documents enable row level security;

create policy "Users manage own templates"
  on public.templates for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own clients"
  on public.clients for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own documents"
  on public.client_documents for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- STORAGE BUCKET
-- Run separately if the SQL editor doesn't support storage API:
-- Dashboard → Storage → New bucket → name: "uploads", Public: OFF
-- ============================================================

insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', false)
on conflict do nothing;

create policy "Users access own files"
  on storage.objects for all
  using (
    bucket_id = 'uploads'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'uploads'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
