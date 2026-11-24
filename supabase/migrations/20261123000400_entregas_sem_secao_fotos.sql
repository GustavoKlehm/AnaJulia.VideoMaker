-- A Ana quer que a sequência dos stories (fotos e vídeos misturados) seja respeitada na página do cliente.
-- Então não há mais seção "Fotos": foto vai para Stories, junto com os vídeos, na ordem em que ela subiu.
-- Só os "Vídeos para Reels" ficam separados.
-- Roda depois de 20261123000200 e 20261123000300 (funciona também se a 000300 acabou de ser aplicada).

update public.portal_delivery_files set categoria = 'stories' where categoria = 'foto';

alter table public.portal_delivery_files drop constraint if exists portal_delivery_files_categoria_check;
alter table public.portal_delivery_files
  add constraint portal_delivery_files_categoria_check check (categoria in ('stories', 'reels'));

comment on column public.portal_delivery_files.categoria is
  'Seção em que o cliente vê o arquivo: stories (fotos e vídeos, na ordem de envio) ou reels (só vídeos).';
