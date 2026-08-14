import { useState } from 'react'
import DiffViewer from './components/DiffViewer.jsx'
import ErrorList from './components/ErrorList.jsx'
import Metrics from './components/Metrics.jsx'
import appIcon from '../assets/icon.png'

export default function App() {
  const [view, setView] = useState('diario')
  const [text, setText] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleCorrect() {
    if (!text.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // Isso NÃO chama a API diretamente. Ele pede pro main process fazer isso
      // (window.electronAPI foi exposto pelo preload.js via contextBridge).
      const data = await window.electronAPI.correctText(text)
      setResult(data)

      // Salva a entrada já com a correção no histórico local
      await window.electronAPI.saveEntry({
        text,
        correctedText: data.corrected_text,
        errors: data.errors
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <header className="app-header">
        <img className="app-icon" src={appIcon} alt="" />
        <div>
          <h1>Diário em Inglês</h1>
          <p className="subtitle">Escreva livremente. A correção é só um clique.</p>
        </div>
      </header>

      <nav className="tabs">
        <button className={`tab ${view === 'diario' ? 'tab-active' : ''}`} onClick={() => setView('diario')}>
          Diário
        </button>
        <button className={`tab ${view === 'metricas' ? 'tab-active' : ''}`} onClick={() => setView('metricas')}>
          Métricas
        </button>
      </nav>

      {view === 'diario' ? (
        <>
          <div className="editor-card">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Today I woke up and..."
              rows={10}
            />

            <div className="actions">
              <button onClick={handleCorrect} disabled={loading}>
                {loading && <span className="spinner" />}
                {loading ? 'Corrigindo...' : 'Corrigir'}
              </button>
            </div>
          </div>

          {error && <p className="error">Erro: {error}</p>}

          {result && (
            <div className="result">
              <h2>Texto original com correções</h2>
              <DiffViewer text={text} errors={result.errors} />

              <h2>Erros encontrados ({result.errors.length})</h2>
              <ErrorList errors={result.errors} />
            </div>
          )}
        </>
      ) : (
        <Metrics />
      )}
    </div>
  )
}
