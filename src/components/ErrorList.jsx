// ============================================================
// ErrorList
// Recebe a lista de erros e renderiza cada um com uma cor
// diferente conforme a categoria (gramática, vocabulário, etc).
// ============================================================

import { CORES_POR_CATEGORIA, COR_PADRAO } from '../categoryColors.js'

export default function ErrorList({ errors }) {
  if (!errors || errors.length === 0) {
    return <p className="no-errors">Nenhum erro encontrado. 🎉</p>
  }

  return (
    <ul className="error-list">
      {errors.map((error, i) => {
        const cor = CORES_POR_CATEGORIA[error.category] || COR_PADRAO

        return (
          <li key={i} style={{ borderLeft: `4px solid ${cor.deep}` }}>
            <span className="category-badge" style={{ backgroundColor: cor.soft }}>
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
