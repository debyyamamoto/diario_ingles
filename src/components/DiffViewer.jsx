import { useMemo } from 'react'

// ============================================================
// DiffViewer
// Recebe o texto original e a lista de erros ({original, correction, ...})
// e monta uma lista de "pedaços" (chunks) pra renderizar:
// - pedaços normais (texto sem erro)
// - pedaços de erro (riscado + correção)
// ============================================================

function buildChunks(text, errors) {
  // 1. Descobrir a posição de cada erro dentro do texto,
  //    sempre buscando a partir de onde a busca anterior parou
  //    (evita pegar a ocorrência errada quando o mesmo trecho se repete)
  let cursorBusca = 0
  const errosComPosicao = []

  for (const error of errors) {
    const posicao = text.indexOf(error.original, cursorBusca)

    if (posicao === -1) {
      // Não achou esse trecho no texto (a IA pode ter reformatado algo).
      // Ignoramos o highlight, mas o erro ainda aparece na lista categorizada.
      continue
    }

    errosComPosicao.push({ ...error, posicao })
    cursorBusca = posicao + error.original.length
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

    // pedaço do erro
    chunks.push({
      tipo: 'erro',
      original: error.original,
      correction: error.correction,
      category: error.category
    })

    cursor = error.posicao + error.original.length
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
