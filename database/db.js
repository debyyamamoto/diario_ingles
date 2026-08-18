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

// ============================================================
// MIGRAÇÕES
// Controladas pelo PRAGMA user_version (nativo do SQLite, começa em 0).
// Cada entrada roda uma vez só, na ordem, e nunca deve ser editada depois
// de publicada — pra adicionar uma coluna/tabela nova no futuro, adicione
// uma nova entrada no fim da lista com a próxima versão. Assim o banco de
// quem já usa o app é atualizado automaticamente, sem perder dados.
// ============================================================
const MIGRATIONS = [
  {
    version: 1,
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          text TEXT NOT NULL,
          corrected_text TEXT,
          errors_json TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        )
      `)
    }
  }
  // Exemplo de próxima migração:
  // {
  //   version: 2,
  //   up: (db) => db.exec(`ALTER TABLE entries ADD COLUMN favorite INTEGER DEFAULT 0`)
  // }
]

function migrate(db) {
  const currentVersion = db.pragma('user_version', { simple: true })
  const pendentes = MIGRATIONS.filter((m) => m.version > currentVersion).sort((a, b) => a.version - b.version)

  for (const migration of pendentes) {
    const runMigration = db.transaction(() => {
      migration.up(db)
      db.pragma(`user_version = ${migration.version}`)
    })
    runMigration()
  }
}

migrate(db)

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

// Usa a comparação de datas do próprio SQLite (date() extrai só o dia,
// ambos os lados em UTC) em vez de fazer isso em JS — evita a ambiguidade
// de fuso ao interpretar o formato "YYYY-MM-DD HH:MM:SS" que o SQLite guarda.
function hasEntryToday() {
  const row = db.prepare(`SELECT 1 FROM entries WHERE date(created_at) = date('now') LIMIT 1`).get()
  return !!row
}

module.exports = { saveEntry, listEntries, hasEntryToday }
