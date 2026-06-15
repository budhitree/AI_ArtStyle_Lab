create schema if not exists private;

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop function if exists private.handle_new_user();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role, avatar_url)
  values (
    new.id,
    coalesce(new.email, concat(new.id::text, '@artstyle.local')),
    coalesce(new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email, 'new user'), '@', 1)),
    'student',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
  set email = excluded.email,
      name = excluded.name,
      avatar_url = excluded.avatar_url;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure private.handle_new_user();

insert into public.profiles (id, email, name, role, avatar_url)
select
  users.id,
  coalesce(users.email, concat(users.id::text, '@artstyle.local')),
  coalesce(users.raw_user_meta_data ->> 'name', split_part(coalesce(users.email, 'new user'), '@', 1)),
  'student',
  users.raw_user_meta_data ->> 'avatar_url'
from auth.users
left join public.profiles on profiles.id = users.id
where profiles.id is null;
