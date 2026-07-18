// ============================================================
// ErrorList
// Recebe a lista de erros e renderiza cada um com uma cor
// diferente conforme a categoria (gramática, vocabulário, etc).
// ============================================================

const CORES_POR_CATEGORIA = {
  'gramática': '#e03131',
  'vocabulário': '#1971c2',
  'tempo verbal': '#f08c00',
  'preposição': '#7048e8',
  'artigo': '#2f9e44',
  'pontuação': '#868e96'
}

// cor padrão caso a IA devolva uma categoria fora dessa lista
const COR_PADRAO = '#495057'

export default function ErrorList({ errors }) {
  if (!errors || errors.length === 0) {
    return <p className="no-errors">Nenhum erro encontrado. 🎉</p>
  }

  return (
    <ul className="error-list">
      {errors.map((error, i) => {
        const cor = CORES_POR_CATEGORIA[error.category] || COR_PADRAO

        return (
          <li key={i} style={{ borderLeft: `4px solid ${cor}` }}>
            <span className="category-badge" style={{ backgroundColor: cor }}>
              {error.category}
            </span>

            <div className="error-diff">
              <s>{error.original}</s> → <strong>{error.correction}</strong>
            </div>

            <p className="explanation">{error.explanation}</p>
          </li>
        )
      })}
    </ul>
  )
}
