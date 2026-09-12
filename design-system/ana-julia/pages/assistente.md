# Assistente Page Overrides

> **PROJECT:** Ana Julia
> **Page Type:** Widget de ajuda — conversa sobre o catálogo
> Rules here **override** `design-system/ana-julia/MASTER.md`.

---

## Concept

Ajuda discreta, no canto, como um chat de apoio. O site por trás continua
igual: o painel não é modal e não escurece a página. A IA só fala do
catálogo. Fora disso, o caminho é WhatsApp.

O painel é papel mesmo quando a home está em cinema: a conversa precisa
ser lida, não encenada.

## Placement

- Botão flutuante circular, 56px, canto inferior direito
- Sempre papel + `logo-anajulia-icon.png` — precisa contrastar no hero cinema
- Ausente no Estúdio
- `z-index: 30` — acima do conteúdo, abaixo de um skip-link em foco
- Aberto, o botão vira fechar (ícone X)

## Invite (chat fechado)

Bolha de mensagem ao lado do botão, papel, hairline:

- Título: "Não sabe qual plano escolher?"
- Apoio: "Posso te ajudar a encontrar o certo."
- Clicar na bolha abre o chat; X dispensa
- Some ao abrir o chat; não volta na mesma sessão
- Sem pulse, sem badge colorido, sem auto-sumir

## Panel

- `role="dialog"` não modal, ancorado acima do botão
- Sem `::backdrop`, sem `showModal`
- Cantos retos, `--color-card`, hairline
- Título serif: "Ajuda para escolher um plano"
- Campo 16px, alvos ≥44px
- CTA "Ver este plano" preenchido (preto editorial)
- Escape fecha; o restante da página continua clicável
- Sem acento cromático, sem sombra, sem pill, sem emoji

## Motion

Hover 200ms em opacidade. Sem slide do painel. `prefers-reduced-motion`: sem
transição.

## Anti-patterns

- Modal centralizado que escurece o site
- Badge colorido, pulse, toast que some sozinho
- Inventar preço na interface
- Widget no Estúdio
