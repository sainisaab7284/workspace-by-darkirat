const { app, BrowserWindow } = require('electron')
const path = require('path')
const http = require('http')
const { WebSocketServer } = require('ws')
const { setupWSConnection } = require('y-websocket/bin/utils')

// Spin up Yjs WebSocket server inside Electron main process
function startWebSocketServer() {
  const port = process.env.PORT || 1234
  const server = http.createServer((request, response) => {
    response.writeHead(200, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' })
    response.end('Yjs WebSocket server is running\n')
  })

  const wss = new WebSocketServer({ noServer: true })

  wss.on('connection', (ws, req) => {
    setupWSConnection(ws, req)
  })

  server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request)
    })
  })

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`[Electron Sync Server] Port ${port} is already in use. Assuming server is running elsewhere.`)
    } else {
      console.error('[Electron Sync Server] Server error:', err)
    }
  })

  server.listen(port, () => {
    console.log(`[Electron Sync Server] Yjs WebSocket server is running on port ${port}`)
  })
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: "workspace by darkirat",
    backgroundColor: '#030014',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  })

  const isDev = !app.isPackaged

  if (isDev) {
    // In dev, load Vite's local dev server URL
    win.loadURL('http://localhost:5173/')
  } else {
    // In production, load the built HTML index.html file
    win.loadFile(path.join(__dirname, 'dist', 'index.html'))
  }

  // Hide the default system menu bar for a clean, premium desktop feel
  win.setMenuBarVisibility(false)

  win.on('page-title-updated', (e) => {
    e.preventDefault()
  })
}

app.whenReady().then(() => {
  // Start the Yjs websocket server
  try {
    startWebSocketServer()
  } catch (e) {
    console.error('Failed to start integrated Yjs server:', e)
  }

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
