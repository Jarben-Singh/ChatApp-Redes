import { useState } from 'react'

const STATUS_LABEL = {
  connecting: 'Conectando al relay…',
  online: 'Relay conectado',
  offline: 'Sin conexión — reintentando…',
}

export function JoinScreen({ status, onJoin }) {
  const [name, setName] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    onJoin(name)
  }

  return (
    <div className="join">
      <form className="join__card" onSubmit={handleSubmit}>
        <div className="join__logo" aria-hidden="true">⬡</div>
        <h1 className="join__title">Chat P2P</h1>
        <p className="join__subtitle">
          Mensajería entre pares sobre WebSockets. Elige un nombre para entrar a la sala.
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

        <button className="btn btn--primary" type="submit" disabled={!name.trim()}>
          Entrar a la sala
        </button>

        <div className={`status status--${status}`}>
          <span className="status__dot" />
          {STATUS_LABEL[status] ?? status}
        </div>
      </form>
    </div>
  )
}
