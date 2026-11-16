-- Remove a linha Ocasiões do catálogo e adiciona a frase de apoio (hint) das linhas.

alter table public.pricing_lines
  add column hint text not null default '';

update public.pricing_lines
set hint = $s$Ex.: chá revelação, casamentos, despedidas de solteira, aniversários.$s$
where id = 'momentos';

update public.pricing_lines
set hint = $s$Para fortalecer a presença digital da sua empresa.$s$
where id = 'marcas';

-- pricing_tiers tem on delete cascade: os quatro planos de Ocasiões saem junto.
delete from public.pricing_lines where id = 'ocasioes';

delete from public.pricing_pieces where id = 'bruto';

update public.pricing_pieces
set body = replace(body, 'de 1 a 5 minutos', 'de 1 a 4 minutos')
where id = 'filme';

update public.pricing_rules
set body = replace(body, 'nas linhas Momentos e Ocasiões', 'na linha Momentos')
where id = 'revisoes';

update public.pricing_rules
set body = replace(body, 'Capítulo em 15, meia diária em 20 e diária em 25.', 'Capítulo em 15.')
where id = 'prazos';

drop table public.pricing_ocasioes_choices;
