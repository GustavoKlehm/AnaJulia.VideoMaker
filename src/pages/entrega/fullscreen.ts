/**
 * Pede a tela cheia de verdade (computador e Android). Precisa ser chamada direto num clique.
 * No iPhone a página não pode entrar em tela cheia: o visualizador já ocupa a tela toda.
 */
export function requestPageFullscreen() {
  const root = document.documentElement
  if (document.fullscreenElement || typeof root.requestFullscreen !== 'function') return
  void root.requestFullscreen({ navigationUI: 'hide' }).catch(() => undefined)
}
