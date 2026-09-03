import { useChat } from './lib/useChat'
import { JoinScreen } from './components/JoinScreen'
import { ChatRoom } from './components/ChatRoom'
import './App.css'

function App() {
  const chat = useChat()

  return (
    <div className="app">
      {chat.username ? (
        <ChatRoom chat={chat} />
      ) : (
        <JoinScreen status={chat.status} onJoin={chat.join} />
      )}
    </div>
  )
}

export default App
