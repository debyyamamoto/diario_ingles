# Diário em Inglês 📔

[![CI](https://github.com/debyyamamoto/diario_ingles/actions/workflows/ci.yml/badge.svg)](https://github.com/debyyamamoto/diario_ingles/actions/workflows/ci.yml)

App desktop (Electron + React) para escrever um diário em inglês e receber
correções de gramática e vocabulário via API do Google Gemini (versão gratuita).

## O que já funciona
- Editor de texto simples, com correção via IA em um clique
- Diff visual (trecho original riscado ao lado da correção)
- Erros categorizados (gramática, vocabulário, tempo verbal, preposição, artigo)
- Histórico salvo localmente em SQLite
- Aba de **Métricas**: erros mais frequentes por categoria, erros que se
  repetem, tendência de melhora e sugestão de estudo do dia com base no
  histórico
- Ícone na bandeja do sistema — fechar a janela só minimiza, o app continua
  disponível na barra de tarefas
- Lembrete periódico pra escrever — só notifica se ainda não houver entrada
  salva no dia (verifica o SQLite, não é um alarme cego)
- Início automático com o sistema, escondido na bandeja (Windows e macOS —
  não suportado nativamente no Linux)

## Instalação (usuário final)

Se você só quer usar o app (não vai mexer no código), não precisa instalar
Node, npm nem clonar o repositório:

1. Peça pra quem gerou o build o instalador da sua plataforma (`.exe` no
   Windows, `.dmg` no Mac, `.AppImage` no Linux) — ele é gerado pelo comando
   `npm run dist` e sai na pasta `release/`.
2. Rode o instalador e abra o app normalmente, como qualquer outro programa.
3. Na primeira abertura, cole sua API key gratuita do Google Gemini (veja o
   passo 3 abaixo). Pronto — o app já funciona, com histórico e métricas
   salvos localmente no seu computador.

## Como rodar (desenvolvimento)

1. Instale as dependências:
   ```
   npm install
   ```

2. Rode em modo desenvolvimento (abre o Vite + Electron juntos):
   ```
   npm run dev
   ```

3. Na primeira vez que o app abrir, ele vai pedir sua API key do Google
   Gemini (gratuita, em [aistudio.google.com/apikey](https://aistudio.google.com/apikey)).
   Cole a chave na tela de configuração — ela fica salva localmente (via
   `electron-store`, na pasta de dados do usuário) e não é versionada no
   git. Para trocar a chave depois, use o link "Trocar API key" no topo do
   app.

4. Rode os testes automatizados (Vitest) das funções puras — diff, métricas
   e o parser da resposta da IA:
   ```
   npm test
   ```

## Arquitetura (resumo)

```
React (renderer)  --IPC-->  main.js (Node/Electron)  --HTTPS-->  API Google Gemini
     ^                              |
     |                              v
     +------------------------  SQLite local
```

- `main.js`: processo principal. Único lugar que acessa a API key, o banco e
  a bandeja do sistema.
- `config.js`: modelo do Gemini e prompt do sistema usados na correção —
  centralizados aqui pra trocar sem mexer na lógica de IPC.
- `preload.js`: ponte segura entre main e renderer (contextBridge).
- `src/App.jsx`: interface React, com abas de Diário e Métricas.
- `src/components/`: `DiffViewer`, `ErrorList`, `Metrics` e `ApiKeySetup`
  (tela de configuração inicial da API key).
- `src/categoryColors.js` / `src/studyTips.js`: cores e dicas de estudo por
  categoria de erro, compartilhadas entre os componentes.
- `database/db.js`: persistência local com better-sqlite3.
- `assets/`: ícones do app e da bandeja.

A API key NUNCA fica exposta no código do renderer — toda chamada à IA
passa pelo main process.

## Próximos passos
- Início automático com o sistema no Linux (a API nativa do Electron não
  cobre essa plataforma — precisaria de uma lib tipo `auto-launch` ou
  gerenciar o `.desktop`/autostart manualmente)
- Empacotamento final com `electron-builder` (`npm run dist`)
