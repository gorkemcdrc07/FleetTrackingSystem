begin;

create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    username text unique,
    full_name text,
    role text not null default 'user' check (role in ('user', 'admin')),
    permissions jsonb not null default '{}'::jsonb,
    active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1 from public.profiles
        where id = auth.uid() and role = 'admin' and active = true
    );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, username, full_name, role, active)
    values (
        new.id,
        nullif(new.raw_user_meta_data ->> 'username', ''),
        nullif(new.raw_user_meta_data ->> 'full_name', ''),
        'user',
        true
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

drop policy if exists profiles_select_self_or_admin on public.profiles;
create policy profiles_select_self_or_admin
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_admin_insert on public.profiles;
create policy profiles_admin_insert
on public.profiles for insert
to authenticated
with check (public.is_admin());

drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update
on public.profiles for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists profiles_admin_delete on public.profiles;
create policy profiles_admin_delete
on public.profiles for delete
to authenticated
using (public.is_admin());

revoke all on public.profiles from anon;
grant select on public.profiles to authenticated;
grant insert, update, delete on public.profiles to authenticated;

commit;

-- Bootstrap is intentionally manual after creating the first Auth user:
-- update public.profiles set role = 'admin' where id = '<trusted-auth-user-uuid>';
