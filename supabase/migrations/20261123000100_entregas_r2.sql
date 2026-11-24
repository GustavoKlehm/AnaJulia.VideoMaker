-- Entregas: os arquivos novos passam a ir para o Cloudflare R2 (sem limite de 50 MB por arquivo e sem custo
-- de banda). Os que já estavam no Supabase Storage continuam lá e seguem abrindo normalmente; esta coluna
-- diz onde cada arquivo está. Nada é movido nem apagado por esta migration.

alter table public.portal_delivery_files
  add column storage text not null default 'supabase' check (storage in ('supabase', 'r2'));

comment on column public.portal_delivery_files.storage is
  'Onde o arquivo está: supabase (bucket privado "entregas", arquivos antigos) ou r2 (Cloudflare R2, envios novos).';
