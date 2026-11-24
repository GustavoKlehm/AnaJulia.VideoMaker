-- Agrupamento das entregas para o cliente: Fotos, Stories e Vídeos para Reels.
-- Imagem é sempre "foto"; vídeo a Ana marca no estúdio como "stories" ou "reels".
-- Todos os vídeos que já existem (inclusive a entrega da Ana e Carlos) entram como Stories pelo default
-- da coluna; as imagens viram Fotos no update abaixo. Os poucos que forem Reels se trocam depois:
--   update public.portal_delivery_files set categoria = 'reels' where id in ('<id>', '<id>');
-- (ou no estúdio, no seletor de cada vídeo).

alter table public.portal_delivery_files
  add column categoria text not null default 'stories'
    check (categoria in ('foto', 'stories', 'reels'));

update public.portal_delivery_files set categoria = 'foto' where tipo like 'image/%';

comment on column public.portal_delivery_files.categoria is
  'Seção em que o cliente vê o arquivo: foto (toda imagem), stories ou reels (vídeos, escolhido pela Ana).';
