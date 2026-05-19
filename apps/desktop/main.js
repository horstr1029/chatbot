const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, shell } = require('electron')
const path = require('path')
const Store = require('electron-store')

const APP_URL = process.env.APP_URL || 'https://chat.gloworm.org.za'

const store = new Store()
let mainWindow = null
let tray = null

// Prevent multiple instances
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
  const bounds = store.get('windowBounds', { width: 440, height: 720 })

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
      // Allow the web app to function normally
      webSecurity: true,
    },
  })

  mainWindow.loadURL(APP_URL)

  // Open external links in the default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Save window size/position on close
  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault()
      store.set('windowBounds', mainWindow.getBounds())
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
      checked: store.get('launchAtLogin', false),
      click: (item) => {
        store.set('launchAtLogin', item.checked)
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

  // Single click toggles the window
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

// IPC handlers
ipcMain.on('window:minimize', () => mainWindow?.minimize())
ipcMain.on('window:hide', () => mainWindow?.hide())

app.whenReady().then(() => {
  // Restore launch-at-login setting
  const launchAtLogin = store.get('launchAtLogin', false)
  app.setLoginItemSettings({ openAtLogin: launchAtLogin })

  createWindow()
  createTray()
})

app.on('before-quit', () => { app.isQuitting = true })

// Keep app running when all windows are closed (tray app)
app.on('window-all-closed', () => {})
