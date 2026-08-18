import { describe, it, expect } from 'vitest'
import { buildChunks } from './DiffViewer.jsx'

describe('buildChunks', () => {
  it('devolve um único chunk normal quando não há erros', () => {
    const chunks = buildChunks('Hello world', [])
    expect(chunks).toEqual([{ tipo: 'normal', texto: 'Hello world' }])
  })

  it('monta normal + erro + normal para um erro no meio do texto', () => {
    const text = 'Yesterday I go home.'
    const errors = [{ original: 'I go', correction: 'I went', category: 'tempo verbal' }]

    const chunks = buildChunks(text, errors)

    expect(chunks).toEqual([
      { tipo: 'normal', texto: 'Yesterday ' },
      { tipo: 'erro', original: 'I go', correction: 'I went', category: 'tempo verbal' },
      { tipo: 'normal', texto: ' home.' }
    ])
  })

  it('não cria chunk normal vazio quando o erro está no início do texto', () => {
    const text = 'I go home'
    const errors = [{ original: 'I go', correction: 'I went', category: 'tempo verbal' }]

    const chunks = buildChunks(text, errors)

    expect(chunks).toEqual([
      { tipo: 'erro', original: 'I go', correction: 'I went', category: 'tempo verbal' },
      { tipo: 'normal', texto: ' home' }
    ])
  })

  it('não cria chunk normal vazio quando o erro está no final do texto', () => {
    const text = 'Yesterday I go'
    const errors = [{ original: 'I go', correction: 'I went', category: 'tempo verbal' }]

    const chunks = buildChunks(text, errors)

    expect(chunks).toEqual([
      { tipo: 'normal', texto: 'Yesterday ' },
      { tipo: 'erro', original: 'I go', correction: 'I went', category: 'tempo verbal' }
    ])
  })

  it('intercala múltiplos erros em ordem com os trechos normais entre eles', () => {
    const text = 'I go to shool now'
    const errors = [
      { original: 'I go', correction: 'I went', category: 'tempo verbal' },
      { original: 'shool', correction: 'school', category: 'vocabulário' }
    ]

    const chunks = buildChunks(text, errors)

    expect(chunks).toEqual([
      { tipo: 'erro', original: 'I go', correction: 'I went', category: 'tempo verbal' },
      { tipo: 'normal', texto: ' to ' },
      { tipo: 'erro', original: 'shool', correction: 'school', category: 'vocabulário' },
      { tipo: 'normal', texto: ' now' }
    ])
  })

  it('ignora um erro cujo trecho original não existe mais no texto (a IA reformulou)', () => {
    const text = 'She like apples.'
    const errors = [{ original: 'she liks', correction: 'she likes', category: 'gramática' }]

    const chunks = buildChunks(text, errors)

    expect(chunks).toEqual([{ tipo: 'normal', texto: text }])
  })

  it('encontra o trecho mesmo quando a IA devolve "original" com capitalização diferente', () => {
    const text = 'I go to school every day.'
    const errors = [{ original: 'i go', correction: 'I went', category: 'tempo verbal' }]

    const chunks = buildChunks(text, errors)

    // o highlight usa a capitalização real do texto do usuário, não a da IA
    expect(chunks).toEqual([
      { tipo: 'erro', original: 'I go', correction: 'I went', category: 'tempo verbal' },
      { tipo: 'normal', texto: ' to school every day.' }
    ])
  })

  it('encontra o trecho mesmo quando "original" vem com espaços a mais nas pontas', () => {
    const text = 'I go to school.'
    const errors = [{ original: '  I go  ', correction: 'I went', category: 'tempo verbal' }]

    const chunks = buildChunks(text, errors)

    expect(chunks).toEqual([
      { tipo: 'erro', original: 'I go', correction: 'I went', category: 'tempo verbal' },
      { tipo: 'normal', texto: ' to school.' }
    ])
  })

  it('ignora um erro cujo "original" fica vazio após o trim', () => {
    const text = 'I go to school.'
    const errors = [{ original: '   ', correction: 'x', category: 'gramática' }]

    const chunks = buildChunks(text, errors)

    expect(chunks).toEqual([{ tipo: 'normal', texto: text }])
  })

  it('não reaplica a mesma ocorrência de um trecho repetido no texto', () => {
    const text = 'go go go'
    const errors = [
      { original: 'go', correction: 'went', category: 'tempo verbal' },
      { original: 'go', correction: 'gone', category: 'tempo verbal' }
    ]

    const chunks = buildChunks(text, errors)

    expect(chunks).toEqual([
      { tipo: 'erro', original: 'go', correction: 'went', category: 'tempo verbal' },
      { tipo: 'normal', texto: ' ' },
      { tipo: 'erro', original: 'go', correction: 'gone', category: 'tempo verbal' },
      { tipo: 'normal', texto: ' go' }
    ])
  })
})
