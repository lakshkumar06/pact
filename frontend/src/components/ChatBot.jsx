import { useState, useEffect, useRef } from 'react'

export default function ChatBot({ storageKey = 'cb_chat' }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const listRef = useRef(null)

  useEffect(() => {
    try {
      const persisted = JSON.parse(localStorage.getItem(storageKey) || 'null')
      if (persisted && Array.isArray(persisted)) setMessages(persisted)
    } catch (e) {}
  }, [storageKey])

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(messages))
    // scroll to bottom
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages, storageKey])

  const send = () => {
    const text = input.trim()
    if (!text) return
    const userMsg = { id: Date.now() + '_u', role: 'user', text, ts: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    // If backend Claude endpoint available, call it; otherwise fallback to simulated reply
    (async () => {
      try {
        const resp = await fetch('/api/claude/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: text })
        })
        if (resp.ok) {
          const data = await resp.json()
          const botMsg = { id: Date.now() + '_b', role: 'bot', text: data.reply || 'No reply', ts: new Date().toISOString() }
          setMessages(prev => [...prev, botMsg])
          return
        }
        // fallthrough to simulated on non-OK
        console.warn('Claude endpoint returned non-OK', resp.status)
        const errorData = await resp.json().catch(() => ({}))
        console.warn('Error details:', errorData)
        
        // Show helpful error message
        const botMsg = { 
          id: Date.now() + '_b', 
          role: 'bot', 
          text: `⚠️ Claude API unavailable (${resp.status}). Using local demo mode.\n\nYou said: "${text}"\n\nTo enable Claude:\n1. Verify CLAUDE_API_KEY in backend/.env\n2. Check model name in backend/routes/claude.js\n3. Ensure API key has access to Claude 3 models`,
          ts: new Date().toISOString() 
        }
        setMessages(prev => [...prev, botMsg])
      } catch (e) {
        console.warn('Error calling backend Claude endpoint, falling back to local bot', e)
        setTimeout(() => {
          const botMsg = { id: Date.now() + '_b', role: 'bot', text: `🤖 Local Demo Mode\n\nYou said: "${text}"\n\nClaude integration is currently unavailable. This is a simulated response.` , ts: new Date().toISOString() }
          setMessages(prev => [...prev, botMsg])
        }, 500)
      }
    })()
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      // Ctrl/Cmd+Enter to send
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-3 shadow-sm box-border overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <h5 className="text-sm font-medium">Chat</h5>
        <div className="text-xs text-gray-400">Ctrl+Enter to send</div>
      </div>

      <div ref={listRef} className="max-h-40 overflow-auto space-y-2 mb-3">
        {messages.length === 0 ? (
          <div className="text-sm text-gray-400">No messages yet — ask anything.</div>
        ) : (
          messages.map(m => (
            <div key={m.id} className={`p-2 rounded-lg ${m.role === 'user' ? 'bg-teal-50 text-gray-900' : 'bg-gray-50 text-gray-700'}`}>
              <div className="text-xs text-gray-500 mb-1">{m.role === 'user' ? 'You' : 'Bot'} • {new Date(m.ts).toLocaleTimeString()}</div>
              <div className="text-sm wrap-break-word">{m.text}</div>
            </div>
          ))
        )}
      </div>

      <div className="grid grid-cols-12 gap-2 items-end">
        <div className="col-span-9">
          <textarea
            rows={2}
            className="w-full border rounded-lg px-3 py-2 text-sm shadow-sm focus:ring-1 focus:ring-teal-400 box-border resize-none"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type a message... (Ctrl+Enter to send)"
          />
        </div>
        <div className="col-span-3">
          <button onClick={send} className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700">
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
