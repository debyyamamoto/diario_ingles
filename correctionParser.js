// ============================================================
// CORRECTION PARSER
// Interpreta o texto cru devolvido pelo Gemini (JSON, às vezes
// envolto em markdown) e valida o formato com zod antes de deixar
// esse dado seguir pro renderer.
// Função pura — sem Electron — pra dar pra testar isolado.
// ============================================================

const { z } = require('zod')

const CorrectionResponseSchema = z.object({
  corrected_text: z.string(),
  errors: z.array(
    z.object({
      original: z.string(),
      correction: z.string(),
      category: z.string(),
      explanation: z.string()
    })
  )
})

const INVALID_RESPONSE_MESSAGE = 'A IA devolveu uma resposta em formato inesperado. Tente novamente.'

function parseCorrectionResponse(rawText) {
  // remove possíveis marcadores de código, caso o modelo adicione por engano
  const cleanJson = rawText.replace(/```json|```/g, '').trim()

  let parsedJson
  try {
    parsedJson = JSON.parse(cleanJson)
  } catch {
    throw new Error(INVALID_RESPONSE_MESSAGE)
  }

  const validation = CorrectionResponseSchema.safeParse(parsedJson)
  if (!validation.success) {
    throw new Error(INVALID_RESPONSE_MESSAGE)
  }

  return validation.data
}

module.exports = { parseCorrectionResponse, CorrectionResponseSchema, INVALID_RESPONSE_MESSAGE }