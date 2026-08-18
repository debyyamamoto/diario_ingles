import { describe, it, expect } from 'vitest'
import { buildInsights } from './Metrics.jsx'

function entry(errors, created_at) {
  return { errors, created_at }
}

describe('buildInsights', () => {
  it('lida com histórico vazio sem quebrar', () => {
    const insights = buildInsights([])

    expect(insights).toEqual({
      totalEntradas: 0,
      totalErros: 0,
      mediaErrosPorEntrada: 0,
      categoriasOrdenadas: [],
      categoriaTopo: undefined,
      errosRecorrentes: [],
      tendencia: null
    })
  })

  it('trata entradas sem o campo errors como sem erros', () => {
    const insights = buildInsights([{ created_at: '2026-01-01' }])

    expect(insights.totalEntradas).toBe(1)
    expect(insights.totalErros).toBe(0)
  })

  it('agrupa e ordena categorias da mais para a menos frequente', () => {
    const insights = buildInsights([
      entry(
        [
          { original: 'a', correction: 'a2', category: 'gramática' },
          { original: 'b', correction: 'b2', category: 'vocabulário' },
          { original: 'c', correction: 'c2', category: 'gramática' }
        ],
        '2026-01-01'
      )
    ])

    expect(insights.categoriasOrdenadas).toEqual([
      ['gramática', 2],
      ['vocabulário', 1]
    ])
    expect(insights.categoriaTopo).toBe('gramática')
  })

  it('usa "outro" para erros sem categoria', () => {
    const insights = buildInsights([entry([{ original: 'a', correction: 'a2' }], '2026-01-01')])

    expect(insights.categoriasOrdenadas).toEqual([['outro', 1]])
  })

  it('só considera recorrente um erro que aparece mais de uma vez, ignorando maiúsculas/espaços na comparação', () => {
    const insights = buildInsights([
      entry(
        [
          { original: ' She Like ', correction: 'She likes', category: 'gramática' },
          { original: 'she like', correction: 'she likes', category: 'gramática' },
          { original: 'unico', correction: 'único', category: 'vocabulário' }
        ],
        '2026-01-01'
      )
    ])

    expect(insights.errosRecorrentes).toHaveLength(1)
    expect(insights.errosRecorrentes[0]).toMatchObject({
      original: ' She Like ', // mantém os dados da primeira ocorrência dessa chave
      count: 2
    })
  })

  it('limita erros recorrentes aos 5 mais frequentes', () => {
    const errors = []
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < i + 2; j++) {
        errors.push({ original: `erro${i}`, correction: `certo${i}`, category: 'gramática' })
      }
    }

    const insights = buildInsights([entry(errors, '2026-01-01')])

    expect(insights.errosRecorrentes).toHaveLength(5)
    expect(insights.errosRecorrentes[0].original).toBe('erro5') // 7 ocorrências, o mais frequente
  })

  it('não calcula tendência com menos de 4 entradas', () => {
    const insights = buildInsights([
      entry([], '2026-01-01'),
      entry([], '2026-01-02'),
      entry([], '2026-01-03')
    ])

    expect(insights.tendencia).toBeNull()
  })

  it('calcula tendência comparando a metade mais antiga com a mais recente do histórico', () => {
    const insights = buildInsights([
      entry([{ category: 'a' }, { category: 'a' }], '2026-01-01'),
      entry([{ category: 'a' }, { category: 'a' }], '2026-01-02'),
      entry([{ category: 'a' }], '2026-01-03'),
      entry([{ category: 'a' }], '2026-01-04')
    ])

    expect(insights.tendencia).toEqual({ mediaAntiga: 2, mediaRecente: 1 })
  })

  it('ordena por created_at antes de dividir em metades, mesmo com o histórico fora de ordem', () => {
    const insights = buildInsights([
      entry([{ category: 'a' }], '2026-01-04'),
      entry([{ category: 'a' }, { category: 'a' }], '2026-01-01'),
      entry([{ category: 'a' }, { category: 'a' }], '2026-01-02'),
      entry([{ category: 'a' }], '2026-01-03')
    ])

    expect(insights.tendencia).toEqual({ mediaAntiga: 2, mediaRecente: 1 })
  })
})
