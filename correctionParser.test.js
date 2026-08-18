const { describe, it, expect } = require('vitest')
const { parseCorrectionResponse, INVALID_RESPONSE_MESSAGE } = require('./correctionParser.js')

describe('parseCorrectionResponse', () => {
  const validPayload = {
    corrected_text: 'I went to the store yesterday.',
    errors: [
      {
        original: 'I go',
        correction: 'I went',
        category: 'tempo verbal',
        explanation: 'Uso do passado para uma ação já concluída.'
      }
    ]
  }

  it('aceita JSON puro', () => {
    const result = parseCorrectionResponse(JSON.stringify(validPayload))
    expect(result).toEqual(validPayload)
  })

  it('remove marcadores de markdown (```json ... ```) antes de parsear', () => {
    const wrapped = '```json\n' + JSON.stringify(validPayload) + '\n```'
    const result = parseCorrectionResponse(wrapped)
    expect(result).toEqual(validPayload)
  })

  it('aceita lista de erros vazia (texto sem erros)', () => {
    const payload = { corrected_text: 'All good.', errors: [] }
    const result = parseCorrectionResponse(JSON.stringify(payload))
    expect(result).toEqual(payload)
  })

  it('remove campos extras não previstos no schema', () => {
    const withExtra = { ...validPayload, confidence: 0.98 }
    const result = parseCorrectionResponse(JSON.stringify(withExtra))
    expect(result).not.toHaveProperty('confidence')
    expect(result).toEqual(validPayload)
  })

  it('lança erro amigável quando o JSON está malformado (sintaxe quebrada)', () => {
    const broken = '{ "corrected_text": "oops", "errors": [ '
    expect(() => parseCorrectionResponse(broken)).toThrow(INVALID_RESPONSE_MESSAGE)
  })

  it('lança erro amigável quando falta um campo obrigatório', () => {
    const missingErrors = JSON.stringify({ corrected_text: 'texto' })
    expect(() => parseCorrectionResponse(missingErrors)).toThrow(INVALID_RESPONSE_MESSAGE)
  })

  it('lança erro amigável quando um erro da lista está incompleto', () => {
    const incompleteError = JSON.stringify({
      corrected_text: 'texto',
      errors: [{ original: 'a', correction: 'b' }] // faltam category e explanation
    })
    expect(() => parseCorrectionResponse(incompleteError)).toThrow(INVALID_RESPONSE_MESSAGE)
  })

  it('lança erro amigável quando "errors" não é uma lista', () => {
    const wrongType = JSON.stringify({ corrected_text: 'texto', errors: 'nenhum' })
    expect(() => parseCorrectionResponse(wrongType)).toThrow(INVALID_RESPONSE_MESSAGE)
  })
})
