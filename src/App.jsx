import { useState } from 'react'
import { useChat } from './lib/useChat'
import { JoinScreen } from './components/JoinScreen'
import { ChatRoom } from './components/ChatRoom'
import './App.css'

function App() {
  const [connection, setConnection] = useState(null)
  const chat = useChat(connection ?? undefined)

  function handleStart({ name, host, port, mode }) {
    const cleanPort = Number(port)
    const wsUrl = mode === 'create'
      ? null
      : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${host}:${cleanPort}`

    setConnection({ enabled: true, wsUrl, port: cleanPort })
    chat.join(name)
  }

  return (
    <div className="app">
      {chat.username ? (
        <ChatRoom chat={chat} port={connection.port} />
      ) : (
        <JoinScreen status={chat.status} onStart={handleStart} />
      )}
    </div>
  )
}

export default App
