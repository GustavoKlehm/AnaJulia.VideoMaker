-- Planos em categorias e serviços: Momentos (Casamentos, Eventos, Festas, Ensaios;
-- storymaker, videomaker e os dois) e Marcas (Vídeo, Social media e o pacote).
-- Os dados abaixo espelham src/content/pricing.ts.

create table public.pricing_categories (
  id text primary key,
  line_id text not null references public.pricing_lines (id) on delete cascade,
  title text not null,
  promise text not null default '',
  hint text not null default '',
  combo_mode text not null default 'none' check (combo_mode in ('none', 'paired', 'free')),
  combo_discount numeric(5, 4) not null default 0 check (combo_discount >= 0 and combo_discount < 1),
  combo_note text not null default '',
  sort_order integer not null default 0
);

create index pricing_categories_line_id_idx on public.pricing_categories (line_id);

create table public.pricing_services (
  id text primary key,
  category_id text not null references public.pricing_categories (id) on delete cascade,
  title text not null,
  lead text not null default '',
  sort_order integer not null default 0
);

create index pricing_services_category_id_idx on public.pricing_services (category_id);

alter table public.pricing_tiers
  add column service_id text references public.pricing_services (id) on delete cascade;

create index pricing_tiers_service_id_idx on public.pricing_tiers (service_id);

alter table public.pricing_categories enable row level security;
alter table public.pricing_services enable row level security;

create policy pricing_categories_select on public.pricing_categories
  for select to anon, authenticated
  using (true);
create policy pricing_categories_insert on public.pricing_categories
  for insert to authenticated
  with check ((select public.is_admin()));
create policy pricing_categories_update on public.pricing_categories
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
create policy pricing_categories_delete on public.pricing_categories
  for delete to authenticated
  using ((select public.is_admin()));

create policy pricing_services_select on public.pricing_services
  for select to anon, authenticated
  using (true);
create policy pricing_services_insert on public.pricing_services
  for insert to authenticated
  with check ((select public.is_admin()));
create policy pricing_services_update on public.pricing_services
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
create policy pricing_services_delete on public.pricing_services
  for delete to authenticated
  using ((select public.is_admin()));

grant select on table public.pricing_categories, public.pricing_services to anon, authenticated;
grant insert, update, delete on table public.pricing_categories, public.pricing_services to authenticated;

-- Catálogo novo: os planos antigos saem.
delete from public.pricing_tiers;

update public.pricing_lines set
  title = $s$Momentos$s$,
  promise = $s$Pequenas histórias que merecem ser lembradas.$s$,
  hint = $s$Ex.: casamentos, eventos, aniversários, chá revelação, ensaios.$s$,
  lead = $s$Stories em tempo real, Reels editados depois, ou os dois. Escolha o tipo de momento e o tempo de cobertura.$s$,
  prompt = $s$O que você vai celebrar?$s$,
  display = 'exact',
  unit = 'project',
  sort_order = 0
where id = 'momentos';

update public.pricing_lines set
  title = $s$Marcas$s$,
  promise = $s$Histórias que sua marca quer contar.$s$,
  hint = $s$Para fortalecer a presença digital da sua empresa.$s$,
  lead = $s$Conteúdo recorrente para comércio e serviço: vídeo filmado no seu negócio, o Instagram cuidado de perto, ou os dois.$s$,
  prompt = $s$Do que sua marca precisa?$s$,
  display = 'from',
  unit = 'month',
  sort_order = 1
where id = 'marcas';

insert into public.pricing_categories (id, line_id, title, promise, hint, combo_mode, combo_discount, combo_note, sort_order)
values
  ('casamentos', 'momentos', $s$Casamentos$s$, $s$O sim, a festa e tudo o que acontece entre um e outro.$s$, $s$Cerimônia, festa e making of da noiva.$s$, 'paired', 0.15, $s$A Ana faz os dois no mesmo evento: stories durante e Reels depois, com a mesma filmagem vertical.$s$, 0),
  ('eventos', 'momentos', $s$Eventos$s$, $s$Para empresas que querem mostrar o que aconteceu, enquanto acontece.$s$, $s$Ex.: eventos corporativos, confraternizações, lançamentos, palestras.$s$, 'paired', 0.15, $s$A Ana faz os dois no mesmo evento: stories durante e Reels depois, com a mesma filmagem vertical.$s$, 1),
  ('festas', 'momentos', $s$Festas e comemorações$s$, $s$As festas que reúnem quem você ama.$s$, $s$Ex.: aniversários, chá revelação, chá de bebê, batizados.$s$, 'paired', 0.15, $s$A Ana faz os dois no mesmo evento: stories durante e Reels depois, com a mesma filmagem vertical.$s$, 2),
  ('ensaios', 'momentos', $s$Ensaios$s$, $s$Um capítulo da sua história, filmado com calma.$s$, $s$Ex.: gestante, família, casal, pré-wedding, 15 anos.$s$, 'none', 0, $s$$s$, 3),
  ('marcas-conteudo', 'marcas', $s$Conteúdo mensal$s$, $s$Vídeo, social media ou os dois.$s$, $s$$s$, 'free', 0.05, $s$Escolha um plano de cada. Os Reels filmados pela Ana entram como publicações bônus no Social media, fora do limite do plano.$s$, 0);

insert into public.pricing_services (id, category_id, title, lead, sort_order)
values
  ('casamentos-storymaker', 'casamentos', $s$Storymaker$s$, $s$Stories gravados e publicados durante o evento, no perfil que você escolher. Quem não está lá acompanha tudo ao vivo.$s$, 0),
  ('casamentos-videomaker', 'casamentos', $s$Videomaker$s$, $s$Reels editados com calma depois do evento, para guardar e postar. A cobertura tem o mesmo tempo do storymaker.$s$, 1),
  ('eventos-storymaker', 'eventos', $s$Storymaker$s$, $s$Stories gravados e publicados durante o evento, no perfil que você escolher. Quem não está lá acompanha tudo ao vivo.$s$, 0),
  ('eventos-videomaker', 'eventos', $s$Videomaker$s$, $s$Reels editados com calma depois do evento, para guardar e postar. A cobertura tem o mesmo tempo do storymaker.$s$, 1),
  ('festas-storymaker', 'festas', $s$Storymaker$s$, $s$Stories gravados e publicados durante o evento, no perfil que você escolher. Quem não está lá acompanha tudo ao vivo.$s$, 0),
  ('festas-videomaker', 'festas', $s$Videomaker$s$, $s$Reels editados com calma depois do evento, para guardar e postar. A cobertura tem o mesmo tempo do storymaker.$s$, 1),
  ('ensaios-videomaker', 'ensaios', $s$Videomaker$s$, $s$Reels editados a partir do ensaio, para guardar e postar.$s$, 0),
  ('marcas-video', 'marcas-conteudo', $s$Vídeo$s$, $s$A Ana vai até o seu negócio, filma e entrega Reels editados. Legenda e postagem ficam com o Social media.$s$, 0),
  ('marcas-social', 'marcas-conteudo', $s$Social media$s$, $s$A Ana cuida do seu Instagram: calendário, artes, legendas e postagem direto na sua conta.$s$, 1);

insert into public.pricing_tiers (id, line_id, service_id, name, need, capture, delivery, hours, price, featured, sort_order)
values
  ('casamentos-story-instante', 'momentos', 'casamentos-storymaker', $s$Instante$s$, $s$Só a cerimônia, contada em tempo real.$s$, $s$Até 2h de cobertura, 1 local$s$, array[$s$Até 15 stories publicados em tempo real$s$, $s$Todo o material gravado entregue por link em até 48h$s$], 4.5, 550, false, 0),
  ('casamentos-story-enredo', 'momentos', 'casamentos-storymaker', $s$Enredo$s$, $s$Cerimônia e festa, do sim à pista.$s$, $s$Até 5h de cobertura, até 2 locais$s$, array[$s$Até 35 stories publicados em tempo real$s$, $s$Todo o material gravado entregue por link em até 48h$s$], 8, 950, true, 1),
  ('casamentos-story-jornada', 'momentos', 'casamentos-storymaker', $s$Jornada$s$, $s$O dia inteiro: making of da noiva, cerimônia e festa.$s$, $s$Até 8h de cobertura, até 3 locais$s$, array[$s$Até 50 stories publicados em tempo real$s$, $s$Todo o material gravado entregue por link em até 48h$s$], 11.5, 1390, false, 2),
  ('casamentos-video-instante', 'momentos', 'casamentos-videomaker', $s$Instante$s$, $s$A cerimônia em Reels.$s$, $s$Até 2h de cobertura, 1 local$s$, array[$s$1 Reel de melhores momentos (até 90s)$s$, $s$2 Reels curtos (30 a 45s)$s$], 10, 790, false, 0),
  ('casamentos-video-enredo', 'momentos', 'casamentos-videomaker', $s$Enredo$s$, $s$Cerimônia e festa, do sim à pista.$s$, $s$Até 5h de cobertura, até 2 locais$s$, array[$s$1 Reel de melhores momentos (até 90s)$s$, $s$4 Reels curtos (30 a 45s)$s$], 17, 1390, true, 1),
  ('casamentos-video-jornada', 'momentos', 'casamentos-videomaker', $s$Jornada$s$, $s$O dia inteiro: making of da noiva, cerimônia e festa.$s$, $s$Até 8h de cobertura, até 3 locais$s$, array[$s$1 Reel de melhores momentos (até 90s)$s$, $s$7 Reels curtos (30 a 45s)$s$], 25, 1890, false, 2),
  ('eventos-story-instante', 'momentos', 'eventos-storymaker', $s$Instante$s$, $s$Palestras, lançamentos e encontros curtos.$s$, $s$Até 2h de cobertura, 1 local$s$, array[$s$Até 15 stories publicados em tempo real$s$, $s$Todo o material gravado entregue por link em até 48h$s$], 4, 450, false, 0),
  ('eventos-story-enredo', 'momentos', 'eventos-storymaker', $s$Enredo$s$, $s$O evento inteiro, da chegada ao encerramento.$s$, $s$Até 5h de cobertura, 1 local$s$, array[$s$Até 35 stories publicados em tempo real$s$, $s$Todo o material gravado entregue por link em até 48h$s$], 7, 790, true, 1),
  ('eventos-story-jornada', 'momentos', 'eventos-storymaker', $s$Jornada$s$, $s$Eventos longos ou em dois espaços.$s$, $s$Até 8h de cobertura, até 2 locais$s$, array[$s$Até 50 stories publicados em tempo real$s$, $s$Todo o material gravado entregue por link em até 48h$s$], 10.5, 1090, false, 2),
  ('eventos-video-instante', 'momentos', 'eventos-videomaker', $s$Instante$s$, $s$Palestras, lançamentos e encontros curtos.$s$, $s$Até 2h de cobertura, 1 local$s$, array[$s$1 Reel de melhores momentos (até 90s)$s$, $s$2 Reels curtos (30 a 45s)$s$], 10, 690, false, 0),
  ('eventos-video-enredo', 'momentos', 'eventos-videomaker', $s$Enredo$s$, $s$O evento inteiro, da chegada ao encerramento.$s$, $s$Até 5h de cobertura, 1 local$s$, array[$s$1 Reel de melhores momentos (até 90s)$s$, $s$4 Reels curtos (30 a 45s)$s$], 16.5, 1290, true, 1),
  ('eventos-video-jornada', 'momentos', 'eventos-videomaker', $s$Jornada$s$, $s$Eventos longos ou em dois espaços.$s$, $s$Até 8h de cobertura, até 2 locais$s$, array[$s$1 Reel de melhores momentos (até 90s)$s$, $s$6 Reels curtos (30 a 45s)$s$], 23.5, 1690, false, 2),
  ('festas-story-instante', 'momentos', 'festas-storymaker', $s$Instante$s$, $s$Parabéns, revelação e os momentos-chave.$s$, $s$Até 2h de cobertura, 1 local$s$, array[$s$Até 15 stories publicados em tempo real$s$, $s$Todo o material gravado entregue por link em até 48h$s$], 4, 390, false, 0),
  ('festas-story-enredo', 'momentos', 'festas-storymaker', $s$Enredo$s$, $s$A festa toda, da chegada dos convidados ao bolo.$s$, $s$Até 5h de cobertura, 1 local$s$, array[$s$Até 35 stories publicados em tempo real$s$, $s$Todo o material gravado entregue por link em até 48h$s$], 7, 690, true, 1),
  ('festas-story-jornada', 'momentos', 'festas-storymaker', $s$Jornada$s$, $s$Festas longas, do preparo ao fim da noite.$s$, $s$Até 8h de cobertura, 1 local$s$, array[$s$Até 50 stories publicados em tempo real$s$, $s$Todo o material gravado entregue por link em até 48h$s$], 10, 990, false, 2),
  ('festas-video-instante', 'momentos', 'festas-videomaker', $s$Instante$s$, $s$Parabéns, revelação e os momentos-chave.$s$, $s$Até 2h de cobertura, 1 local$s$, array[$s$1 Reel de melhores momentos (até 90s)$s$, $s$1 Reel curto (30 a 45s)$s$], 8.5, 590, false, 0),
  ('festas-video-enredo', 'momentos', 'festas-videomaker', $s$Enredo$s$, $s$A festa toda, da chegada dos convidados ao bolo.$s$, $s$Até 5h de cobertura, 1 local$s$, array[$s$1 Reel de melhores momentos (até 90s)$s$, $s$3 Reels curtos (30 a 45s)$s$], 15, 1090, true, 1),
  ('festas-video-jornada', 'momentos', 'festas-videomaker', $s$Jornada$s$, $s$Festas longas, do preparo ao fim da noite.$s$, $s$Até 8h de cobertura, 1 local$s$, array[$s$1 Reel de melhores momentos (até 90s)$s$, $s$5 Reels curtos (30 a 45s)$s$], 21.5, 1590, false, 2),
  ('retrato', 'momentos', 'ensaios-videomaker', $s$Retrato$s$, $s$Um ensaio curto, num lugar só.$s$, $s$1h de captação, 1 local$s$, array[$s$1 Reel de até 60s$s$, $s$1 Reel curto de até 30s$s$], 6.5, 450, false, 0),
  ('historia', 'momentos', 'ensaios-videomaker', $s$História$s$, $s$Um ensaio com mais de um cenário.$s$, $s$2h de captação, até 2 locais$s$, array[$s$1 Reel de até 90s$s$, $s$2 Reels curtos (30 a 45s)$s$], 10, 690, true, 1),
  ('capitulo', 'momentos', 'ensaios-videomaker', $s$Capítulo$s$, $s$Um ensaio pensado em detalhe.$s$, $s$3h de captação, até 3 locais, com roteiro e referências combinados antes$s$, array[$s$1 Reel de até 90s$s$, $s$4 Reels curtos (30 a 45s)$s$], 15, 1090, false, 2),
  ('essencial', 'marcas', 'marcas-video', $s$Essencial$s$, $s$Para o pequeno negócio que está começando a aparecer.$s$, $s$1 ida por mês, até 1h de captação$s$, array[$s$2 Reels de até 45s$s$, $s$1 rodada de revisão por Reel$s$], 5.5, 390, false, 0),
  ('presenca', 'marcas', 'marcas-video', $s$Presença$s$, $s$Para manter o perfil ativo o mês inteiro.$s$, $s$1 ida por mês, até 1h30 de captação$s$, array[$s$4 Reels de até 45s$s$, $s$1 rodada de revisão por Reel$s$], 9.5, 790, false, 1),
  ('ritmo', 'marcas', 'marcas-video', $s$Ritmo$s$, $s$Para aparecer toda semana.$s$, $s$2 idas por mês, até 1h30 de captação cada$s$, array[$s$6 Reels de até 45s$s$, $s$1 rodada de revisão por Reel$s$], 15, 1190, true, 2),
  ('narrativa', 'marcas', 'marcas-video', $s$Narrativa$s$, $s$Para a marca que quer contar sua história com frequência.$s$, $s$3 idas por mês, até 1h30 de captação cada$s$, array[$s$8 Reels de até 45s$s$, $s$1 rodada de revisão por Reel$s$], 20.5, 1690, false, 3),
  ('constancia', 'marcas', 'marcas-social', $s$Constância$s$, $s$Para manter o perfil ativo, com cerca de 2 publicações por semana.$s$, $s$Até 8 publicações por mês$s$, array[$s$Calendário do mês aprovado antes de começar$s$, $s$Artes ou fotos tratadas, sempre com legenda$s$, $s$Postagem feita direto na sua conta$s$, $s$Relatório mensal$s$], 9, 650, false, 0),
  ('destaque', 'marcas', 'marcas-social', $s$Destaque$s$, $s$Para aparecer cerca de 3 vezes por semana, também nos stories.$s$, $s$Até 12 publicações por mês$s$, array[$s$Calendário do mês aprovado antes de começar$s$, $s$Artes ou fotos tratadas, sempre com legenda$s$, $s$Stories: repost de cada publicação e 1 enquete ou caixinha por semana$s$, $s$Postagem feita direto na sua conta$s$, $s$Relatório mensal$s$], 14, 990, true, 1);

delete from public.pricing_addons;
insert into public.pricing_addons (id, label, value, sort_order)
values
  ('hora-extra', $s$Hora extra de cobertura no dia$s$, $s$R$ 200$s$, 0),
  ('peca-extra', $s$Reel extra, ou edição de vídeo bruto enviado pelo cliente$s$, $s$R$ 180$s$, 1),
  ('revisao-extra', $s$Rodada de revisão além das inclusas$s$, $s$R$ 150$s$, 2),
  ('versao-extra', $s$Versão com legenda ou sem trilha$s$, $s$R$ 90$s$, 3),
  ('urgencia', $s$Entrega em até 48h$s$, $s$+40%$s$, 4),
  ('deslocamento', $s$Deslocamento acima de 20 km de Dois Vizinhos$s$, $s$R$ 2,00/km rodado$s$, 5);

delete from public.pricing_pieces;
insert into public.pricing_pieces (id, name, purpose, body, sort_order)
values
  ('stories', $s$Stories em tempo real$s$, $s$Para viver junto$s$, $s$Gravados e publicados durante o evento, no perfil que você escolher. Quem não pôde ir acompanha ao vivo, e quem foi revê no mesmo dia. Depois, todo o material gravado chega por link.$s$, 0),
  ('reel-momentos', $s$Reel de melhores momentos$s$, $s$Para guardar$s$, $s$Até 90 segundos com o resumo do dia, editado com calma depois do evento. Abre com o plano mais forte, segue a batida da trilha e fecha num momento de emoção.$s$, 1),
  ('reels-curtos', $s$Reels curtos$s$, $s$Para não sumir do feed$s$, $s$De 30 a 45 segundos, um momento isolado cada, sempre vertical. Servem para postar nas semanas seguintes sem repetir a mesma peça. Na linha Marcas, são os Reels do mês.$s$, 2),
  ('estatico', $s$Post estático$s$, $s$Para o feed respirar$s$, $s$Uma arte com a identidade da sua marca (cores, fontes e logo) ou uma foto sua tratada e recortada para o feed. Vai com a legenda escrita, pronto para publicar.$s$, 3);

delete from public.pricing_rules;
insert into public.pricing_rules (id, title, body, sort_order)
values
  ('sinal', $s$Sinal e pagamento$s$, $s$30% para reservar a data e o saldo na entrega do arquivo final. Antes do sinal a data fica em aberto. Pix à vista tem 5% de desconto e, acima de R$ 690, parcelo em até 3x sem juros.$s$, 0),
  ('revisoes', $s$Revisões$s$, $s$Uma rodada por Reel. Você tem 7 dias após receber a prévia para pedir ajustes. Trocar música, ajustar corte e mudar cor é revisão; incluir cena que não foi filmada é trabalho novo. Stories saem em tempo real e não têm revisão.$s$, 1),
  ('prazos', $s$Prazos de entrega$s$, $s$Stories na hora e material gravado em até 48h. Reels de festas, eventos e ensaios em até 10 dias úteis; de casamentos, em até 15 dias úteis.$s$, 2),
  ('mensal', $s$Planos mensais$s$, $s$Tempo mínimo de 3 meses. O material para o mês chega até o dia 20 do mês anterior, e o calendário aprovado em até 3 dias úteis vale como aprovado se não houver resposta. Publicações não usadas no mês não acumulam.$s$, 3),
  ('social-escopo', $s$O que o Social media inclui$s$, $s$Calendário, artes ou fotos tratadas, legendas, postagem na sua conta e relatório. Não inclui responder comentários e mensagens nem anúncios pagos. Editar vídeo bruto que você gravou é cobrado à parte.$s$, 4),
  ('deslocamento', $s$Deslocamento$s$, $s$Incluso até 20 km de Dois Vizinhos. Acima disso, R$ 2,00 por km rodado ida e volta, sempre discriminado no orçamento.$s$, 5),
  ('direitos', $s$Direitos de uso$s$, $s$O material é seu, para sempre, inclusive para uso comercial. Eu mantenho o direito de usar no portfólio e nas minhas redes — e você pode vetar isso por escrito na assinatura.$s$, 6),
  ('remarcacao', $s$Cancelamento e remarcação$s$, $s$O sinal não é devolvido, porque ele reservou a data. A remarcação é permitida uma vez, com aviso de 48h, para uma nova data em até 90 dias.$s$, 7),
  ('trilha', $s$Trilha sonora$s$, $s$Biblioteca licenciada inclusa. Se você quiser uma música específica, precisa ter a licença dela — sem isso o Instagram derruba o áudio do seu vídeo.$s$, 8),
  ('validade', $s$Validade$s$, $s$A proposta de preços enviada tem validade de 15 dias a partir do envio.$s$, 9);

update public.pricing_custom set lead = $s$Seu momento não cabe em nenhum dos planos? Me conta o que você quer guardar e eu monto um orçamento com a mesma régua: horas de cobertura, edição e deslocamento, sem surpresa no meio do caminho.$s$ where id = 1;

update public.site_settings
set planos_pieces_lead = $s$Os stories são para viver junto, o Reel de melhores momentos é para guardar, os curtos são para não sumir do feed. Cada um dá um trabalho diferente — é por isso que os planos custam preços diferentes.$s$
where id = 1;
