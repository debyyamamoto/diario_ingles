import { useEffect, useMemo, useState } from 'react'
import { CORES_POR_CATEGORIA, COR_PADRAO } from '../categoryColors.js'
import { DICAS_POR_CATEGORIA, DICA_PADRAO } from '../studyTips.js'

// ============================================================
// Metrics
// Lê o histórico de entradas já salvo no banco local e calcula,
// tudo no cliente (sem chamar a IA de novo): frequência de erros
// por categoria, erros que se repetem e uma sugestão de estudo
// com base na categoria mais frequente.
// ============================================================

export function buildInsights(entries) {
  const totalEntradas = entries.length
  const todosErros = entries.flatMap((entrada) => entrada.errors || [])
  const totalErros = todosErros.length

  const porCategoria = {}
  for (const erro of todosErros) {
    const categoria = erro.category || 'outro'
    porCategoria[categoria] = (porCategoria[categoria] || 0) + 1
  }
  const categoriasOrdenadas = Object.entries(porCategoria).sort((a, b) => b[1] - a[1])
  const categoriaTopo = categoriasOrdenadas[0]?.[0]

  const porErroEspecifico = {}
  for (const erro of todosErros) {
    const chave = `${erro.original?.trim().toLowerCase()} → ${erro.correction?.trim().toLowerCase()}`
    if (!porErroEspecifico[chave]) {
      porErroEspecifico[chave] = { ...erro, count: 0 }
    }
    porErroEspecifico[chave].count += 1
  }
  const errosRecorrentes = Object.values(porErroEspecifico)
    .filter((erro) => erro.count > 1)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // compara a média de erros por entrada entre a metade mais antiga
  // e a mais recente do histórico, pra indicar se está melhorando
  let tendencia = null
  if (totalEntradas >= 4) {
    const ordenadas = [...entries].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    const meio = Math.floor(ordenadas.length / 2)
    const antigas = ordenadas.slice(0, meio)
    const recentes = ordenadas.slice(meio)
    const media = (lista) => lista.reduce((soma, e) => soma + (e.errors?.length || 0), 0) / lista.length
    tendencia = { mediaAntiga: media(antigas), mediaRecente: media(recentes) }
  }

  return {
    totalEntradas,
    totalErros,
    mediaErrosPorEntrada: totalEntradas ? totalErros / totalEntradas : 0,
    categoriasOrdenadas,
    categoriaTopo,
    errosRecorrentes,
    tendencia
  }
}

// ============================================================
// Barrinha de frequência — heatmap de dias com entrada, últimos ~6 meses.
// Elemento de assinatura do redesign: o resto da UI fica quieto ao redor
// dele. Inspirado no gráfico de contribuições do GitHub, mas com
// intensidade baseada em quantidade de entradas/palavras do dia, não commits.
// ============================================================

const HEATMAP_SEMANAS = 26
const DIAS_SEMANA_LABEL = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const MESES_LABEL = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function toDateKey(date) {
  const d = startOfDay(date)
  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

function contarPalavras(texto) {
  return texto?.trim() ? texto.trim().split(/\s+/).length : 0
}

function nivelDeIntensidade(entradas, palavras) {
  if (entradas === 0) return 0
  if (entradas >= 3 || palavras >= 300) return 4
  if (entradas === 2 || palavras >= 150) return 3
  if (palavras >= 60) return 2
  return 1
}

// Monta uma matriz de semanas × dias (colunas × 7 linhas), alinhada em
// semanas completas (domingo a sábado) terminando hoje. Dias futuros na
// última semana viram `null` (célula vazia, não renderiza).
export function buildHeatmap(entries, { semanas = HEATMAP_SEMANAS, hoje = new Date() } = {}) {
  const porDia = {}
  for (const entrada of entries) {
    if (!entrada.created_at) continue
    const chave = toDateKey(entrada.created_at)
    if (!porDia[chave]) porDia[chave] = { entradas: 0, palavras: 0 }
    porDia[chave].entradas += 1
    porDia[chave].palavras += contarPalavras(entrada.text)
  }

  const fim = startOfDay(hoje)
  const inicio = new Date(fim)
  inicio.setDate(inicio.getDate() - fim.getDay() - (semanas - 1) * 7)

  const colunas = []
  for (let semana = 0; semana < semanas; semana++) {
    const dias = []
    for (let diaSemana = 0; diaSemana < 7; diaSemana++) {
      const data = new Date(inicio)
      data.setDate(data.getDate() + semana * 7 + diaSemana)

      if (data > fim) {
        dias.push(null)
        continue
      }

      const chave = toDateKey(data)
      const info = porDia[chave] || { entradas: 0, palavras: 0 }
      dias.push({
        data: chave,
        mes: data.getMonth(),
        entradas: info.entradas,
        palavras: info.palavras,
        nivel: nivelDeIntensidade(info.entradas, info.palavras)
      })
    }
    colunas.push(dias)
  }

  return colunas
}

// Um rótulo por coluna: só marca a primeira coluna de cada mês novo.
function rotulosDosMeses(colunas) {
  let mesAnterior = null
  return colunas.map((dias) => {
    const primeiroDiaValido = dias.find(Boolean)
    if (!primeiroDiaValido || primeiroDiaValido.mes === mesAnterior) return ''
    mesAnterior = primeiroDiaValido.mes
    return MESES_LABEL[primeiroDiaValido.mes]
  })
}

function FrequencyHeatmap({ entries }) {
  const colunas = useMemo(() => buildHeatmap(entries), [entries])
  const rotulosMeses = useMemo(() => rotulosDosMeses(colunas), [colunas])
  const diasComEntrada = useMemo(
    () => colunas.flat().filter((dia) => dia && dia.entradas > 0).length,
    [colunas]
  )

  return (
    <div className="heatmap-card">
      <p className="visually-hidden">
        Mapa de frequência de escrita nas últimas {HEATMAP_SEMANAS} semanas: {diasComEntrada} dias com pelo menos
        uma entrada.
      </p>

      <div className="heatmap-months" aria-hidden="true">
        {rotulosMeses.map((mes, i) => (
          <span key={i}>{mes}</span>
        ))}
      </div>

      <div className="heatmap-body">
        <div className="heatmap-weekday-labels" aria-hidden="true">
          {DIAS_SEMANA_LABEL.map((label, i) => (
            <span key={label}>{i % 2 === 1 ? label : ''}</span>
          ))}
        </div>

        <div className="heatmap-grid" aria-hidden="true">
          {colunas.map((dias, semana) =>
            dias.map((dia, diaSemana) =>
              dia ? (
                <div
                  key={`${semana}-${diaSemana}`}
                  className="heatmap-cell"
                  data-level={dia.nivel}
                  title={`${dia.data} — ${dia.entradas} entrada${dia.entradas === 1 ? '' : 's'}, ${dia.palavras} palavra${dia.palavras === 1 ? '' : 's'}`}
                />
              ) : (
                <div key={`${semana}-${diaSemana}`} className="heatmap-cell is-empty" />
              )
            )
          )}
        </div>
      </div>

      <div className="heatmap-legend" aria-hidden="true">
        <span>menos</span>
        {[0, 1, 2, 3, 4].map((nivel) => (
          <span key={nivel} className="heatmap-legend-swatch" data-level={nivel} />
        ))}
        <span>mais</span>
      </div>
    </div>
  )
}

export default function Metrics() {
  const [entries, setEntries] = useState(null)

  useEffect(() => {
    window.electronAPI.listEntries().then(setEntries)
  }, [])

  if (entries === null) {
    return <p className="subtitle">Carregando métricas...</p>
  }

  if (entries.length === 0) {
    return <p className="subtitle">Escreva sua primeira entrada para começar a ver métricas aqui.</p>
  }

  const insights = buildInsights(entries)
  const maiorFrequencia = insights.categoriasOrdenadas[0]?.[1] || 1

  return (
    <div className="metrics">
      <div className="stat-row">
        <div className="stat-card">
          <span className="stat-value">{insights.totalEntradas}</span>
          <span className="stat-label">entradas escritas</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{insights.totalErros}</span>
          <span className="stat-label">erros corrigidos</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{insights.mediaErrosPorEntrada.toFixed(1)}</span>
          <span className="stat-label">erros por entrada</span>
        </div>
      </div>

      <h2>Sua frequência de escrita</h2>
      <FrequencyHeatmap entries={entries} />

      {insights.tendencia && (
        <div className={`trend-card ${insights.tendencia.mediaRecente > insights.tendencia.mediaAntiga ? 'trend-warn' : 'trend-good'}`}>
          {insights.tendencia.mediaRecente < insights.tendencia.mediaAntiga
            ? `Você está errando menos: a média caiu de ${insights.tendencia.mediaAntiga.toFixed(1)} para ${insights.tendencia.mediaRecente.toFixed(1)} erros por entrada. 🎉`
            : insights.tendencia.mediaRecente === insights.tendencia.mediaAntiga
              ? 'Sua taxa de erros está estável nas últimas entradas.'
              : `Suas entradas recentes tiveram mais erros (${insights.tendencia.mediaRecente.toFixed(1)} vs ${insights.tendencia.mediaAntiga.toFixed(1)} antes) — talvez esteja arriscando frases mais complexas, o que também é ótimo pro aprendizado.`}
        </div>
      )}

      <h2>Erros mais frequentes por categoria</h2>
      <div className="category-bars">
        {insights.categoriasOrdenadas.map(([categoria, count]) => (
          <div className="category-bar-row" key={categoria}>
            <span className="category-bar-label">{categoria}</span>
            <div className="category-bar-track">
              <div
                className="category-bar-fill"
                style={{
                  width: `${(count / maiorFrequencia) * 100}%`,
                  backgroundColor: (CORES_POR_CATEGORIA[categoria] || COR_PADRAO).deep
                }}
              />
            </div>
            <span className="category-bar-count">{count}</span>
          </div>
        ))}
      </div>

      {insights.errosRecorrentes.length > 0 && (
        <>
          <h2>Erros que se repetem</h2>
          <ul className="error-list">
            {insights.errosRecorrentes.map((erro, i) => {
              const cor = CORES_POR_CATEGORIA[erro.category] || COR_PADRAO
              return (
                <li key={i} style={{ borderLeft: `4px solid ${cor.deep}` }}>
                  <span className="category-badge" style={{ backgroundColor: cor.soft }}>
                    {erro.category} · {erro.count}x
                  </span>
                  <div className="error-diff">
                    <s>{erro.original}</s> → <strong>{erro.correction}</strong>
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}

      <h2>Sugestão de estudo pra hoje</h2>
      <div className="suggestion-card">
        {insights.categoriaTopo ? (DICAS_POR_CATEGORIA[insights.categoriaTopo] || DICA_PADRAO) : DICA_PADRAO}
      </div>
    </div>
  )
}
