-- Área do cliente: clientes, contatos (login por telefone + PIN), planos enviados pelo ExPx,
-- respostas (aprovar / pedir ajuste) e novidades contadas pelo cliente.
-- Cadastro e planos são gravados pela API com service role; o cliente escreve só por funções.

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------

create table public.portal_clients (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 60),
  nome text not null check (length(nome) between 1 and 120),
  instagram text not null default '' check (length(instagram) <= 60),
  cor_principal text not null check (cor_principal ~ '^#[0-9a-f]{6}$'),
  cor_secundaria text not null check (cor_secundaria ~ '^#[0-9a-f]{6}$'),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.portal_contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.portal_clients (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  nome text not null check (length(nome) between 1 and 120),
  telefone text not null check (telefone ~ '^[1-9]{2}9[0-9]{8}$'),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, telefone)
);

create index portal_contacts_user_idx on public.portal_contacts (user_id) where ativo;
create index portal_contacts_telefone_idx on public.portal_contacts (telefone);

create table public.portal_plans (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.portal_clients (id) on delete cascade,
  periodo text not null check (periodo ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(periodo) <= 60),
  titulo text not null check (length(titulo) between 1 and 200),
  introducao text not null default '' check (length(introducao) <= 4000),
  inicio date not null,
  fim date not null,
  status text not null default 'publicado' check (status in ('previa', 'publicado')),
  enviado_em timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (client_id, periodo),
  check (fim >= inicio)
);

create table public.portal_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.portal_plans (id) on delete cascade,
  chave text not null check (chave ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$'),
  data date not null,
  formato text not null check (formato in ('reels', 'foto', 'carrossel', 'stories', 'video')),
  titulo text not null check (length(titulo) between 1 and 200),
  selos text[] not null default '{}',
  secoes jsonb not null default '[]'::jsonb check (jsonb_typeof(secoes) = 'array'),
  hash text not null,
  versao integer not null default 1 check (versao >= 1),
  ordem integer not null default 0,
  arquivado boolean not null default false,
  atualizado_em timestamptz not null default now(),
  unique (plan_id, chave)
);

create table public.portal_reviews (
  id bigint generated always as identity primary key,
  item_id uuid not null references public.portal_items (id) on delete cascade,
  versao integer not null,
  status text not null check (status in ('aprovado', 'ajuste')),
  comentario text not null default '' check (length(comentario) <= 4000),
  autor_id uuid references auth.users (id) on delete set null,
  autor_nome text not null default '',
  created_at timestamptz not null default now()
);

create index portal_reviews_item_idx on public.portal_reviews (item_id, created_at desc);
create index portal_reviews_autor_idx on public.portal_reviews (autor_id);

create table public.portal_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.portal_clients (id) on delete cascade,
  plan_id uuid references public.portal_plans (id) on delete set null,
  titulo text not null check (length(titulo) between 1 and 200),
  detalhes text not null default '' check (length(detalhes) <= 4000),
  quando text not null default '' check (length(quando) <= 200),
  autor_id uuid references auth.users (id) on delete set null,
  autor_nome text not null default '',
  created_at timestamptz not null default now()
);

create index portal_notes_client_idx on public.portal_notes (client_id, created_at desc);
create index portal_notes_plan_idx on public.portal_notes (plan_id);
create index portal_notes_autor_idx on public.portal_notes (autor_id);
create index portal_plans_client_idx on public.portal_plans (client_id);
create index portal_items_plan_idx on public.portal_items (plan_id);

-- ---------------------------------------------------------------------------
-- Permissão: o usuário logado é contato ativo do cliente?
-- ---------------------------------------------------------------------------

create or replace function public.portal_is_member(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.portal_contacts c
    join public.portal_clients cl on cl.id = c.client_id
    where c.client_id = target
      and c.user_id = (select auth.uid())
      and c.ativo
      and cl.ativo
  );
$$;

revoke all on function public.portal_is_member(uuid) from public, anon;
grant execute on function public.portal_is_member(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS: leitura. Nenhuma tabela tem política de escrita: escrita é pela API
-- (service role) ou pelas funções abaixo.
-- ---------------------------------------------------------------------------

alter table public.portal_clients enable row level security;
alter table public.portal_contacts enable row level security;
alter table public.portal_plans enable row level security;
alter table public.portal_items enable row level security;
alter table public.portal_reviews enable row level security;
alter table public.portal_notes enable row level security;

create policy portal_clients_select on public.portal_clients
  for select to authenticated
  using ((select public.is_admin()) or public.portal_is_member(id));

create policy portal_contacts_select on public.portal_contacts
  for select to authenticated
  using ((select public.is_admin()) or user_id = (select auth.uid()));

create policy portal_plans_select on public.portal_plans
  for select to authenticated
  using ((select public.is_admin()) or (status = 'publicado' and public.portal_is_member(client_id)));

create policy portal_items_select on public.portal_items
  for select to authenticated
  using (
    (select public.is_admin())
    or (
      not arquivado
      and exists (
        select 1 from public.portal_plans p
        where p.id = plan_id and p.status = 'publicado' and public.portal_is_member(p.client_id)
      )
    )
  );

create policy portal_reviews_select on public.portal_reviews
  for select to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1
      from public.portal_items i
      join public.portal_plans p on p.id = i.plan_id
      where i.id = item_id and p.status = 'publicado' and public.portal_is_member(p.client_id)
    )
  );

create policy portal_notes_select on public.portal_notes
  for select to authenticated
  using ((select public.is_admin()) or public.portal_is_member(client_id));

grant select on public.portal_clients, public.portal_contacts, public.portal_plans,
  public.portal_items, public.portal_reviews, public.portal_notes to authenticated;
revoke all on public.portal_clients, public.portal_contacts, public.portal_plans,
  public.portal_items, public.portal_reviews, public.portal_notes from anon;

-- ---------------------------------------------------------------------------
-- Funções do cliente
-- ---------------------------------------------------------------------------

-- Nome do contato logado dentro de um cliente (para assinar respostas e novidades).
create or replace function public.portal_member_name(target uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select c.nome
  from public.portal_contacts c
  where c.client_id = target and c.user_id = (select auth.uid()) and c.ativo
  limit 1;
$$;

revoke all on function public.portal_member_name(uuid) from public, anon, authenticated;

create or replace function public.portal_review(p_item uuid, p_status text, p_comentario text default '')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item record;
  v_nome text;
  v_comentario text := btrim(coalesce(p_comentario, ''));
begin
  if p_status not in ('aprovado', 'ajuste') then
    raise exception 'status inválido' using errcode = '22023';
  end if;
  if p_status = 'ajuste' and v_comentario = '' then
    raise exception 'Escreva o que você quer que mude.' using errcode = '22023';
  end if;
  if length(v_comentario) > 4000 then
    raise exception 'Comentário longo demais.' using errcode = '22023';
  end if;

  select i.id, i.versao, p.client_id
  into v_item
  from public.portal_items i
  join public.portal_plans p on p.id = i.plan_id
  where i.id = p_item and not i.arquivado and p.status = 'publicado';

  if not found then
    raise exception 'Post não encontrado.' using errcode = 'P0002';
  end if;

  v_nome := public.portal_member_name(v_item.client_id);
  if v_nome is null then
    raise exception 'Sem permissão para responder este plano.' using errcode = '42501';
  end if;

  insert into public.portal_reviews (item_id, versao, status, comentario, autor_id, autor_nome)
  values (v_item.id, v_item.versao, p_status, case when p_status = 'ajuste' then v_comentario else '' end,
          (select auth.uid()), v_nome);

  return jsonb_build_object('ok', true, 'versao', v_item.versao);
end;
$$;

revoke all on function public.portal_review(uuid, text, text) from public, anon;
grant execute on function public.portal_review(uuid, text, text) to authenticated;

-- Aprova de uma vez todos os posts que ainda não têm resposta na versão atual.
create or replace function public.portal_approve_pending(p_plan uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_client uuid;
  v_nome text;
  v_count integer;
begin
  select client_id into v_client
  from public.portal_plans
  where id = p_plan and status = 'publicado';

  if v_client is null then
    raise exception 'Plano não encontrado.' using errcode = 'P0002';
  end if;

  v_nome := public.portal_member_name(v_client);
  if v_nome is null then
    raise exception 'Sem permissão para responder este plano.' using errcode = '42501';
  end if;

  insert into public.portal_reviews (item_id, versao, status, autor_id, autor_nome)
  select i.id, i.versao, 'aprovado', (select auth.uid()), v_nome
  from public.portal_items i
  where i.plan_id = p_plan
    and not i.arquivado
    and not exists (
      select 1 from public.portal_reviews r where r.item_id = i.id and r.versao = i.versao
    );

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.portal_approve_pending(uuid) from public, anon;
grant execute on function public.portal_approve_pending(uuid) to authenticated;

create or replace function public.portal_add_note(
  p_client uuid,
  p_plan uuid,
  p_titulo text,
  p_detalhes text default '',
  p_quando text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nome text;
  v_id uuid;
begin
  v_nome := public.portal_member_name(p_client);
  if v_nome is null then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  if btrim(coalesce(p_titulo, '')) = '' then
    raise exception 'Conte o que é a novidade.' using errcode = '22023';
  end if;
  if p_plan is not null and not exists (
    select 1 from public.portal_plans where id = p_plan and client_id = p_client and status = 'publicado'
  ) then
    raise exception 'Plano não encontrado.' using errcode = 'P0002';
  end if;

  insert into public.portal_notes (client_id, plan_id, titulo, detalhes, quando, autor_id, autor_nome)
  values (p_client, p_plan, btrim(p_titulo), btrim(coalesce(p_detalhes, '')), btrim(coalesce(p_quando, '')),
          (select auth.uid()), v_nome)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.portal_add_note(uuid, uuid, text, text, text) from public, anon;
grant execute on function public.portal_add_note(uuid, uuid, text, text, text) to authenticated;

create or replace function public.portal_delete_note(p_note uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.portal_notes n
  where n.id = p_note
    and n.autor_id = (select auth.uid())
    and public.portal_member_name(n.client_id) is not null;
  return found;
end;
$$;

revoke all on function public.portal_delete_note(uuid) from public, anon;
grant execute on function public.portal_delete_note(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Envio do plano pelo ExPx (só service role). Atômico e idempotente.
-- ---------------------------------------------------------------------------

create or replace function public.portal_sync_plan(p_client_slug text, p_plan jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_client uuid;
  v_plan uuid;
  v_item jsonb;
  v_hash text;
  v_existing record;
  v_keys text[] := '{}';
  v_ordem integer := 0;
  n_novos integer := 0;
  n_alterados integer := 0;
  n_mantidos integer := 0;
  n_arquivados integer := 0;
begin
  select id into v_client from public.portal_clients where slug = p_client_slug;
  if v_client is null then
    raise exception 'cliente desconhecido: %', p_client_slug using errcode = 'P0002';
  end if;

  insert into public.portal_plans as pl (client_id, periodo, titulo, introducao, inicio, fim, status, enviado_em)
  values (
    v_client,
    p_plan ->> 'periodo',
    p_plan ->> 'titulo',
    coalesce(p_plan ->> 'introducao', ''),
    (p_plan ->> 'inicio')::date,
    (p_plan ->> 'fim')::date,
    coalesce(p_plan ->> 'status', 'publicado'),
    now()
  )
  on conflict (client_id, periodo) do update
    set titulo = excluded.titulo,
        introducao = excluded.introducao,
        inicio = excluded.inicio,
        fim = excluded.fim,
        status = excluded.status,
        enviado_em = now()
  returning pl.id into v_plan;

  for v_item in select value from jsonb_array_elements(p_plan -> 'itens')
  loop
    v_ordem := v_ordem + 1;
    v_keys := v_keys || (v_item ->> 'id');
    -- A data fica fora do hash: mudar só o dia não pede nova aprovação.
    v_hash := md5(jsonb_build_object(
      'formato', v_item -> 'formato',
      'titulo', v_item -> 'titulo',
      'selos', coalesce(v_item -> 'selos', '[]'::jsonb),
      'secoes', v_item -> 'secoes'
    )::text);

    select id, hash, arquivado into v_existing
    from public.portal_items
    where plan_id = v_plan and chave = v_item ->> 'id';

    if not found then
      insert into public.portal_items (plan_id, chave, data, formato, titulo, selos, secoes, hash, ordem)
      values (
        v_plan,
        v_item ->> 'id',
        (v_item ->> 'data')::date,
        v_item ->> 'formato',
        v_item ->> 'titulo',
        array(select jsonb_array_elements_text(coalesce(v_item -> 'selos', '[]'::jsonb))),
        v_item -> 'secoes',
        v_hash,
        v_ordem
      );
      n_novos := n_novos + 1;
    elsif v_existing.hash <> v_hash then
      update public.portal_items
      set data = (v_item ->> 'data')::date,
          formato = v_item ->> 'formato',
          titulo = v_item ->> 'titulo',
          selos = array(select jsonb_array_elements_text(coalesce(v_item -> 'selos', '[]'::jsonb))),
          secoes = v_item -> 'secoes',
          hash = v_hash,
          versao = versao + 1,
          ordem = v_ordem,
          arquivado = false,
          atualizado_em = now()
      where id = v_existing.id;
      n_alterados := n_alterados + 1;
    else
      update public.portal_items
      set data = (v_item ->> 'data')::date,
          ordem = v_ordem,
          arquivado = false
      where id = v_existing.id;
      n_mantidos := n_mantidos + 1;
    end if;
  end loop;

  update public.portal_items
  set arquivado = true, atualizado_em = now()
  where plan_id = v_plan and not arquivado and not (chave = any (v_keys));
  get diagnostics n_arquivados = row_count;

  return jsonb_build_object(
    'plano', v_plan,
    'novos', n_novos,
    'alterados', n_alterados,
    'mantidos', n_mantidos,
    'arquivados', n_arquivados
  );
end;
$$;

revoke all on function public.portal_sync_plan(text, jsonb) from public, anon, authenticated;
grant execute on function public.portal_sync_plan(text, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- Login de cliente nunca vira admin do estúdio.
-- ---------------------------------------------------------------------------

create or replace function public.claim_studio()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_id uuid;
  admin_count integer;
  already_admin boolean;
  is_portal boolean;
begin
  current_id := auth.uid();
  if current_id is null then
    return false;
  end if;

  select coalesce(raw_app_meta_data ->> 'role', '') = 'admin',
         coalesce(raw_app_meta_data ->> 'portal', '') = 'cliente'
  into already_admin, is_portal
  from auth.users
  where id = current_id;

  if already_admin then
    return true;
  end if;

  if is_portal then
    return false;
  end if;

  select count(*)::integer
  into admin_count
  from auth.users
  where raw_app_meta_data ->> 'role' = 'admin';

  if admin_count > 0 then
    return false;
  end if;

  update auth.users
  set raw_app_meta_data =
    coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
  where id = current_id;

  return found;
end;
$$;

revoke all on function public.claim_studio() from public, anon;
grant execute on function public.claim_studio() to authenticated;
