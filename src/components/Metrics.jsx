import { useEffect, useState } from 'react'
import { CORES_POR_CATEGORIA, COR_PADRAO } from '../categoryColors.js'
import { DICAS_POR_CATEGORIA, DICA_PADRAO } from '../studyTips.js'

// ============================================================
// Metrics
// Lê o histórico de entradas já salvo no banco local e calcula,
// tudo no cliente (sem chamar a IA de novo): frequência de erros
// por categoria, erros que se repetem e uma sugestão de estudo
// com base na categoria mais frequente.
// ============================================================

function buildInsights(entries) {
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
                  backgroundColor: CORES_POR_CATEGORIA[categoria] || COR_PADRAO
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
                <li key={i} style={{ borderLeft: `4px solid ${cor}` }}>
                  <span className="category-badge" style={{ backgroundColor: cor }}>
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
