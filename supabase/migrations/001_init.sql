create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null,
  role text not null check (role in ('student', 'teacher', 'admin')),
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.artworks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  prompt text,
  image_url text not null,
  thumbnail_url text,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  source_type text not null check (source_type in ('upload', 'ai')),
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  prompt text not null,
  params jsonb not null default '{}'::jsonb,
  result_images jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.exhibitions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  cover_image_url text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  curator_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exhibition_artworks (
  exhibition_id uuid not null references public.exhibitions(id) on delete cascade,
  artwork_id uuid not null references public.artworks(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (exhibition_id, artwork_id)
);

create or replace function public.handle_new_user()
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
      role = excluded.role,
      avatar_url = excluded.avatar_url;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.artworks enable row level security;
alter table public.ai_generations enable row level security;
alter table public.exhibitions enable row level security;
alter table public.exhibition_artworks enable row level security;

create policy "profiles can read all profiles"
on public.profiles for select
using (true);

create policy "users can update own profile"
on public.profiles for update
using (auth.uid() = id);

create policy "public can read public artworks"
on public.artworks for select
using (visibility = 'public' or auth.uid() = owner_id);

create policy "owners manage artworks"
on public.artworks for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "public can read published exhibitions"
on public.exhibitions for select
using (
  status = 'published'
  or auth.uid() = curator_id
  or exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

create policy "teachers and admins can create exhibitions"
on public.exhibitions for insert
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('teacher', 'admin')
  )
);

create policy "curators manage exhibitions"
on public.exhibitions for update
using (
  auth.uid() = curator_id
  or exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  auth.uid() = curator_id
  or exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

create policy "curators delete exhibitions"
on public.exhibitions for delete
using (
  auth.uid() = curator_id
  or exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

create policy "junctions follow exhibition access"
on public.exhibition_artworks for select
using (
  exists (
    select 1
    from public.exhibitions
    where exhibitions.id = exhibition_id
      and (
        exhibitions.status = 'published'
        or exhibitions.curator_id = auth.uid()
      )
  )
);

create policy "curators manage exhibition junctions"
on public.exhibition_artworks for all
using (
  exists (
    select 1
    from public.exhibitions
    where exhibitions.id = exhibition_id
      and (
        exhibitions.curator_id = auth.uid()
        or exists (
          select 1
          from public.profiles
          where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.exhibitions
    where exhibitions.id = exhibition_id
      and (
        exhibitions.curator_id = auth.uid()
        or exists (
          select 1
          from public.profiles
          where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
      )
  )
);
