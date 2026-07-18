// ============================================================
// MAIN PROCESS
// Este arquivo roda em Node.js puro (sem interface).
// É o único lugar que pode: abrir janelas, acessar arquivos,
// e guardar a API key com segurança.
// ============================================================

const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
require('dotenv').config()
const db = require('./database/db')
const { GoogleGenerativeAI } = require('@google/generative-ai')

const isDev = process.env.NODE_ENV === 'development'

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      // preload.js é a "ponte" segura entre este processo e o React
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, // segurança: renderer não acessa Node diretamente
      nodeIntegration: false  // segurança: nunca true em produção
    }
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

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
Responda APENAS com um JSON válido, sem markdown, sem texto extra, no formato:
{
  "corrected_text": "texto totalmente corrigido em inglês",
  "errors": [
    {
      "original": "trecho original com erro",
      "correction": "trecho corrigido",
      "category": "gramática | vocabulário | tempo verbal | preposição | artigo | pontuação",
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
