const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, shell } = require('electron')
const path = require('path')
const fs = require('fs')

const APP_URL = process.env.APP_URL || 'https://chat.gloworm.org.za'

const storePath = path.join(app.getPath('userData'), 'settings.json')

function readStore() {
  try { return JSON.parse(fs.readFileSync(storePath, 'utf8')) } catch { return {} }
}

function writeStore(data) {
  try { fs.writeFileSync(storePath, JSON.stringify(data), 'utf8') } catch {}
}

function storeGet(key, defaultValue) {
  return readStore()[key] ?? defaultValue
}

function storeSet(key, value) {
  writeStore({ ...readStore(), [key]: value })
}

let mainWindow = null
let tray = null

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
  }
})

function createWindow() {
  const bounds = storeGet('windowBounds', { width: 440, height: 720 })

  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    minWidth: 380,
    minHeight: 500,
    title: 'MST Chatbot',
    icon: path.join(__dirname, 'resources', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
  })

  mainWindow.loadURL(APP_URL)

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault()
      storeSet('windowBounds', mainWindow.getBounds())
      mainWindow.hide()
    }
  })

  mainWindow.on('closed', () => { mainWindow = null })
}

function createTray() {
  const iconPath = path.join(__dirname, 'resources', 'tray.png')
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
  tray = new Tray(icon)

  const menu = Menu.buildFromTemplate([
    {
      label: 'Open MST Chatbot',
      click: () => { mainWindow?.show(); mainWindow?.focus() },
    },
    { type: 'separator' },
    {
      label: 'Launch at login',
      type: 'checkbox',
      checked: storeGet('launchAtLogin', false),
      click: (item) => {
        storeSet('launchAtLogin', item.checked)
        app.setLoginItemSettings({ openAtLogin: item.checked })
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => { app.isQuitting = true; app.quit() },
    },
  ])

  tray.setToolTip('MST Chatbot')
  tray.setContextMenu(menu)

  tray.on('click', () => {
    if (!mainWindow) return
    if (mainWindow.isVisible() && !mainWindow.isMinimized()) {
      mainWindow.hide()
    } else {
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

ipcMain.on('window:minimize', () => mainWindow?.minimize())
ipcMain.on('window:hide', () => mainWindow?.hide())

app.whenReady().then(() => {
  app.setLoginItemSettings({ openAtLogin: storeGet('launchAtLogin', false) })
  createWindow()
  createTray()
})

app.on('before-quit', () => { app.isQuitting = true })
app.on('window-all-closed', () => {})
