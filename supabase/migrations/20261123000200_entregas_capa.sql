-- Capa dos vídeos das entregas: um JPEG com o primeiro frame "limpo" (sem tela preta) do vídeo,
-- gerado no navegador do estúdio e guardado no Cloudflare R2 ao lado do vídeo ("<path>.capa.jpg").
-- Nulo = vídeo ainda sem capa (a página mostra um quadro escuro com o botão de play).

alter table public.portal_delivery_files
  add column capa_path text check (capa_path is null or length(capa_path) <= 420);

comment on column public.portal_delivery_files.capa_path is
  'Capa do vídeo no R2 (sempre no R2, mesmo quando o vídeo ainda está no Supabase).';
