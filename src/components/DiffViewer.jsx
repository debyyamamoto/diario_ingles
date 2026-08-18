import { useMemo } from 'react'

// ============================================================
// DiffViewer
// Recebe o texto original e a lista de erros ({original, correction, ...})
// e monta uma lista de "pedaços" (chunks) pra renderizar:
// - pedaços normais (texto sem erro)
// - pedaços de erro (riscado + correção)
// ============================================================

export function buildChunks(text, errors) {
  // 1. Descobrir a posição de cada erro dentro do texto,
  //    sempre buscando a partir de onde a busca anterior parou
  //    (evita pegar a ocorrência errada quando o mesmo trecho se repete).
  //    A busca ignora maiúsculas/minúsculas e espaços nas pontas do trecho:
  //    a IA às vezes devolve "original" com capitalização ou espaçamento
  //    levemente diferente do texto do usuário, e o indexOf exato falhava
  //    silenciosamente nesses casos (o erro ficava fora do highlight).
  const textoNormalizado = text.toLowerCase()
  let cursorBusca = 0
  const errosComPosicao = []

  for (const error of errors) {
    const original = error.original?.trim()
    if (!original) continue

    const posicao = textoNormalizado.indexOf(original.toLowerCase(), cursorBusca)

    if (posicao === -1) {
      // Não achou esse trecho no texto (a IA pode ter reformatado algo).
      // Ignoramos o highlight, mas o erro ainda aparece na lista categorizada.
      continue
    }

    errosComPosicao.push({ ...error, posicao, tamanho: original.length })
    cursorBusca = posicao + original.length
  }

  // 2. Ordenar pela posição real no texto (a IA pode devolver fora de ordem)
  errosComPosicao.sort((a, b) => a.posicao - b.posicao)

  // 3. Montar os chunks percorrendo o texto do início ao fim
  const chunks = []
  let cursor = 0

  for (const error of errosComPosicao) {
    // ignora erros que se sobrepõem a um trecho já consumido
    if (error.posicao < cursor) continue

    // pedaço normal antes do erro
    if (error.posicao > cursor) {
      chunks.push({ tipo: 'normal', texto: text.slice(cursor, error.posicao) })
    }

    // pedaço do erro — usa o trecho tal como está no texto do usuário
    // (preserva a capitalização real), não a versão que a IA devolveu
    chunks.push({
      tipo: 'erro',
      original: text.slice(error.posicao, error.posicao + error.tamanho),
      correction: error.correction,
      category: error.category
    })

    cursor = error.posicao + error.tamanho
  }

  // 4. o que sobrou depois do último erro
  if (cursor < text.length) {
    chunks.push({ tipo: 'normal', texto: text.slice(cursor) })
  }

  return chunks
}

export default function DiffViewer({ text, errors }) {
  // useMemo evita recalcular os chunks a cada render se text/errors não mudaram
  const chunks = useMemo(() => buildChunks(text, errors), [text, errors])

  return (
    <div className="diff-viewer">
      {chunks.map((chunk, i) =>
        chunk.tipo === 'normal' ? (
          <span key={i}>{chunk.texto}</span>
        ) : (
          <span key={i} className="diff-error" data-category={chunk.category}>
            <s className="diff-original">{chunk.original}</s>{' '}
            <strong className="diff-correction">{chunk.correction}</strong>
          </span>
        )
      )}
    </div>
  )
}
