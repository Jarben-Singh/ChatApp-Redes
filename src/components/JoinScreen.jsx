import { useState } from 'react'

const STATUS_LABEL = {
  connecting: 'Conectando al relay…',
  online: 'Relay conectado',
  offline: 'Sin conexión — reintentando…',
}

export function JoinScreen({ status, onStart }) {
  const [name, setName] = useState('')
  const [host, setHost] = useState(window.location.hostname === 'localhost' ? '' : window.location.hostname)
  const [port, setPort] = useState('3001')
  const [mode, setMode] = useState('create')

  function handleSubmit(event) {
    event.preventDefault()
    onStart({ name, host, port, mode })
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
            onClick={() => setMode('create')}
          >
            Crear sala
          </button>
          <button
            className={`mode-switch__button ${mode === 'join' ? 'mode-switch__button--active' : ''}`}
            type="button"
            onClick={() => setMode('join')}
          >
            Unirse a sala
          </button>
        </div>

        <p className="join__subtitle">
          {mode === 'create'
            ? 'Inicia el relay y comparte tu IP y este puerto con tu amigo.'
            : 'Escribe la IP y el puerto de quien creó la sala.'}
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

        <button className="btn btn--primary" type="submit" disabled={!name.trim() || (mode === 'join' && !host)}>
          {mode === 'create' ? 'Crear sala' : 'Unirse a sala'}
        </button>

        <div className={`status status--${status}`}>
          <span className="status__dot" />
          {STATUS_LABEL[status] ?? status}
        </div>
      </form>
    </div>
  )
}
