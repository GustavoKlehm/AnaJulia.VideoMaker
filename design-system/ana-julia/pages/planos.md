# Planos Page Overrides

> **PROJECT:** Ana Julia
> **Page Type:** Catálogo editorial — tabela de planos em papel
> Rules here **override** `design-system/ana-julia/MASTER.md`.

---

## Concept

Papel do começo ao fim. Sem cinema, sem vídeo, sem full-bleed. A página é um
documento editorial interativo: o cliente reconhece a necessidade, e o
conteúdo abaixo se adapta. Não é wizard, não é calculadora, não é
"passo 1 de 3".

Preço é informação, não promoção. Progressive disclosure reduz complexidade;
não esconde o que o cliente já escolheu ver. "Ver todos os planos" existe
para quem prefere comparar de uma vez.

A seleção vive na URL (`/planos?tipo=momentos&plano=historia`) para o link
ser compartilhável.

## Layout

1. **Intro** (`#planos-conteudo`) — pergunta serif: "O que você quer guardar?"
2. **Seletor persistente** — Momentos · Ocasiões · Marcas, com a promessa de
   cada linha. Abaixo, o conteúdo muda. Alternativa: "Ver todos os planos".
3. **Guia** — segunda pergunta na linguagem da necessidade (guardar, receber,
   ritmo). O plano escolhido se revela abaixo, com preço, o que está incluso
   e o CTA. Ocasiões tem dois recortes: como recebe, depois quanto tempo.
4. **Vista completa** — as três linhas em cards, para quem pediu "ver todos".
3. **Personalizado** — bloco de texto centralizado, sem preço, com CTA.
4. **Adicionais** — lista de duas colunas, rótulo à esquerda e valor à direita.
5. **Peças** — dicionário de filme, teaser, cortes e bruto.
6. **Regras** — condições comerciais em blocos curtos.
7. **CTA final** — WhatsApp e Direct, igual ao contato da home.

## Destaque do plano recomendado

O design system proíbe acento cromático, então o plano recomendado **não pode**
ser destacado por cor, fundo colorido ou badge chamativo. Escala, sombra ou
deslocamento também são proibidos — o card não pode mudar de tamanho nem de
posição. Só estes meios de destaque são permitidos:

- borda `1px solid var(--color-foreground)` em vez de `var(--color-border)`
- rótulo "Mais escolhido" em Inter 500, uppercase, `--tracking-label`
- CTA preenchido (invertido) no plano recomendado: `.tier--featured .tier__cta`
  com `background: var(--color-primary)` — preto editorial (`--color-primary`),
  não cor — e `color: var(--color-on-primary)`; os demais planos mantêm CTA só
  com contorno

## Cards nesta página

A home proíbe cards; esta página os permite, porque é tabela comparativa. Mesmo
assim: cantos retos, fundo `--color-card`, hairline, sem sombra, sem hover que
mude o bounding box.

## Motion

Apenas o `Reveal` já existente (opacity + 12px, ~380ms), no máximo um por faixa.
Sem stagger, sem parallax. `prefers-reduced-motion`: estado final imediato.

## Anti-patterns on this page

- Acento cromático, badge colorido, gradiente
- Preço riscado ou contador de urgência falsa
- Tabela com mais de 6 linhas de comparação
- Hover que muda layout
