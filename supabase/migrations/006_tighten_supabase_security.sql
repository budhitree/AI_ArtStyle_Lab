drop function if exists public.current_user_role();

create index if not exists ai_generations_user_id_idx
on public.ai_generations (user_id);

create index if not exists artworks_owner_id_idx
on public.artworks (owner_id);

create index if not exists artworks_visibility_created_at_idx
on public.artworks (visibility, created_at desc);

create index if not exists exhibitions_curator_id_idx
on public.exhibitions (curator_id);

create index if not exists exhibitions_status_created_at_idx
on public.exhibitions (status, created_at desc);

create index if not exists exhibition_artworks_artwork_id_idx
on public.exhibition_artworks (artwork_id);

drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile"
on public.profiles for update
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "public can read public artworks" on public.artworks;
drop policy if exists "owners manage artworks" on public.artworks;
create policy "artworks are readable when public or owned"
on public.artworks for select
using (visibility = 'public' or (select auth.uid()) = owner_id);

create policy "owners can insert artworks"
on public.artworks for insert
with check ((select auth.uid()) = owner_id);

create policy "owners can update artworks"
on public.artworks for update
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy "owners can delete artworks"
on public.artworks for delete
using ((select auth.uid()) = owner_id);

drop policy if exists "users can manage own ai generations" on public.ai_generations;
create policy "users can manage own ai generations"
on public.ai_generations for all
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "public can read published exhibitions" on public.exhibitions;
drop policy if exists "teachers and admins can create exhibitions" on public.exhibitions;
drop policy if exists "curators manage exhibitions" on public.exhibitions;
drop policy if exists "curators delete exhibitions" on public.exhibitions;

create policy "public can read published exhibitions"
on public.exhibitions for select
using (
  status = 'published'
  or (select auth.uid()) = curator_id
  or exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'admin'
  )
);

create policy "teachers and admins can create exhibitions"
on public.exhibitions for insert
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role in ('teacher', 'admin')
  )
);

create policy "curators can update exhibitions"
on public.exhibitions for update
using (
  (select auth.uid()) = curator_id
  or exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'admin'
  )
)
with check (
  (select auth.uid()) = curator_id
  or exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'admin'
  )
);

create policy "curators can delete exhibitions"
on public.exhibitions for delete
using (
  (select auth.uid()) = curator_id
  or exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'admin'
  )
);

drop policy if exists "junctions follow exhibition access" on public.exhibition_artworks;
drop policy if exists "curators manage exhibition junctions" on public.exhibition_artworks;

create policy "junctions follow exhibition access"
on public.exhibition_artworks for select
using (
  exists (
    select 1
    from public.exhibitions
    where exhibitions.id = exhibition_id
      and (
        exhibitions.status = 'published'
        or exhibitions.curator_id = (select auth.uid())
        or exists (
          select 1
          from public.profiles
          where profiles.id = (select auth.uid())
            and profiles.role = 'admin'
        )
      )
  )
);

create policy "curators can insert exhibition junctions"
on public.exhibition_artworks for insert
with check (
  exists (
    select 1
    from public.exhibitions
    where exhibitions.id = exhibition_id
      and (
        exhibitions.curator_id = (select auth.uid())
        or exists (
          select 1
          from public.profiles
          where profiles.id = (select auth.uid())
            and profiles.role = 'admin'
        )
      )
  )
);

create policy "curators can delete exhibition junctions"
on public.exhibition_artworks for delete
using (
  exists (
    select 1
    from public.exhibitions
    where exhibitions.id = exhibition_id
      and (
        exhibitions.curator_id = (select auth.uid())
        or exists (
          select 1
          from public.profiles
          where profiles.id = (select auth.uid())
            and profiles.role = 'admin'
        )
      )
  )
);

drop policy if exists "Public artwork files are readable" on storage.objects;
drop policy if exists "Users read own artwork files" on storage.objects;
create policy "Users read own artwork files"
on storage.objects for select
to authenticated
using (
  bucket_id = 'artworks'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users upload own artwork files" on storage.objects;
drop policy if exists "Users update own artwork files" on storage.objects;
drop policy if exists "Users delete own artwork files" on storage.objects;
create policy "Users upload own artwork files"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'artworks'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Users update own artwork files"
on storage.objects for update
to authenticated
using (
  bucket_id = 'artworks'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'artworks'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Users delete own artwork files"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'artworks'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
