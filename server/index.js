// Servidor de señalización / relay WebSocket para el chat "P2P".
//
// Cada cliente conectado es un "peer". El servidor no almacena historial:
// se limita a reenviar (relay) los mensajes de un peer a todos los demas,
// igual que haria una malla P2P. Tambien mantiene la lista de presencia.

import { randomUUID } from 'node:crypto'
import { WebSocketServer } from 'ws'

const PORT = Number(process.env.PORT ?? process.env.WS_PORT ?? 3001)

const wss = new WebSocketServer({ port: PORT })

/** @type {Map<import('ws').WebSocket, { id: string, username: string }>} */
const peers = new Map()

const now = () => Date.now()

function broadcast(payload, { except } = {}) {
  const data = JSON.stringify(payload)
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN && client !== except) {
      client.send(data)
    }
  }
}

function presenceList() {
  return [...peers.values()]
    .filter((p) => p.username)
    .map(({ id, username }) => ({ id, username }))
}

function sendPresence() {
  broadcast({ type: 'presence', users: presenceList() })
}

function safeParse(raw) {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

wss.on('connection', (socket) => {
  const peer = { id: randomUUID(), username: null }
  peers.set(socket, peer)

  socket.send(JSON.stringify({ type: 'welcome', id: peer.id }))

  socket.on('message', (raw) => {
    const msg = safeParse(raw.toString())
    if (!msg || typeof msg.type !== 'string') return

    switch (msg.type) {
      case 'join': {
        const username = String(msg.username ?? '').trim().slice(0, 32)
        if (!username) return
        peer.username = username
        broadcast({ type: 'system', text: `${username} se ha unido`, ts: now() })
        sendPresence()
        break
      }

      case 'message': {
        if (!peer.username) return
        const text = String(msg.text ?? '').slice(0, 2000)
        if (!text.trim()) return
        broadcast({
          type: 'message',
          id: randomUUID(),
          from: peer.id,
          username: peer.username,
          text,
          ts: now(),
        })
        break
      }

      case 'typing': {
        if (!peer.username) return
        broadcast(
          { type: 'typing', from: peer.id, username: peer.username, isTyping: !!msg.isTyping },
          { except: socket },
        )
        break
      }

      default:
        break
    }
  })

  socket.on('close', () => {
    const { username } = peer
    peers.delete(socket)
    if (username) {
      broadcast({ type: 'system', text: `${username} ha salido`, ts: now() })
      sendPresence()
    }
  })

  socket.on('error', () => socket.close())
})

console.log(`WebSocket relay escuchando en ws://localhost:${PORT}`)
