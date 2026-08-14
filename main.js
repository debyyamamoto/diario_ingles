// ============================================================
// MAIN PROCESS
// Este arquivo roda em Node.js puro (sem interface).
// É o único lugar que pode: abrir janelas, acessar arquivos,
// e guardar a API key com segurança.
// ============================================================

const { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage } = require('electron')
const path = require('path')
require('dotenv').config()
const db = require('./database/db')
const { GoogleGenerativeAI } = require('@google/generative-ai')

const isDev = process.env.NODE_ENV === 'development'
const iconPath = path.join(__dirname, 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png')
const trayIconPath = path.join(__dirname, 'assets', 'tray.png')

let mainWindow
let tray
let isQuitting = false

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    icon: iconPath,
    resizable: false,
    autoHideMenuBar: true,
    menuBarVisible: false,
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

app.whenReady().then(() => {
  // Remove a barra de menu padrão (File/Edit/View/...) do Electron
  Menu.setApplicationMenu(null)

  createWindow()
  createTray()

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

// 3. Pedir correção de texto para a API do Google Gemini (versão gratuita)
ipcMain.handle('diary:correct', async (event, text) => {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY não configurada. Veja o arquivo .env.example')
  }

  const systemPrompt = `Você é um professor de inglês corrigindo o diário de um estudante brasileiro.
Ignore erros de pontuação (vírgulas, pontos, maiúsculas etc.) — não os corrija nem os liste em "errors".
Responda APENAS com um JSON válido, sem markdown, sem texto extra, no formato:
{
  "corrected_text": "texto totalmente corrigido em inglês",
  "errors": [
    {
      "original": "trecho original com erro",
      "correction": "trecho corrigido",
      "category": "gramática | vocabulário | tempo verbal | preposição | artigo",
      "explanation": "explicação curta em português do porquê do erro"
    }
  ]
}`

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-flash-latest',
    systemInstruction: systemPrompt,
    generationConfig: { responseMimeType: 'application/json' }
  })

  const result = await model.generateContent(text)
  const rawText = result.response.text()
  // remove possíveis marcadores de código, caso o modelo adicione por engano
  const cleanJson = rawText.replace(/```json|```/g, '').trim()

  return JSON.parse(cleanJson)
})
