# Planos Page Overrides

> **PROJECT:** Ana Julia
> **Page Type:** Catálogo editorial — tabela de planos em papel
> Rules here **override** `design-system/ana-julia/MASTER.md`.

---

## Concept

Papel do começo ao fim. Sem cinema, sem vídeo, sem full-bleed. A página é um
documento editorial: o cliente lê, compara e decide. Preço é informação, não
promoção.

## Layout

1. **Intro** (`#planos-conteudo`) — título serif e lead curto, centralizados.
2. **Linhas** — Momentos, Ocasiões e Marcas, cada uma numa faixa separada por
   hairline superior. Dentro de cada linha, os planos em grid auto-fit.
3. **Personalizado** — bloco de texto centralizado, sem preço, com CTA.
4. **Adicionais** — lista de duas colunas, rótulo à esquerda e valor à direita.
5. **Peças** — dicionário de filme, teaser, cortes e bruto.
6. **Regras** — condições comerciais em blocos curtos.
7. **CTA final** — WhatsApp e Direct, igual ao contato da home.

## Destaque do plano recomendado

O design system proíbe acento cromático, então o plano recomendado **não pode**
ser destacado por cor, fundo colorido ou badge chamativo. O destaque vem de:

- borda `1px solid var(--color-foreground)` em vez de `var(--color-border)`
- rótulo "Mais escolhido" em Inter 500, uppercase, `--tracking-label`
- nada de escala, sombra ou deslocamento — o card não pode mudar de tamanho

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
