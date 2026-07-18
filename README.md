# Diário em Inglês 📔

App desktop (Electron + React) para escrever um diário em inglês e receber
correções de gramática e vocabulário via API da Anthropic (Claude).

## Fase 1 — o que já funciona
- Editor de texto simples
- Botão "Corrigir" que chama a IA e mostra correções categorizadas
- Histórico salvo localmente em SQLite

## Como rodar

1. Instale as dependências:
   ```
   npm install
   ```

2. Copie o arquivo de ambiente e coloque sua API key:
   ```
   cp .env.example .env
   ```
   Edite `.env` e cole sua chave do Google AI Studio (`GEMINI_API_KEY`).

3. Rode em modo desenvolvimento (abre o Vite + Electron juntos):
   ```
   npm run dev
   ```

## Arquitetura (resumo)

```
React (renderer)  --IPC-->  main.js (Node/Electron)  --HTTPS-->  API Anthropic
     ^                              |
     |                              v
     +------------------------  SQLite local
```

- `main.js`: processo principal. Único lugar que acessa a API key e o banco.
- `preload.js`: ponte seguinda entre main e renderer (contextBridge).
- `src/App.jsx`: interface React.
- `database/db.js`: persistência local com better-sqlite3.

A API key NUNCA fica exposta no código do renderer — toda chamada à IA
passa pelo main process.

## Próximas fases
- Diff visual (texto riscado vs corrigido)
- Ícone na bandeja do sistema + lembrete diário
- Dashboard de progresso (gráfico de erros por categoria)
- Empacotamento final com `electron-builder`
