import { useEffect, useMemo, useRef, useState } from 'react'

const STATUS_LABEL = {
  connecting: 'conectando',
  online: 'en línea',
  offline: 'desconectado',
}

function initials(name = '') {
  return name.trim().slice(0, 2).toUpperCase() || '?'
}

function timeLabel(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// Color estable derivado del nombre, dentro de la gama verde.
function hueFor(name) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 80
  return 120 + h // 120–200: verdes → verde-azulados
}

function Avatar({ name }) {
  return (
    <span
      className="avatar"
      style={{ background: `hsl(${hueFor(name)} 45% 40%)` }}
      title={name}
    >
      {initials(name)}
    </span>
  )
}

export function ChatRoom({ chat }) {
  const { status, me, username, messages, users, typingUsers, sendMessage, notifyTyping } = chat
  const [draft, setDraft] = useState('')
  const scrollRef = useRef(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, typingUsers])

  const typingText = useMemo(() => {
    const names = typingUsers.map((u) => u.username)
    if (names.length === 0) return ''
    if (names.length === 1) return `${names[0]} está escribiendo…`
    if (names.length === 2) return `${names[0]} y ${names[1]} están escribiendo…`
    return 'Varias personas están escribiendo…'
  }, [typingUsers])

  function handleSubmit(event) {
    event.preventDefault()
    if (!draft.trim()) return
    sendMessage(draft)
    setDraft('')
  }

  return (
    <div className="chat">
      <aside className="sidebar">
        <div className="sidebar__header">
          <span className="brand">⬡ Chat P2P</span>
          <span className={`status status--${status}`}>
            <span className="status__dot" />
            {STATUS_LABEL[status] ?? status}
          </span>
        </div>
        <div className="sidebar__section-title">
          En la sala · {users.length}
        </div>
        <ul className="userlist">
          {users.map((u) => (
            <li key={u.id} className="userlist__item">
              <Avatar name={u.username} />
              <span className="userlist__name">
                {u.username}
                {u.id === me && <span className="userlist__you"> (tú)</span>}
              </span>
            </li>
          ))}
        </ul>
      </aside>

      <main className="room">
        <header className="room__header">
          <div>
            <h2 className="room__title">Sala general</h2>
            <p className="room__meta">Conectado como {username}</p>
          </div>
        </header>

        <div className="messages" ref={scrollRef}>
          {messages.map((m) =>
            m.kind === 'system' ? (
              <div key={m.id} className="system-line">
                {m.text}
              </div>
            ) : (
              <div
                key={m.id}
                className={`msg ${m.from === me ? 'msg--own' : ''}`}
              >
                {m.from !== me && <Avatar name={m.username} />}
                <div className="msg__body">
                  {m.from !== me && <span className="msg__author">{m.username}</span>}
                  <div className="msg__bubble">{m.text}</div>
                  <span className="msg__time">{timeLabel(m.ts)}</span>
                </div>
              </div>
            ),
          )}
        </div>

        <div className="typing" aria-live="polite">
          {typingText}
        </div>

        <form className="composer" onSubmit={handleSubmit}>
          <input
            className="composer__input"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
              notifyTyping()
            }}
            placeholder="Escribe un mensaje…"
            maxLength={2000}
            autoFocus
          />
          <button className="btn btn--primary" type="submit" disabled={!draft.trim()}>
            Enviar
          </button>
        </form>
      </main>
    </div>
  )
}
