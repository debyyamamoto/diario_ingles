// ============================================================
// Cores por categoria de erro, compartilhadas entre ErrorList e Metrics.
// Cada categoria tem um tom "deep" (bordas, barras — precisa de contraste
// com --color-ink) e um "soft" (fundo do badge — precisa de contraste com
// texto --color-ink). Os valores em si são só variáveis CSS: as cores de
// verdade vêm dos tokens derivados em src/styles.css.
// ============================================================

export const CORES_POR_CATEGORIA = {
  'gramática': { deep: 'var(--category-gramatica)', soft: 'var(--category-gramatica-soft)' },
  'vocabulário': { deep: 'var(--category-vocabulario)', soft: 'var(--category-vocabulario-soft)' },
  'tempo verbal': { deep: 'var(--category-tempo-verbal)', soft: 'var(--category-tempo-verbal-soft)' },
  'preposição': { deep: 'var(--category-preposicao)', soft: 'var(--category-preposicao-soft)' },
  'artigo': { deep: 'var(--category-artigo)', soft: 'var(--category-artigo-soft)' }
}

// cor padrão caso a IA devolva uma categoria fora dessa lista
export const COR_PADRAO = { deep: 'var(--category-outro)', soft: 'var(--category-outro-soft)' }
