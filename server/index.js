// Servidor de señalización / relay WebSocket para el chat "P2P".
//
// Cada cliente conectado es un "peer". El servidor no almacena historial:
// se limita a reenviar (relay) los mensajes de un peer a todos los demas,
// igual que haria una malla P2P. Tambien mantiene la lista de presencia.

import { randomUUID } from 'node:crypto'
import { WebSocketServer } from 'ws'

const PORT = Number(process.env.PORT ?? process.env.WS_PORT ?? 3001)

const wss = new WebSocketServer({ port: PORT })

/** @type {Map<import('ws').WebSocket, { id: string, username: string | null, roomId: string | null }>} */
const peers = new Map()
const rooms = new Map()

const now = () => Date.now()

function broadcastToRoom(roomId, payload, { except } = {}) {
  const room = rooms.get(roomId)
  if (!room) return

  const data = JSON.stringify(payload)
  for (const client of room) {
    if (client.readyState === client.OPEN && client !== except) {
      client.send(data)
    }
  }
}

function presenceList(roomId) {
  return [...peers.values()]
    .filter((p) => p.username && p.roomId === roomId)
    .map(({ id, username }) => ({ id, username }))
}

function sendPresence(roomId) {
  broadcastToRoom(roomId, { type: 'presence', users: presenceList(roomId) })
}

function safeParse(raw) {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function assignPeerToRoom(socket, roomId) {
  const prevRoom = peers.get(socket)?.roomId
  if (prevRoom && prevRoom !== roomId && rooms.has(prevRoom)) {
    const prevSet = rooms.get(prevRoom)
    if (prevSet) {
      prevSet.delete(socket)
      if (prevSet.size === 0) rooms.delete(prevRoom)
    }
  }

  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set())
  }
  rooms.get(roomId).add(socket)
  peers.get(socket).roomId = roomId
}

function rejectJoin(socket, text) {
  socket.send(JSON.stringify({ type: 'error', text }))
}

wss.on('connection', (socket) => {
  const peer = { id: randomUUID(), username: null, roomId: null }
  peers.set(socket, peer)

  socket.send(JSON.stringify({ type: 'welcome', id: peer.id }))

  socket.on('message', (raw) => {
    const msg = safeParse(raw.toString())
    if (!msg || typeof msg.type !== 'string') return

    switch (msg.type) {
      case 'create-room': {
        const username = String(msg.username ?? '').trim().slice(0, 32)
        const roomId = String(msg.roomId ?? '').trim().toUpperCase().slice(0, 8)
        if (!username || !roomId) return

        if (rooms.has(roomId)) {
          rejectJoin(socket, `La sala ${roomId} ya existe. Elige otro código o únete a la existente.`)
          return
        }

        peer.username = username
        assignPeerToRoom(socket, roomId)
        broadcastToRoom(roomId, { type: 'system', text: `${username} creó la sala`, ts: now() })
        sendPresence(roomId)
        break
      }

      case 'join': {
        const username = String(msg.username ?? '').trim().slice(0, 32)
        const roomId = String(msg.roomId ?? '').trim().toUpperCase().slice(0, 8)
        if (!username || !roomId) return
        if (!rooms.has(roomId)) {
          rejectJoin(socket, `La sala ${roomId} no existe todavía. Crea la sala primero.`)
          return
        }

        peer.username = username
        assignPeerToRoom(socket, roomId)
        broadcastToRoom(roomId, { type: 'system', text: `${username} se ha unido`, ts: now() })
        sendPresence(roomId)
        break
      }

      case 'message': {
        if (!peer.username || !peer.roomId) return
        const text = String(msg.text ?? '').slice(0, 2000)
        if (!text.trim()) return
        broadcastToRoom(peer.roomId, {
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
        if (!peer.username || !peer.roomId) return
        broadcastToRoom(
          peer.roomId,
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
    const { username, roomId } = peer
    peers.delete(socket)

    if (roomId && rooms.has(roomId)) {
      const room = rooms.get(roomId)
      room.delete(socket)
      if (room.size === 0) rooms.delete(roomId)
    }

    if (username && roomId) {
      broadcastToRoom(roomId, { type: 'system', text: `${username} ha salido`, ts: now() })
      sendPresence(roomId)
    }
  })

  socket.on('error', () => socket.close())
})

console.log(`WebSocket relay escuchando en ws://localhost:${PORT}`)
