import { useState } from 'react'
import { useChat } from './lib/useChat'
import { JoinScreen } from './components/JoinScreen'
import { ChatRoom } from './components/ChatRoom'
import './App.css'

function App() {
  const [connection, setConnection] = useState(null)
  const chat = useChat(connection ?? undefined)

  function handleStart({ name, host, port, mode, roomId }) {
    const cleanPort = Number(port)
    const wsUrl = mode === 'create'
      ? null
      : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${host}:${cleanPort}`

    setConnection({ enabled: true, wsUrl, port: cleanPort, roomId })

    if (mode === 'create') {
      chat.createRoom(name, roomId)
      return
    }

    chat.join(name, roomId)
  }

  function handleLeave() {
    chat.leave()
    setConnection(null)
  }

  return (
    <div className="app">
      {chat.username ? (
        <ChatRoom
          chat={chat}
          port={connection?.port ?? 3001}
          roomId={connection?.roomId}
          onLeave={handleLeave}
        />
      ) : (
        <JoinScreen status={chat.status} onStart={handleStart} error={chat.error} />
      )}
    </div>
  )
}

export default App
