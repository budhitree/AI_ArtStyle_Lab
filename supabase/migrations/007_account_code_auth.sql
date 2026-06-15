create schema if not exists private;

alter table public.profiles
add column if not exists account_code text;

create or replace function private.account_code_from_email(email text)
returns text
language sql
immutable
as $$
  select case
    when email is null or btrim(email) = '' then null
    when lower(email) ~ '^legacy-.+@artstyle-lab\.local$'
      then substring(lower(email) from '^legacy-(.+)@artstyle-lab\.local$')
    when lower(email) ~ '^account-.+@artstyle-lab\.local$'
      then substring(lower(email) from '^account-(.+)@artstyle-lab\.local$')
    when lower(email) ~ '^u[0-9]{7,8}@ai-artstyle-lab\.com$'
      then substring(lower(email) from '^u([0-9]{7,8})@ai-artstyle-lab\.com$')
    else split_part(lower(email), '@', 1)
  end
$$;

create or replace function private.role_from_account_code(account_code text)
returns text
language sql
immutable
as $$
  select case
    when account_code ~ '^[0-9]{7}$' then 'teacher'
    when account_code ~ '^[0-9]{8}$' then 'student'
    else 'student'
  end
$$;

create or replace function private.account_code_from_auth_user(metadata jsonb, email text)
returns text
language sql
immutable
as $$
  select coalesce(
    nullif(lower(btrim(metadata ->> 'account_code')), ''),
    private.account_code_from_email(email)
  )
$$;

update public.profiles profiles
set account_code = private.account_code_from_auth_user(users.raw_user_meta_data, users.email)
from auth.users users
where users.id = profiles.id
  and (profiles.account_code is null or btrim(profiles.account_code) = '');

update public.profiles
set account_code = private.account_code_from_email(email)
where account_code is null or btrim(account_code) = '';

alter table public.profiles
alter column account_code set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_account_code_key'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
    add constraint profiles_account_code_key unique (account_code);
  end if;
end $$;

drop trigger if exists on_auth_user_created on auth.users;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  account_code text;
  inferred_role text;
begin
  account_code := private.account_code_from_auth_user(new.raw_user_meta_data, new.email);
  inferred_role := private.role_from_account_code(account_code);

  insert into public.profiles (id, email, account_code, name, role, avatar_url)
  values (
    new.id,
    coalesce(new.email, concat(new.id::text, '@artstyle.local')),
    account_code,
    coalesce(new.raw_user_meta_data ->> 'name', account_code, split_part(coalesce(new.email, 'new user'), '@', 1)),
    inferred_role,
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
  set email = excluded.email,
      account_code = coalesce(public.profiles.account_code, excluded.account_code),
      name = excluded.name,
      role = case
        when public.profiles.role = 'admin' then public.profiles.role
        else excluded.role
      end,
      avatar_url = excluded.avatar_url;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure private.handle_new_user();

create or replace function private.protect_profile_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'authenticated'
    and (
      new.email is distinct from old.email
      or new.account_code is distinct from old.account_code
      or new.role is distinct from old.role
    )
  then
    raise exception 'Profile account fields cannot be changed by users.' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_identity on public.profiles;
create trigger protect_profile_identity
before update on public.profiles
for each row execute procedure private.protect_profile_identity();
