# Chat P2P (WebSockets)

App de chat en tiempo real. Cada cliente es un *peer*; un servidor WebSocket
ligero (`ws`) actúa como relay/señalización y reenvía los mensajes al resto de
peers, sin guardar historial. UI en React + Vite con paleta verde.

## Puesta en marcha

```bash
npm install
npm run dev
```

`npm run dev` levanta a la vez:

- **Relay WebSocket** en `ws://localhost:3001` (`server/index.js`)
- **Vite** en `http://localhost:5173`

Vite hace proxy de `/ws` al relay, así que el cliente usa un único origen.
Abre dos pestañas para probar el chat entre peers.

## Scripts

| Script            | Descripción                                  |
| ----------------- | -------------------------------------------- |
| `npm run dev`     | Relay + cliente en paralelo                  |
| `npm run web`     | Solo el cliente Vite                         |
| `npm run server`  | Solo el relay WebSocket                      |
| `npm run build`   | Build de producción en `dist/`               |
| `npm run preview` | Sirve el build (necesita el relay aparte)    |
| `npm run lint`    | oxlint                                       |

## Configuración

- `WS_PORT` (env): puerto del relay. Por defecto `3001`.
- `VITE_WS_URL` (env): URL del WebSocket si no quieres usar el proxy,
  p. ej. `VITE_WS_URL=ws://192.168.1.50:3001`.

## Estructura

```
server/index.js          Relay WebSocket (presencia + reenvío de mensajes)
src/lib/useChat.js        Hook: conexión, reconexión, estado del chat
src/components/JoinScreen.jsx
src/components/ChatRoom.jsx
```

## Protocolo (JSON sobre WebSocket)

Cliente → servidor: `join {username}`, `message {text}`, `typing {isTyping}`
Servidor → cliente: `welcome {id}`, `presence {users}`, `message {...}`,
`system {text}`, `typing {from, username, isTyping}`
