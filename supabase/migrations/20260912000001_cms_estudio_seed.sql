insert into public.media_assets (bucket, path, public_url, kind, alt, title)
values (
  'media',
  'hero_cinematographic.MOV',
  'https://bkknluhlyqmfhiazwslg.supabase.co/storage/v1/object/public/media/hero_cinematographic.MOV',
  'video',
  '',
  'Hero cinematográfico'
);

insert into public.site_settings (
  slogan,
  slogan_line_1,
  slogan_line_2,
  roles_line,
  about_heading,
  about_p1,
  about_p2,
  about_cta_label,
  contact_heading,
  contact_lead,
  instagram_lead,
  whatsapp_phone,
  whatsapp_home_message,
  whatsapp_plan_template,
  whatsapp_custom_message,
  whatsapp_planos_cta_message,
  instagram_url,
  instagram_dm_url,
  seo_title,
  seo_description,
  show_stories,
  hero_media_id,
  planos_eyebrow,
  planos_heading,
  planos_lead,
  planos_addons_lead,
  planos_pieces_heading,
  planos_pieces_lead,
  planos_rules_title,
  planos_rules_lead,
  planos_cta_heading
)
values (
  'Transformando momentos em histórias',
  'Transformando momentos',
  'em histórias',
  'Storymaker · Videomaker',
  'Sobre',
  $s$Acreditamos que cada história começa nas experiências, nos detalhes e nos momentos que merecem ser contados.$s$,
  'Registramos marcas, eventos e momentos especiais.',
  'Ver planos e valores',
  'Contato',
  $s$Conte o momento
que você quer guardar$s$,
  $s$Conheça meu trabalho
no Instagram$s$,
  '5546999343683',
  'Olá! Vim pelo site e gostaria de conhecer melhor o seu trabalho. 😊',
  'Olá! Vim pelo site e queria saber mais sobre o plano {name}.',
  'Olá! Vim pelo site e queria um orçamento personalizado.',
  'Olá! Vim pela página de planos e queria conversar sobre um projeto.',
  'https://www.instagram.com/anajulia.videomaker_/',
  'https://ig.me/m/anajulia.videomaker_/',
  'Ana Julia — Storymaker e Videomaker',
  'Ana Julia — Storymaker e Videomaker. Transformando momentos em histórias.',
  false,
  (select id from public.media_assets where path = 'hero_cinematographic.MOV' limit 1),
  'Planos',
  'O que você quer guardar?',
  'Escolha o que você procura. O restante da página se adapta.',
  $s$Valem para qualquer plano e sempre aparecem discriminados no orçamento, nunca embutidos no total.$s$,
  'O que é cada peça',
  $s$O filme é para guardar, o teaser é para postar, os cortes são para não sumir do feed. Cada um dá um trabalho diferente — é por isso que os planos custam preços diferentes.$s$,
  'Como funciona',
  'As mesmas condições para todo mundo, combinadas antes de começar.',
  'Conte o momento que você quer guardar'
);

insert into public.stories (id, title, lead, sort_order)
values
  ('amor', 'Histórias de amor', 'O olhar, o voto, o que não cabe em discurso.', 0),
  ('familia', 'Família', 'O cotidiano que, filmado com cuidado, vira memória.', 1),
  ('presenca', 'Presença', 'Ensaios e encontros onde o tempo afrouxa.', 2);

insert into public.pricing_lines (id, title, promise, lead, prompt, display, unit, sort_order)
values
  (
    'momentos',
    'Momentos',
    'Pequenas histórias que merecem ser lembradas.',
    $s$Ensaios, pré-wedding, família, gestante, aniversário. Para guardar um capítulo da sua própria história.$s$,
    'Como você quer guardar esse momento?',
    'exact',
    'project',
    0
  ),
  (
    'ocasioes',
    'Ocasiões',
    'Dias que merecem ser vividos e registrados por inteiro.',
    $s$15 anos, batizado, formatura, casamento civil, confraternização. Um dia inteiro ou meio período.$s$,
    'Como você quer receber esse registro?',
    'from',
    'project',
    1
  ),
  (
    'marcas',
    'Marcas',
    'Histórias que sua marca quer contar.',
    $s$Conteúdo recorrente para comércio e serviço. Eu vou até você filmar — não é edição de material que você manda.$s$,
    'Qual ritmo combina com sua marca?',
    'from',
    'month',
    2
  );

insert into public.pricing_tiers (
  id, line_id, name, need, capture, delivery, hours, price, featured, sort_order
)
values
  (
    'retrato',
    'momentos',
    'Retrato',
    'Para registrar um momento pontual.',
    '1h de captação, 1 locação',
    array['1 filme de até 60s, vertical ou horizontal — você escolhe'],
    5.5,
    390,
    false,
    0
  ),
  (
    'historia',
    'momentos',
    'História',
    'Para contar esse momento com mais detalhes.',
    '2h de captação, até 2 locações',
    array[
      '1 filme de até 2 min, vertical ou horizontal — você escolhe',
      '2 cortes verticais de 30s'
    ],
    10.5,
    690,
    true,
    1
  ),
  (
    'capitulo',
    'momentos',
    'Capítulo',
    'Para viver e registrar a experiência de forma mais completa.',
    '4h de captação, até 3 locações, com direção prévia',
    array['1 filme de até 4 min', '1 teaser de 60s', '3 cortes verticais'],
    18,
    1190,
    false,
    2
  ),
  (
    'captacao-meia',
    'ocasioes',
    'Só captação — meia diária',
    'O material registrado, organizado, sem edição.',
    'Até 4h de cobertura',
    array['Material bruto organizado, entregue por link'],
    6.5,
    450,
    false,
    0
  ),
  (
    'captacao-diaria',
    'ocasioes',
    'Só captação — diária',
    'O material registrado, organizado, sem edição.',
    'Até 8h de cobertura',
    array['Material bruto organizado, entregue por link'],
    11,
    790,
    false,
    1
  ),
  (
    'meia-diaria',
    'ocasioes',
    'Meia diária',
    'Conteúdo tratado e pronto para assistir e compartilhar.',
    'Até 4h de cobertura',
    array['1 filme de até 3 min', '1 corte vertical'],
    13,
    890,
    false,
    2
  ),
  (
    'diaria',
    'ocasioes',
    'Diária',
    'Conteúdo tratado e pronto para assistir e compartilhar.',
    'Até 8h de cobertura',
    array['1 filme de até 5 min', '1 teaser', '2 cortes verticais'],
    24,
    1590,
    false,
    3
  ),
  (
    'presenca',
    'marcas',
    'Presença',
    'Duas peças por mês, uma ida.',
    '1h30 de captação por mês',
    array['2 peças verticais de até 45s', '1 rodada de revisão por peça'],
    6.5,
    490,
    false,
    0
  ),
  (
    'ritmo',
    'marcas',
    'Ritmo',
    'Quatro peças por mês, uma ida.',
    '3h de captação por mês',
    array['4 peças verticais de até 45s', '1 rodada de revisão por peça'],
    12,
    890,
    true,
    1
  ),
  (
    'narrativa',
    'marcas',
    'Narrativa',
    'Oito peças por mês, em duas idas.',
    '6h de captação por mês, em 2 idas',
    array['8 peças verticais de até 45s', '1 rodada de revisão por peça'],
    22,
    1490,
    false,
    2
  );

insert into public.pricing_addons (id, label, value, sort_order)
values
  ('peca-extra', 'Peça vertical extra, a partir de material já captado', 'R$ 180', 0),
  ('hora-extra', 'Hora extra de captação no dia', 'R$ 120', 1),
  ('revisao-extra', 'Rodada de revisão além das inclusas', 'R$ 150', 2),
  ('outro-formato', 'Versão no outro formato (reenquadramento)', 'R$ 90', 3),
  ('versao-extra', 'Versão com legenda ou sem trilha', 'R$ 90', 4),
  ('urgencia', 'Entrega em até 48h', '+40%', 5),
  ('deslocamento', 'Deslocamento acima de 20 km de Dois Vizinhos', 'R$ 2,00/km rodado', 6);

insert into public.pricing_pieces (id, name, purpose, body, sort_order)
values
  (
    'filme',
    'Filme',
    'Para guardar',
    $s$A peça principal, de 1 a 5 minutos conforme o plano. Feita para ser assistida inteira, sentada. Tem narrativa: abre situando o lugar, desenvolve mostrando as pessoas, fecha num momento de emoção. Cortes longos, áudio ambiente presente, trilha por baixo sem dominar.$s$,
    0
  ),
  (
    'teaser',
    'Teaser',
    'Para postar',
    $s$O trailer do filme, de 30 a 60 segundos. Mesmo material, edição nova do zero: abre com o plano mais forte, corta rápido na batida da trilha e prende nos dois primeiros segundos.$s$,
    1
  ),
  (
    'cortes',
    'Cortes verticais',
    'Para não sumir do feed',
    $s$De 30 a 45 segundos, um momento isolado cada, sempre vertical. Servem para alimentar o feed nas semanas seguintes sem repetir a mesma peça. Um corte, um assunto, legenda quando tem fala.$s$,
    2
  ),
  (
    'bruto',
    'Material bruto',
    'Para quem só quer a captação',
    $s$O que sai do cartão, sem edição, organizado em pastas e com os takes inutilizáveis descartados. Disponível apenas na linha Ocasiões.$s$,
    3
  );

insert into public.pricing_rules (id, title, body, sort_order)
values
  (
    'sinal',
    'Sinal e pagamento',
    $s$30% para reservar a data e o saldo na entrega do arquivo final. Antes do sinal a data fica em aberto. Pix à vista tem 5% de desconto e, acima de R$ 690, parcelo em até 3x sem juros.$s$,
    0
  ),
  (
    'revisoes',
    'Revisões',
    $s$Duas rodadas inclusas nas linhas Momentos e Ocasiões, uma rodada por peça na linha Marcas. Você tem 7 dias após receber a prévia para pedir ajustes. Trocar música, ajustar corte e mudar cor é revisão; incluir cena que não foi filmada é trabalho novo.$s$,
    1
  ),
  (
    'prazos',
    'Prazos de entrega',
    $s$Contados a partir da captação: Retrato em 7 dias úteis, História em 10, Capítulo em 15, meia diária em 20 e diária em 25.$s$,
    2
  ),
  (
    'deslocamento',
    'Deslocamento',
    $s$Incluso até 20 km de Dois Vizinhos. Acima disso, R$ 2,00 por km rodado ida e volta, sempre discriminado no orçamento.$s$,
    3
  ),
  (
    'direitos',
    'Direitos de uso',
    $s$O material é seu, para sempre, inclusive para uso comercial. Eu mantenho o direito de usar no portfólio e nas minhas redes — e você pode vetar isso por escrito na assinatura.$s$,
    4
  ),
  (
    'remarcacao',
    'Cancelamento e remarcação',
    $s$O sinal não é devolvido, porque ele reservou a data. A remarcação é permitida uma vez, com aviso de 48h, para uma nova data em até 90 dias.$s$,
    5
  ),
  (
    'trilha',
    'Trilha sonora',
    $s$Biblioteca licenciada inclusa. Se você quiser uma música específica, precisa ter a licença dela — sem isso o Instagram derruba o áudio do seu vídeo.$s$,
    6
  ),
  (
    'validade',
    'Validade',
    'A proposta de preços enviada tem validade de 15 dias a partir do envio.',
    7
  );

insert into public.pricing_custom (title, lead, floor)
values (
  'Personalizado',
  $s$Seu momento não cabe em nenhum dos planos? Me conta o que você quer guardar e eu monto um orçamento com a mesma régua: horas de captação, edição e deslocamento, sem surpresa no meio do caminho.$s$,
  350
);

insert into public.pricing_ocasioes_choices (
  receive_prompt,
  time_prompt,
  bruto_label,
  bruto_lead,
  editado_label,
  editado_lead,
  meia_label,
  meia_lead,
  diaria_label,
  diaria_lead
)
values (
  'Como você quer receber esse registro?',
  'Quanto tempo você precisa?',
  'Só captação',
  'Você recebe todo o material registrado.',
  'Captação + edição',
  'Você recebe os conteúdos tratados e prontos para assistir e compartilhar.',
  'Meia diária',
  'Até 4 horas.',
  'Diária',
  'Até 8 horas.'
);
