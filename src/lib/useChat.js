import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * URL del relay WebSocket.
 * - En dev usamos el proxy de Vite (/ws) para servir todo desde un mismo origen.
 * - Se puede sobrescribir con VITE_WS_URL para apuntar a otro host.
 */
function resolveWsUrl() {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${window.location.host}/ws`
}

const TYPING_TIMEOUT = 2500

export function useChat() {
  const [status, setStatus] = useState('connecting') // connecting | online | offline
  const [me, setMe] = useState(null)
  const [username, setUsername] = useState(null)
  const [messages, setMessages] = useState([])
  const [users, setUsers] = useState([])
  const [typingUsers, setTypingUsers] = useState([])

  const socketRef = useRef(null)
  const usernameRef = useRef(null)
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

    function connect() {
      setStatus('connecting')
      const ws = new WebSocket(resolveWsUrl())
      socketRef.current = ws

      ws.addEventListener('open', () => {
        setStatus('online')
        if (usernameRef.current) {
          ws.send(JSON.stringify({ type: 'join', username: usernameRef.current }))
        }
      })

      ws.addEventListener('close', () => {
        socketRef.current = null
        if (disposed) return
        setStatus('offline')
        reconnectRef.current = setTimeout(connect, 1500)
      })

      ws.addEventListener('error', () => ws.close())

      ws.addEventListener('message', (event) => {
      let msg
      try {
        msg = JSON.parse(event.data)
      } catch {
        return
      }

      switch (msg.type) {
        case 'welcome':
          setMe(msg.id)
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
      })
    }

    connect()

    const typingTimers = typingTimersRef.current
    return () => {
      disposed = true
      if (reconnectRef.current) clearTimeout(reconnectRef.current)
      for (const timer of typingTimers.values()) clearTimeout(timer)
      typingTimers.clear()
      socketRef.current?.close()
    }
  }, [addSystem, clearTypingUser])

  const join = useCallback((name) => {
    const clean = name.trim().slice(0, 32)
    if (!clean) return
    usernameRef.current = clean
    setUsername(clean)
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'join', username: clean }))
    }
  }, [])

  const sendMessage = useCallback((text) => {
    const clean = text.trim()
    if (!clean || socketRef.current?.readyState !== WebSocket.OPEN) return
    socketRef.current.send(JSON.stringify({ type: 'message', text: clean }))
    socketRef.current.send(JSON.stringify({ type: 'typing', isTyping: false }))
    lastTypingSentRef.current = 0
  }, [])

  const notifyTyping = useCallback(() => {
    const ws = socketRef.current
    if (ws?.readyState !== WebSocket.OPEN) return
    const now = Date.now()
    if (now - lastTypingSentRef.current > TYPING_TIMEOUT / 2) {
      ws.send(JSON.stringify({ type: 'typing', isTyping: true }))
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
    join,
    sendMessage,
    notifyTyping,
  }
}
