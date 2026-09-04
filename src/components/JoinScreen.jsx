import { useState } from 'react'

const STATUS_LABEL = {
  connecting: 'Conectando al relay…',
  online: 'Relay conectado',
  offline: 'Sin conexión — reintentando…',
}

function generateRoomId() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 5; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return code
}

export function JoinScreen({ status, onStart, error }) {
  const [name, setName] = useState('')
  const [host, setHost] = useState(window.location.hostname === 'localhost' ? '' : window.location.hostname)
  const [port, setPort] = useState('3001')
  const [mode, setMode] = useState('create')
  const [roomId, setRoomId] = useState(() => generateRoomId())

  function handleSubmit(event) {
    event.preventDefault()
    const cleanRoomId = roomId.trim().toUpperCase()
    if (!cleanRoomId) return
    onStart({ name, host, port, mode, roomId: cleanRoomId })
  }

  return (
    <div className="join">
      <form className="join__card" onSubmit={handleSubmit}>
        <div className="join__logo" aria-hidden="true">⬡</div>
        <h1 className="join__title">Chat P2P</h1>

        <div className="mode-switch" role="tablist" aria-label="Tipo de acceso">
          <button
            className={`mode-switch__button ${mode === 'create' ? 'mode-switch__button--active' : ''}`}
            type="button"
            onClick={() => {
              setMode('create')
              setRoomId(generateRoomId())
            }}
          >
            Crear sala
          </button>
          <button
            className={`mode-switch__button ${mode === 'join' ? 'mode-switch__button--active' : ''}`}
            type="button"
            onClick={() => {
              setMode('join')
              setRoomId('')
            }}
          >
            Unirse a sala
          </button>
        </div>

        <p className="join__subtitle">
          {mode === 'create'
            ? 'Crea una red privada y comparte el código de la sala con quien te quiera unir.'
            : 'Escribe la IP, el puerto y el código de la sala a la que quieres entrar.'}
        </p>

        <label className="field">
          <span className="field__label">Tu nombre</span>
          <input
            className="field__input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="p. ej. ada"
            maxLength={32}
            autoFocus
          />
        </label>

        <label className="field">
          <span className="field__label">Código de la sala</span>
          <input
            className="field__input"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
            placeholder="p. ej. ABC123"
            maxLength={8}
            required
          />
        </label>

        {mode === 'join' && (
          <label className="field">
            <span className="field__label">IP del anfitrión</span>
            <input
              className="field__input"
              value={host}
              onChange={(e) => setHost(e.target.value.trim())}
              placeholder="p. ej. 10.20.142.216"
              inputMode="decimal"
              required
            />
          </label>
        )}

        <label className="field">
          <span className="field__label">Puerto del relay</span>
          <input
            className="field__input"
            type="number"
            min="1"
            max="65535"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            disabled={mode === 'create'}
          />
        </label>

        <button
          className="btn btn--primary"
          type="submit"
          disabled={!name.trim() || !roomId.trim() || (mode === 'join' && !host)}
        >
          {mode === 'create' ? 'Crear sala' : 'Unirse a sala'}
        </button>

        {error && <div className="join__error">{error}</div>}

        <div className={`status status--${status}`}>
          <span className="status__dot" />
          {STATUS_LABEL[status] ?? status}
        </div>
      </form>
    </div>
  )
}
