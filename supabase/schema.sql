-- Run this in Supabase SQL Editor

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_app_user_data_updated_at on public.app_user_data;
create trigger trg_app_user_data_updated_at
before update on public.app_user_data
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, plan)
  values (new.id, 'free')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.app_user_data enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "app_user_data_select_own" on public.app_user_data;
create policy "app_user_data_select_own"
on public.app_user_data
for select
using (auth.uid() = user_id);

drop policy if exists "app_user_data_insert_own" on public.app_user_data;
create policy "app_user_data_insert_own"
on public.app_user_data
for insert
with check (auth.uid() = user_id);

drop policy if exists "app_user_data_update_own" on public.app_user_data;
create policy "app_user_data_update_own"
on public.app_user_data
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Storage bucket for audio recordings (public URL sharing across devices)
insert into storage.buckets (id, name, public)
values ('audio', 'audio', true)
on conflict (id) do update set public = true;

drop policy if exists "audio_upload_own" on storage.objects;
create policy "audio_upload_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'audio'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "audio_update_own" on storage.objects;
create policy "audio_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'audio'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'audio'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "audio_delete_own" on storage.objects;
create policy "audio_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'audio'
  and (storage.foldername(name))[1] = auth.uid()::text
);
