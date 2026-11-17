-- Agenda do estúdio: compromissos, gravações nos clientes e eventos da equipe.
-- Todo mundo com a chave do estúdio (is_admin) vê tudo; cada pessoa cria,
-- edita e apaga só os próprios eventos. Cada pessoa tem uma cor no calendário.

-- ---------------------------------------------------------------------------
-- Perfil de quem usa a agenda (nome curto + cor)
-- ---------------------------------------------------------------------------

create table public.studio_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  nome text not null check (length(nome) between 1 and 60),
  cor text not null check (cor ~ '^#[0-9a-f]{6}$'),
  updated_at timestamptz not null default now()
);

alter table public.studio_profiles enable row level security;

create policy studio_profiles_select on public.studio_profiles
  for select to authenticated
  using ((select public.is_admin()));

create policy studio_profiles_insert on public.studio_profiles
  for insert to authenticated
  with check ((select public.is_admin()) and user_id = (select auth.uid()));

create policy studio_profiles_update on public.studio_profiles
  for update to authenticated
  using ((select public.is_admin()) and user_id = (select auth.uid()))
  with check ((select public.is_admin()) and user_id = (select auth.uid()));

grant select, insert, update on public.studio_profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Eventos
-- ---------------------------------------------------------------------------

create table public.agenda_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tipo text not null check (tipo in ('compromisso', 'gravacao', 'evento', 'outro')),
  titulo text not null check (length(titulo) between 1 and 200),
  inicio timestamptz not null,
  fim timestamptz not null,
  dia_todo boolean not null default false,
  local text not null default '' check (length(local) <= 200),
  client_id uuid references public.portal_clients (id) on delete set null,
  notas text not null default '' check (length(notas) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (fim >= inicio)
);

create index agenda_events_inicio_idx on public.agenda_events (inicio);
create index agenda_events_owner_idx on public.agenda_events (owner_id);
create index agenda_events_client_idx on public.agenda_events (client_id);

alter table public.agenda_events enable row level security;

create policy agenda_events_select on public.agenda_events
  for select to authenticated
  using ((select public.is_admin()));

create policy agenda_events_insert on public.agenda_events
  for insert to authenticated
  with check ((select public.is_admin()) and owner_id = (select auth.uid()));

create policy agenda_events_update on public.agenda_events
  for update to authenticated
  using ((select public.is_admin()) and owner_id = (select auth.uid()))
  with check ((select public.is_admin()) and owner_id = (select auth.uid()));

create policy agenda_events_delete on public.agenda_events
  for delete to authenticated
  using ((select public.is_admin()) and owner_id = (select auth.uid()));

grant select, insert, update, delete on public.agenda_events to authenticated;
