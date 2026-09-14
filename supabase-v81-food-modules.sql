-- Mis cosas V81: almacenamiento independiente para los módulos de Comidas.
-- Ejecutar UNA VEZ en Supabase > SQL Editor.
create table if not exists public.app_data_modules (
  user_id uuid not null references auth.users(id) on delete cascade,
  module text not null,
  data jsonb not null default '{}'::jsonb,
  revision bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, module)
);

alter table public.app_data_modules enable row level security;

revoke all on table public.app_data_modules from anon;
revoke all on table public.app_data_modules from authenticated;
grant select, insert, update, delete on table public.app_data_modules to authenticated;

drop policy if exists "app_data_modules_select_own" on public.app_data_modules;
drop policy if exists "app_data_modules_insert_own" on public.app_data_modules;
drop policy if exists "app_data_modules_update_own" on public.app_data_modules;
drop policy if exists "app_data_modules_delete_own" on public.app_data_modules;

create policy "app_data_modules_select_own"
  on public.app_data_modules for select
  to authenticated
  using (auth.uid() = user_id);

create policy "app_data_modules_insert_own"
  on public.app_data_modules for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "app_data_modules_update_own"
  on public.app_data_modules for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "app_data_modules_delete_own"
  on public.app_data_modules for delete
  to authenticated
  using (auth.uid() = user_id);

create index if not exists app_data_modules_user_module_idx
  on public.app_data_modules (user_id, module);
