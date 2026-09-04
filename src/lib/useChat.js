import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * URL del relay WebSocket.
 * - En dev usamos el proxy de Vite (/ws) para servir todo desde un mismo origen.
 * - Se puede sobrescribir con VITE_WS_URL para apuntar a otro host.
 */
function resolveWsUrl(explicitUrl) {
  if (explicitUrl) return explicitUrl
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${window.location.host}/ws`
}

const TYPING_TIMEOUT = 2500

export function useChat({ enabled = false, wsUrl = null } = {}) {
  const [status, setStatus] = useState(enabled ? 'connecting' : 'idle') // idle | connecting | online | offline
  const [me, setMe] = useState(null)
  const [username, setUsername] = useState(null)
  const [messages, setMessages] = useState([])
  const [users, setUsers] = useState([])
  const [typingUsers, setTypingUsers] = useState([])
  const [error, setError] = useState('')

  const socketRef = useRef(null)
  const usernameRef = useRef(null)
  const roomIdRef = useRef(null)
  const reconnectRef = useRef(null)
  const typingTimersRef = useRef(new Map())
  const lastTypingSentRef = useRef(0)

  const addSystem = useCallback((text) => {
    setMessages((prev) => [
      ...prev,
      { kind: 'system', id: `sys-${Date.now()}-${Math.random()}`, text, ts: Date.now() },
    ])
  }, [])

  const clearTypingUser = useCallback((from) => {
    setTypingUsers((prev) => prev.filter((u) => u.from !== from))
    const timer = typingTimersRef.current.get(from)
    if (timer) {
      clearTimeout(timer)
      typingTimersRef.current.delete(from)
    }
  }, [])

  useEffect(() => {
    let disposed = false

    if (!enabled) {
      return () => {
        disposed = true
      }
    }

    function handleMessage(event) {
      let msg
      try {
        msg = JSON.parse(event.data)
      } catch {
        return
      }

      switch (msg.type) {
        case 'welcome':
          setMe(msg.id)
          if (usernameRef.current && roomIdRef.current && socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(
              JSON.stringify({ type: 'join', username: usernameRef.current, roomId: roomIdRef.current }),
            )
          }
          break

        case 'presence':
          setUsers(msg.users ?? [])
          break

        case 'message':
          setMessages((prev) => [
            ...prev,
            {
              kind: 'message',
              id: msg.id,
              from: msg.from,
              username: msg.username,
              text: msg.text,
              ts: msg.ts,
            },
          ])
          clearTypingUser(msg.from)
          break

        case 'system':
          addSystem(msg.text)
          break

        case 'error':
          setError(msg.text)
          setUsername(null)
          setMe(null)
          setMessages([])
          setUsers([])
          setTypingUsers([])
          setStatus('idle')
          break

        case 'typing': {
          const { from, username: name, isTyping } = msg
          if (isTyping) {
            setTypingUsers((prev) =>
              prev.some((u) => u.from === from) ? prev : [...prev, { from, username: name }],
            )
            const existing = typingTimersRef.current.get(from)
            if (existing) clearTimeout(existing)
            typingTimersRef.current.set(
              from,
              setTimeout(() => clearTypingUser(from), TYPING_TIMEOUT + 1000),
            )
          } else {
            clearTypingUser(from)
          }
          break
        }

        default:
          break
      }
    }

    function connect() {
      setStatus('connecting')
      const ws = new WebSocket(resolveWsUrl(wsUrl))
      socketRef.current = ws

      ws.addEventListener('open', () => {
        if (disposed || socketRef.current !== ws) return
        setStatus('online')
        if (usernameRef.current && roomIdRef.current) {
          ws.send(JSON.stringify({ type: 'join', username: usernameRef.current, roomId: roomIdRef.current }))
        }
      })

      ws.addEventListener('close', () => {
        if (socketRef.current === ws) socketRef.current = null
        if (disposed || socketRef.current) return
        setStatus('offline')
        reconnectRef.current = setTimeout(connect, 1500)
      })

      ws.addEventListener('error', () => ws.close())
      ws.addEventListener('message', handleMessage)
    }

    connect()

    const typingTimers = typingTimersRef.current
    return () => {
      disposed = true
      if (reconnectRef.current) clearTimeout(reconnectRef.current)
      for (const timer of typingTimers.values()) clearTimeout(timer)
      typingTimers.clear()
      const socket = socketRef.current
      socketRef.current = null
      if (socket?.readyState === WebSocket.OPEN) {
        socket.close()
      } else if (socket?.readyState === WebSocket.CONNECTING) {
        socket.addEventListener('open', () => socket.close(), { once: true })
      }
    }
  }, [addSystem, clearTypingUser, enabled, wsUrl])

  const createRoom = useCallback((name, roomId) => {
    const clean = name.trim().slice(0, 32)
    const cleanRoomId = String(roomId ?? '').trim().toUpperCase().slice(0, 8)
    if (!clean || !cleanRoomId) return
    setError('')
    usernameRef.current = clean
    roomIdRef.current = cleanRoomId
    setUsername(clean)
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'create-room', username: clean, roomId: cleanRoomId }))
    }
  }, [])

  const join = useCallback((name, roomId) => {
    const clean = name.trim().slice(0, 32)
    const cleanRoomId = String(roomId ?? '').trim().toUpperCase().slice(0, 8)
    if (!clean || !cleanRoomId) return
    setError('')
    usernameRef.current = clean
    roomIdRef.current = cleanRoomId
    setUsername(clean)
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'join', username: clean, roomId: cleanRoomId }))
    }
  }, [])

  const leave = useCallback(() => {
    usernameRef.current = null
    roomIdRef.current = null
    setError('')
    setUsername(null)
    setMe(null)
    setMessages([])
    setUsers([])
    setTypingUsers([])
    setStatus('idle')

    if (reconnectRef.current) {
      clearTimeout(reconnectRef.current)
      reconnectRef.current = null
    }

    const socket = socketRef.current
    socketRef.current = null
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      socket.close()
    }
  }, [])

  const sendMessage = useCallback((text) => {
    const clean = text.trim()
    if (!clean || socketRef.current?.readyState !== WebSocket.OPEN || !roomIdRef.current) return
    socketRef.current.send(JSON.stringify({ type: 'message', text: clean, roomId: roomIdRef.current }))
    socketRef.current.send(JSON.stringify({ type: 'typing', isTyping: false, roomId: roomIdRef.current }))
    lastTypingSentRef.current = 0
  }, [])

  const notifyTyping = useCallback(() => {
    const ws = socketRef.current
    if (ws?.readyState !== WebSocket.OPEN || !roomIdRef.current) return
    const now = Date.now()
    if (now - lastTypingSentRef.current > TYPING_TIMEOUT / 2) {
      ws.send(JSON.stringify({ type: 'typing', isTyping: true, roomId: roomIdRef.current }))
      lastTypingSentRef.current = now
    }
  }, [])

  return {
    status,
    me,
    username,
    messages,
    users,
    typingUsers: typingUsers.filter((u) => u.from !== me),
    error,
    createRoom,
    join,
    leave,
    sendMessage,
    notifyTyping,
  }
}
