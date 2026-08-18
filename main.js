// ============================================================
// MAIN PROCESS
// Este arquivo roda em Node.js puro (sem interface).
// É o único lugar que pode: abrir janelas, acessar arquivos,
// e guardar a API key com segurança.
// ============================================================

const { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage, safeStorage } = require('electron')
const path = require('path')
const Store = require('electron-store')

const db = require('./database/db')
const {
  GoogleGenerativeAI,
  GoogleGenerativeAIFetchError,
  GoogleGenerativeAIAbortError
} = require('@google/generative-ai')
const { GEMINI_MODEL, CORRECTION_SYSTEM_PROMPT } = require('./config')
const { parseCorrectionResponse } = require('./correctionParser')

// Guarda configs em JSON na pasta de dados do usuário. A API key nunca fica
// em texto puro nesse arquivo: é criptografada com o safeStorage do Electron
// (usa o keychain/DPAPI/keyring do próprio SO) antes de ir pro disco.
const store = new Store()

function getApiKey() {
  const encoded = store.get('geminiApiKeyEncrypted')
  if (!encoded) return null
  return safeStorage.decryptString(Buffer.from(encoded, 'base64'))
}

function saveApiKey(apiKey) {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('A criptografia do sistema operacional não está disponível neste computador.')
  }
  const encrypted = safeStorage.encryptString(apiKey.trim())
  store.set('geminiApiKeyEncrypted', encrypted.toString('base64'))
}

const isDev = process.env.NODE_ENV === 'development'
const iconPath = path.join(__dirname, 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png')
const trayIconPath = path.join(__dirname, 'assets', 'tray.png')
const { Notification } = require('electron')

let mainWindow
let tray
let isQuitting = false

function createWindow() {
  // Quando o app abre sozinho no login do sistema, ele deve subir escondido
  // (só na bandeja) — não faz sentido estourar uma janela na cara da pessoa
  // assim que o computador liga.
  const abertoEscondidoNoLogin =
    process.platform === 'win32'
      ? process.argv.includes('--hidden')
      : app.getLoginItemSettings().wasOpenedAsHidden

  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    icon: iconPath,
    resizable: false,
    autoHideMenuBar: true,
    menuBarVisible: false,
    show: !abertoEscondidoNoLogin,
    webPreferences: {
      // preload.js é a "ponte" segura entre este processo e o React
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, // segurança: renderer não acessa Node diretamente
      nodeIntegration: false  // segurança: nunca true em produção
    }
  })

  mainWindow.setMenu(null)

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'))
  }

  // Fechar a janela só minimiza: o app continua rodando em segundo plano,
  // mas a janela minimizada ainda aparece na barra de tarefas (diferente de
  // escondê-la, que a tira completamente da tela e do Alt+Tab).
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      // Avisa o renderer pra limpar o estado da sessão (rascunho não salvo,
      // resultado de correção em tela) antes de minimizar — só o clique no
      // X passa por aqui; o botão nativo de minimizar não dispara 'close'.
      mainWindow.webContents.send('app:reset-editor')
      mainWindow.minimize()
    }
  })
}

function createTray() {
  tray = new Tray(nativeImage.createFromPath(trayIconPath))
  tray.setToolTip('Diário em Inglês')

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Abrir', click: () => showWindow() },
    { type: 'separator' },
    { label: 'Sair', click: () => { isQuitting = true; app.quit() } }
  ])
  tray.setContextMenu(contextMenu)
  tray.on('click', () => showWindow())
}

function showWindow() {
  if (!mainWindow) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

// Registra o app pra abrir sozinho com o sistema, escondido na bandeja
// (com base na API nativa do Electron — sem suportado no Linux, então
// nesse caso a pessoa continua abrindo o app manualmente).
function configurarInicioAutomatico() {
  if (isDev) return
  if (process.platform !== 'win32' && process.platform !== 'darwin') return

  app.setLoginItemSettings({
    openAtLogin: true,
    openAsHidden: true, // usado no macOS
    args: ['--hidden'] // usado no Windows (lido em createWindow)
  })
}

app.whenReady().then(() => {
  // No Linux sem keyring de sessão configurado (comum em WSL, containers e
  // distros minimalistas), o safeStorage não acha um backend real e
  // isEncryptionAvailable() vem false. Esse é o fallback documentado pelo
  // próprio Electron: passa a usar uma chave fixa em vez de recusar tudo.
  // Ainda funciona (a chave persiste entre reinícios), só não é
  // criptografia de verdade nesses ambientes — é um trade-off aceitável
  // pra um app local sem keyring, mas nunca é o caminho no Windows/macOS.
  if (process.platform === 'linux' && !safeStorage.isEncryptionAvailable()) {
    safeStorage.setUsePlainTextEncryption(true)
  }

  // Remove a barra de menu padrão (File/Edit/View/...) do Electron
  Menu.setApplicationMenu(null)

  createWindow()
  createTray()
  configurarInicioAutomatico()
  iniciarLembretes()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
    else showWindow()
  })
})

app.on('before-quit', () => {
  isQuitting = true
})

// A janela só minimiza em vez de fechar, então o app não deve encerrar
// quando ela é "fechada" — só quando o usuário escolhe "Sair" no tray.
app.on('window-all-closed', () => {})

// ============================================================
// IPC HANDLERS
// O React (renderer) nunca fala com a API ou o banco diretamente.
// Ele "pede" através do IPC, e o main process executa.
// ============================================================

// 1. Salvar uma entrada do diário no banco local
ipcMain.handle('diary:save', (event, { text, correctedText, errors }) => {
  return db.saveEntry({ text, correctedText, errors })
})

// 2. Buscar todas as entradas salvas (histórico)
ipcMain.handle('diary:list', () => {
  return db.listEntries()
})

// 2b. Configuração: API key do Gemini (guardada localmente e criptografada)
ipcMain.handle('settings:getApiKey', () => {
  return getApiKey()
})

ipcMain.handle('settings:saveApiKey', (event, apiKey) => {
  saveApiKey(apiKey)
  return true
})

const CORRECTION_TIMEOUT_MS = 20 * 1000
const MAX_NETWORK_RETRIES = 2 // total: 1 tentativa original + até 2 retries

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Status HTTP que costumam ser sobrecarga temporária do lado do Google
// (o próprio texto do erro 503 diz "usually temporary") — vale tentar de
// novo. 429 (rate limit) é tratado à parte, não entra aqui.
const OVERLOAD_STATUS_CODES = [500, 502, 503, 504]

function isRetryable(err) {
  if (err instanceof GoogleGenerativeAIFetchError) {
    return OVERLOAD_STATUS_CODES.includes(err.status)
  }
  // erro sem resposta HTTP (DNS, conexão recusada) — também vale tentar
  return true
}

// Chama o Gemini com timeout e retry (falha de rede ou sobrecarga
// temporária do serviço — erro com resposta HTTP diferente disso, como
// 429, não é retentado aqui).
async function requestCorrectionFromGemini(apiKey, text) {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel(
    {
      model: GEMINI_MODEL,
      systemInstruction: CORRECTION_SYSTEM_PROMPT,
      generationConfig: { responseMimeType: 'application/json' }
    },
    { timeout: CORRECTION_TIMEOUT_MS }
  )

  for (let attempt = 0; attempt <= MAX_NETWORK_RETRIES; attempt++) {
    try {
      const result = await model.generateContent(text)
      return result.response.text()
    } catch (err) {
      if (err instanceof GoogleGenerativeAIFetchError && err.status === 429) {
        throw new Error('Muitas correções seguidas, espere um minuto.')
      }

      const isLastAttempt = attempt === MAX_NETWORK_RETRIES
      if (!isRetryable(err) || isLastAttempt) throw err

      await wait(500 * (attempt + 1))
    }
  }
}

// 3. Pedir correção de texto para a API do Google Gemini (versão gratuita)
ipcMain.handle('diary:correct', async (event, text) => {
  const apiKey = getApiKey()

  if (!apiKey) {
    throw new Error('API key não configurada. Abra as configurações e cole sua chave do Google AI Studio.')
  }

  let rawText
  try {
    rawText = await requestCorrectionFromGemini(apiKey, text)
  } catch (err) {
    // A mensagem que chega no renderer é sempre genérica — sem isso, o
    // motivo real do erro (status HTTP, corpo da resposta) some por
    // completo e fica impossível diagnosticar o que aconteceu.
    console.error('[diary:correct] falha ao chamar o Gemini:', err)

    if (err instanceof GoogleGenerativeAIAbortError) {
      throw new Error('A correção demorou demais e foi cancelada. Verifique sua internet e tente de novo.')
    }
    if (err.message === 'Muitas correções seguidas, espere um minuto.') throw err

    if (err instanceof GoogleGenerativeAIFetchError) {
      if (OVERLOAD_STATUS_CODES.includes(err.status)) {
        throw new Error('O serviço de IA está sobrecarregado no momento. Tente novamente em alguns instantes.')
      }
      if ([400, 401, 403].includes(err.status)) {
        throw new Error('A API key parece inválida ou sem permissão. Confira a chave nas configurações.')
      }
      if (err.status === 404) {
        throw new Error('O modelo de IA configurado não foi encontrado (avise quem mantém o app).')
      }
    }

    throw new Error('Não foi possível falar com a IA agora. Verifique sua internet e tente de novo.')
  }

  return parseCorrectionResponse(rawText)
})

const INTERVALO_LEMBRETE_MS = 3 * 60 * 60 * 1000 // 3 horas, ajuste como quiser

function mostrarLembrete() {
  if (!Notification.isSupported()) return
  if (db.hasEntryToday()) return // já escreveu hoje — não incomoda de novo

  const notification = new Notification({
    title: 'Diário em Inglês 📔',
    body: 'Que tal escrever 3 linhas em inglês agora?',
    silent: false
  })

  notification.on('click', () => showWindow())
  notification.show()
}

function iniciarLembretes() {
  setInterval(mostrarLembrete, INTERVALO_LEMBRETE_MS)
}