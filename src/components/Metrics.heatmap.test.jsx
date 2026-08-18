import { describe, it, expect } from 'vitest'
import { buildHeatmap } from './Metrics.jsx'

// quarta-feira — fixo pra deixar o grid determinístico nos testes
const hoje = new Date(2026, 7, 19)

describe('buildHeatmap', () => {
  it('gera uma coluna por semana, com 7 células cada', () => {
    const colunas = buildHeatmap([], { semanas: 3, hoje })
    expect(colunas).toHaveLength(3)
    colunas.forEach((dias) => expect(dias).toHaveLength(7))
  })

  it('marca como null os dias futuros da última semana (depois de "hoje")', () => {
    const colunas = buildHeatmap([], { semanas: 1, hoje })
    const [domingo, , , quarta, quinta, sexta, sabado] = colunas[0]

    expect(domingo).not.toBeNull()
    expect(quarta).not.toBeNull() // é "hoje", deve entrar
    expect(quinta).toBeNull()
    expect(sexta).toBeNull()
    expect(sabado).toBeNull()
  })

  it('nível 0 pra dia sem nenhuma entrada', () => {
    const colunas = buildHeatmap([], { semanas: 1, hoje })
    expect(colunas[0][3].nivel).toBe(0) // quarta = hoje, sem entradas
  })

  it('nível 1 pra dia com uma entrada curta', () => {
    const entries = [{ created_at: new Date(2026, 7, 17, 9, 0), text: 'I go home' }]
    const colunas = buildHeatmap(entries, { semanas: 1, hoje })
    const segunda = colunas[0][1]

    expect(segunda.data).toBe('2026-08-17')
    expect(segunda.entradas).toBe(1)
    expect(segunda.nivel).toBe(1)
  })

  it('nível 3 pra dia com duas entradas, independente da quantidade de palavras', () => {
    const entries = [
      { created_at: new Date(2026, 7, 18, 8, 0), text: 'a b c' },
      { created_at: new Date(2026, 7, 18, 20, 0), text: 'd e f' }
    ]
    const colunas = buildHeatmap(entries, { semanas: 1, hoje })
    const terca = colunas[0][2]

    expect(terca.entradas).toBe(2)
    expect(terca.nivel).toBe(3)
  })

  it('nível 4 pra dia com três ou mais entradas', () => {
    const entries = [
      { created_at: new Date(2026, 7, 19, 8, 0), text: 'a' },
      { created_at: new Date(2026, 7, 19, 12, 0), text: 'b' },
      { created_at: new Date(2026, 7, 19, 20, 0), text: 'c' }
    ]
    const colunas = buildHeatmap(entries, { semanas: 1, hoje })
    const quarta = colunas[0][3]

    expect(quarta.entradas).toBe(3)
    expect(quarta.nivel).toBe(4)
  })

  it('uma única entrada longa (60+ palavras) também sobe o nível, mesmo sozinha', () => {
    const textoLongo = new Array(80).fill('palavra').join(' ')
    const entries = [{ created_at: new Date(2026, 7, 16, 9, 0), text: textoLongo }]
    const colunas = buildHeatmap(entries, { semanas: 1, hoje })
    const domingo = colunas[0][0]

    expect(domingo.entradas).toBe(1)
    expect(domingo.palavras).toBe(80)
    expect(domingo.nivel).toBe(2)
  })

  it('ignora entradas sem created_at', () => {
    const entries = [{ text: 'sem data' }]
    const colunas = buildHeatmap(entries, { semanas: 1, hoje })
    const totalEntradas = colunas[0].filter(Boolean).reduce((soma, dia) => soma + dia.entradas, 0)

    expect(totalEntradas).toBe(0)
  })
})
