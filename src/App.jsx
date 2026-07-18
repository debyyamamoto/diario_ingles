import { useState } from 'react'
import DiffViewer from './components/DiffViewer.jsx'
import ErrorList from './components/ErrorList.jsx'

export default function App() {
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
      <h1>📔 Diário em Inglês</h1>
      <p className="subtitle">Escreva livremente. A correção é só um clique.</p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Today I woke up and..."
        rows={10}
      />

      <button onClick={handleCorrect} disabled={loading}>
        {loading ? 'Corrigindo...' : 'Corrigir'}
      </button>

      {error && <p className="error">Erro: {error}</p>}

      {result && (
        <div className="result">
          <h2>Texto original com correções</h2>
          <DiffViewer text={text} errors={result.errors} />

          <h2>Erros encontrados ({result.errors.length})</h2>
          <ErrorList errors={result.errors} />
        </div>
      )}
    </div>
  )
}
