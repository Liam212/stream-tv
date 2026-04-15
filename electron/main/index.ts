import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import os from 'node:os'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.mjs   > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
process.env.APP_ROOT = path.join(__dirname, '../..')

export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

// Disable GPU Acceleration for Windows 7
if (os.release().startsWith('6.1')) app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

let win: BrowserWindow | null = null
const preload = path.join(__dirname, '../preload/index.mjs')
const indexHtml = path.join(RENDERER_DIST, 'index.html')

type XtreamRequestPayload = {
  baseUrl: string
  username: string
  password: string
  params?: Record<string, string>
}

function isHttpUrl(value: string) {
  try {
    const parsed = new URL(value)
    return ['http:', 'https:'].includes(parsed.protocol)
  } catch {
    return false
  }
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/+$/, '')
}

function buildXtreamPlayerApiUrl({
  baseUrl,
  username,
  password,
  params = {},
}: XtreamRequestPayload) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl)
  const url = new URL('player_api.php', `${normalizedBaseUrl}/`)

  url.searchParams.set('username', username)
  url.searchParams.set('password', password)

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value)
    }
  })

  return url
}

function isAllowedAppNavigation(url: string) {
  if (VITE_DEV_SERVER_URL && url.startsWith(VITE_DEV_SERVER_URL)) {
    return true
  }

  return url === indexHtml || url.startsWith('file://')
}

async function createWindow() {
  win = new BrowserWindow({
    title: 'Stream TV',
    icon: path.join(process.env.VITE_PUBLIC, 'icon.png'),
    webPreferences: {
      preload,
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  })

  if (VITE_DEV_SERVER_URL) { // #298
    win.loadURL(VITE_DEV_SERVER_URL)
    // Open devTool if the app is not packaged
    win.webContents.openDevTools()
  } else {
    win.loadFile(indexHtml)
  }

  win.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedAppNavigation(url)) {
      event.preventDefault()
    }
  })

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isHttpUrl(url)) {
      void shell.openExternal(url)
    }
    return { action: 'deny' }
  })
}

ipcMain.handle('xtream:request', async (_, payload: XtreamRequestPayload) => {
  const parsedUrl = buildXtreamPlayerApiUrl(payload)

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('Xtream requests must use http or https')
  }

  const response = await fetch(parsedUrl, {
    headers: {
      Accept: 'application/json, text/plain, */*',
    },
  })

  if (!response.ok) {
    throw new Error(`Xtream request failed with ${response.status}`)
  }

  const text = await response.text()

  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new Error('Xtream server returned a non-JSON response')
  }
})

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  win = null
  if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', () => {
  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
  } else {
    createWindow()
  }
})
