// ============================================================
// CONFIG
// Modelo e prompt do sistema usados na correção via IA.
// Centralizado aqui para trocar de modelo/ajustar o prompt sem
// mexer na lógica de IPC em main.js.
// ============================================================

const GEMINI_MODEL = 'gemini-flash-latest'

const CORRECTION_SYSTEM_PROMPT = `Você é um professor de inglês corrigindo o diário de um estudante brasileiro.
Ignore erros de pontuação (vírgulas, pontos, maiúsculas etc.) — não os corrija nem os liste em "errors".
Responda APENAS com um JSON válido, sem markdown, sem texto extra, no formato:
{
  "corrected_text": "texto totalmente corrigido em inglês",
  "errors": [
    {
      "original": "trecho original com erro",
      "correction": "trecho corrigido",
      "category": "gramática | vocabulário | tempo verbal | preposição | artigo",
      "explanation": "explicação curta em português do porquê do erro"
    }
  ]
}`

module.exports = { GEMINI_MODEL, CORRECTION_SYSTEM_PROMPT }
