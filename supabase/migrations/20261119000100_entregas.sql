-- Entregas: a Ana sobe vídeos (stories de evento, vídeos finais) e o cliente recebe um link secreto.
-- O link abre sem login; quem tem login na área do cliente também vê a entrega lá.
-- Arquivos ficam no bucket privado "entregas". Tudo é gravado pela API (service role):
-- nenhuma política de escrita, nem no Storage. O cliente baixa por URLs assinadas que a API gera.

create table public.portal_deliveries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.portal_clients (id) on delete cascade,
  token text not null unique check (token ~ '^[A-Za-z0-9_-]{20,64}$'),
  titulo text not null check (length(titulo) between 1 and 200),
  descricao text not null default '' check (length(descricao) <= 4000),
  data_evento date,
  -- Último dia em que o link funciona (horário de Brasília). Nulo = não expira.
  expira_em date,
  ativo boolean not null default true,
  -- Preenchido quando a limpeza apaga os arquivos de uma entrega vencida.
  arquivos_apagados_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index portal_deliveries_client_idx on public.portal_deliveries (client_id, created_at desc);
create index portal_deliveries_expira_idx on public.portal_deliveries (expira_em)
  where expira_em is not null and arquivos_apagados_em is null;

create table public.portal_delivery_files (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references public.portal_deliveries (id) on delete cascade,
  path text not null unique check (length(path) <= 400),
  nome text not null check (length(nome) between 1 and 200),
  tipo text not null check (tipo ~ '^(video|image)/[a-z0-9.+-]+$'),
  tamanho bigint not null default 0 check (tamanho >= 0),
  created_at timestamptz not null default now()
);

create index portal_delivery_files_delivery_idx on public.portal_delivery_files (delivery_id, created_at);

-- ---------------------------------------------------------------------------
-- RLS: só leitura. O cliente logado vê as entregas válidas dos clientes de que é contato
-- (para listar em /cliente); o conteúdo em si sai pela API pública com o token.
-- ---------------------------------------------------------------------------

alter table public.portal_deliveries enable row level security;
alter table public.portal_delivery_files enable row level security;

create policy portal_deliveries_select on public.portal_deliveries
  for select to authenticated
  using (
    (select public.is_admin())
    or (
      ativo
      and arquivos_apagados_em is null
      and (expira_em is null or expira_em >= (now() at time zone 'America/Sao_Paulo')::date)
      and public.portal_is_member(client_id)
    )
  );

-- A subconsulta passa pela política acima: só arquivos de entregas visíveis.
create policy portal_delivery_files_select on public.portal_delivery_files
  for select to authenticated
  using (
    (select public.is_admin())
    or exists (select 1 from public.portal_deliveries d where d.id = delivery_id)
  );

grant select on public.portal_deliveries, public.portal_delivery_files to authenticated;
revoke all on public.portal_deliveries, public.portal_delivery_files from anon;

-- ---------------------------------------------------------------------------
-- Storage: bucket privado. O limite real por arquivo também depende do limite global
-- do projeto (Storage → Settings); o menor dos dois vale.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'entregas',
  'entregas',
  false,
  5368709120,
  array[
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
