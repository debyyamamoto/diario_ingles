// ============================================================
// BANCO DE DADOS LOCAL (SQLite via better-sqlite3)
// Guarda o histórico de entradas do diário no computador do usuário.
// Fica na pasta de dados do app (userData), não dentro do projeto.
// ============================================================

const Database = require('better-sqlite3')
const path = require('path')
const { app } = require('electron')

// Em desenvolvimento, app.getPath pode não existir ainda dependendo da ordem de import,
// por isso resolvemos o caminho com um fallback simples.
const dbPath = app
  ? path.join(app.getPath('userData'), 'diario.db')
  : path.join(__dirname, 'diario.db')

const db = new Database(dbPath)

db.exec(`
  CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    corrected_text TEXT,
    errors_json TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )
`)

function saveEntry({ text, correctedText, errors }) {
  const stmt = db.prepare(`
    INSERT INTO entries (text, corrected_text, errors_json)
    VALUES (?, ?, ?)
  `)
  const info = stmt.run(text, correctedText, JSON.stringify(errors || []))
  return { id: info.lastInsertRowid }
}

function listEntries() {
  const rows = db.prepare(`SELECT * FROM entries ORDER BY created_at DESC`).all()
  return rows.map(row => ({
    ...row,
    errors: JSON.parse(row.errors_json || '[]')
  }))
}

module.exports = { saveEntry, listEntries }
