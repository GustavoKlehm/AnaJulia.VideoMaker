import { describe, expect, it } from 'vitest'
import { customQuoteWhatsappMessage, messageForAssistenteFailure } from './assistenteApi'

describe('messageForAssistenteFailure', () => {
  it('usa a mensagem da API quando ela vem em português', () => {
    expect(messageForAssistenteFailure(400, 'Escreve uma pergunta mais curta.')).toBe(
      'Escreve uma pergunta mais curta.',
    )
  })

  it('não vaza erro interno e aponta o WhatsApp', () => {
    expect(messageForAssistenteFailure(503)).toMatch(/whatsapp/i)
    expect(messageForAssistenteFailure(502, 'GROQ_API_KEY missing')).not.toMatch(/GROQ/i)
    expect(messageForAssistenteFailure(404)).toMatch(/whatsapp/i)
  })

  it('mostra o aviso da API quando a ajuda está indisponível', () => {
    expect(
      messageForAssistenteFailure(
        503,
        'A ajuda automática está indisponível agora. Me chama no WhatsApp que eu te oriento.',
      ),
    ).toMatch(/indisponível/)
  })
})

describe('customQuoteWhatsappMessage', () => {
  it('junta o convite do site com o pedido do cliente', () => {
    expect(
      customQuoteWhatsappMessage('Olá! Vim pelo site e queria um orçamento personalizado.', [
        '8 vídeos de 30s e um filme de 4 min',
        'Evento de 8 horas em Dois Vizinhos, com edição',
        'A Diária não encaixa, quero personalizado',
      ]),
    ).toBe(
      [
        'Olá! Vim pelo site e queria um orçamento personalizado.',
        '',
        'Pedido:',
        '• 8 vídeos de 30s e um filme de 4 min',
        '• Evento de 8 horas em Dois Vizinhos, com edição',
        '• A Diária não encaixa, quero personalizado',
      ].join('\n'),
    )
  })
})
