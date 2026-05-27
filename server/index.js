import http from 'http'
import { WebSocketServer } from 'ws'
import utils from 'y-websocket/bin/utils.js'

const { setupWSConnection } = utils
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

server.listen(port, () => {
  console.log(`[Server] Yjs WebSocket server is listening on port ${port}`)
})
