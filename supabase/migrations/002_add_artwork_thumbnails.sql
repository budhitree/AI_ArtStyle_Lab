alter table public.artworks
add column if not exists thumbnail_url text;

update public.artworks
set thumbnail_url = image_url
where thumbnail_url is null;
