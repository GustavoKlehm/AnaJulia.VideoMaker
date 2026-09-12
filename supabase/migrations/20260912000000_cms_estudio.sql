create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create table public.media_assets (
  id bigint generated always as identity primary key,
  bucket text not null default 'media',
  path text not null,
  public_url text not null,
  kind text not null check (kind in ('video', 'image')),
  alt text not null default '',
  title text,
  created_at timestamptz not null default now(),
  unique (bucket, path)
);

create table public.site_settings (
  id bigint generated always as identity primary key,
  slogan text not null,
  slogan_line_1 text not null,
  slogan_line_2 text not null,
  roles_line text not null,
  about_heading text not null,
  about_p1 text not null,
  about_p2 text not null,
  about_cta_label text not null,
  contact_heading text not null,
  contact_lead text not null,
  instagram_lead text not null,
  whatsapp_phone text not null,
  whatsapp_home_message text not null,
  whatsapp_plan_template text not null,
  whatsapp_custom_message text not null,
  whatsapp_planos_cta_message text not null,
  instagram_url text not null,
  instagram_dm_url text not null,
  seo_title text not null,
  seo_description text not null,
  show_stories boolean not null default false,
  hero_media_id bigint references public.media_assets (id) on delete set null,
  planos_eyebrow text not null,
  planos_heading text not null,
  planos_lead text not null,
  planos_addons_lead text not null,
  planos_pieces_heading text not null,
  planos_pieces_lead text not null,
  planos_rules_title text not null,
  planos_rules_lead text not null,
  planos_cta_heading text not null,
  updated_at timestamptz not null default now(),
  constraint site_settings_singleton check (id = 1)
);

create table public.stories (
  id text primary key,
  title text not null,
  lead text not null,
  media_id bigint references public.media_assets (id) on delete set null,
  sort_order integer not null default 0
);

create table public.pricing_lines (
  id text primary key,
  title text not null,
  promise text not null,
  lead text not null,
  prompt text not null,
  display text not null check (display in ('exact', 'from')),
  unit text not null check (unit in ('project', 'month')),
  sort_order integer not null default 0
);

create table public.pricing_tiers (
  id text primary key,
  line_id text not null references public.pricing_lines (id) on delete cascade,
  name text not null,
  need text not null,
  capture text not null,
  delivery text[] not null,
  hours numeric not null,
  price numeric(10, 2) not null,
  featured boolean not null default false,
  sort_order integer not null default 0
);

create index pricing_tiers_line_id_idx on public.pricing_tiers (line_id);

create table public.pricing_addons (
  id text primary key,
  label text not null,
  value text not null,
  sort_order integer not null default 0
);

create table public.pricing_pieces (
  id text primary key,
  name text not null,
  purpose text not null,
  body text not null,
  sort_order integer not null default 0
);

create table public.pricing_rules (
  id text primary key,
  title text not null,
  body text not null,
  sort_order integer not null default 0
);

create table public.pricing_custom (
  id bigint generated always as identity primary key,
  title text not null,
  lead text not null,
  floor numeric(10, 2) not null,
  constraint pricing_custom_singleton check (id = 1)
);

create table public.pricing_ocasioes_choices (
  id bigint generated always as identity primary key,
  receive_prompt text not null,
  time_prompt text not null,
  bruto_label text not null,
  bruto_lead text not null,
  editado_label text not null,
  editado_lead text not null,
  meia_label text not null,
  meia_lead text not null,
  diaria_label text not null,
  diaria_lead text not null,
  constraint pricing_ocasioes_singleton check (id = 1)
);

alter table public.media_assets enable row level security;
alter table public.site_settings enable row level security;
alter table public.stories enable row level security;
alter table public.pricing_lines enable row level security;
alter table public.pricing_tiers enable row level security;
alter table public.pricing_addons enable row level security;
alter table public.pricing_pieces enable row level security;
alter table public.pricing_rules enable row level security;
alter table public.pricing_custom enable row level security;
alter table public.pricing_ocasioes_choices enable row level security;

create policy media_assets_select on public.media_assets
  for select to anon, authenticated
  using (true);
create policy media_assets_insert on public.media_assets
  for insert to authenticated
  with check ((select public.is_admin()));
create policy media_assets_update on public.media_assets
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
create policy media_assets_delete on public.media_assets
  for delete to authenticated
  using ((select public.is_admin()));

create policy site_settings_select on public.site_settings
  for select to anon, authenticated
  using (true);
create policy site_settings_update on public.site_settings
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy stories_select on public.stories
  for select to anon, authenticated
  using (true);
create policy stories_insert on public.stories
  for insert to authenticated
  with check ((select public.is_admin()));
create policy stories_update on public.stories
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
create policy stories_delete on public.stories
  for delete to authenticated
  using ((select public.is_admin()));

create policy pricing_lines_select on public.pricing_lines
  for select to anon, authenticated
  using (true);
create policy pricing_lines_insert on public.pricing_lines
  for insert to authenticated
  with check ((select public.is_admin()));
create policy pricing_lines_update on public.pricing_lines
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
create policy pricing_lines_delete on public.pricing_lines
  for delete to authenticated
  using ((select public.is_admin()));

create policy pricing_tiers_select on public.pricing_tiers
  for select to anon, authenticated
  using (true);
create policy pricing_tiers_insert on public.pricing_tiers
  for insert to authenticated
  with check ((select public.is_admin()));
create policy pricing_tiers_update on public.pricing_tiers
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
create policy pricing_tiers_delete on public.pricing_tiers
  for delete to authenticated
  using ((select public.is_admin()));

create policy pricing_addons_select on public.pricing_addons
  for select to anon, authenticated
  using (true);
create policy pricing_addons_insert on public.pricing_addons
  for insert to authenticated
  with check ((select public.is_admin()));
create policy pricing_addons_update on public.pricing_addons
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
create policy pricing_addons_delete on public.pricing_addons
  for delete to authenticated
  using ((select public.is_admin()));

create policy pricing_pieces_select on public.pricing_pieces
  for select to anon, authenticated
  using (true);
create policy pricing_pieces_insert on public.pricing_pieces
  for insert to authenticated
  with check ((select public.is_admin()));
create policy pricing_pieces_update on public.pricing_pieces
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
create policy pricing_pieces_delete on public.pricing_pieces
  for delete to authenticated
  using ((select public.is_admin()));

create policy pricing_rules_select on public.pricing_rules
  for select to anon, authenticated
  using (true);
create policy pricing_rules_insert on public.pricing_rules
  for insert to authenticated
  with check ((select public.is_admin()));
create policy pricing_rules_update on public.pricing_rules
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
create policy pricing_rules_delete on public.pricing_rules
  for delete to authenticated
  using ((select public.is_admin()));

create policy pricing_custom_select on public.pricing_custom
  for select to anon, authenticated
  using (true);
create policy pricing_custom_update on public.pricing_custom
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy pricing_ocasioes_select on public.pricing_ocasioes_choices
  for select to anon, authenticated
  using (true);
create policy pricing_ocasioes_update on public.pricing_ocasioes_choices
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

grant select on table
  public.media_assets,
  public.site_settings,
  public.stories,
  public.pricing_lines,
  public.pricing_tiers,
  public.pricing_addons,
  public.pricing_pieces,
  public.pricing_rules,
  public.pricing_custom,
  public.pricing_ocasioes_choices
  to anon, authenticated;

grant insert, update, delete on table
  public.media_assets,
  public.stories,
  public.pricing_lines,
  public.pricing_tiers,
  public.pricing_addons,
  public.pricing_pieces,
  public.pricing_rules
  to authenticated;

grant update on table
  public.site_settings,
  public.pricing_custom,
  public.pricing_ocasioes_choices
  to authenticated;

grant usage, select on all sequences in schema public to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  209715200,
  array[
    'video/quicktime',
    'video/mp4',
    'video/webm',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists media_public_read on storage.objects;
drop policy if exists media_admin_insert on storage.objects;
drop policy if exists media_admin_update on storage.objects;
drop policy if exists media_admin_delete on storage.objects;

create policy media_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'media');

create policy media_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and (select public.is_admin()));

create policy media_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'media' and (select public.is_admin()))
  with check (bucket_id = 'media' and (select public.is_admin()));

create policy media_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and (select public.is_admin()));

create or replace function public.promote_admin(target_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update auth.users
  set raw_app_meta_data =
    coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
  where email = target_email;

  if not found then
    raise exception 'user not found: %', target_email;
  end if;
end;
$$;

revoke all on function public.promote_admin(text) from public, anon, authenticated;
grant execute on function public.promote_admin(text) to postgres, service_role;
