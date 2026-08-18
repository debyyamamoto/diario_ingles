import { useState } from 'react'

export default function ApiKeySetup({ onSaved }) {
  const [apiKey, setApiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSave() {
    if (!apiKey.trim()) return
    setSaving(true)
    setError(null)

    try {
      await window.electronAPI.saveApiKey(apiKey)
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="setup-card">
      <h2>Configure sua API key</h2>
      <p className="setup-text">
        O app usa a API gratuita do Google Gemini para corrigir seu inglês.
        Pegue sua chave em{' '}
        <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
          aistudio.google.com/apikey
        </a>{' '}
        e cole abaixo. Ela fica salva só no seu computador.
      </p>

      <input
        type="password"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        placeholder="Cole sua API key aqui"
        autoFocus
      />

      {error && <p className="error">Erro: {error}</p>}

      <div className="actions">
        <button onClick={handleSave} disabled={saving || !apiKey.trim()}>
          {saving && <span className="spinner" />}
          {saving ? 'Salvando...' : 'Salvar e continuar'}
        </button>
      </div>
    </div>
  )
}
