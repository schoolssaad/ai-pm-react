import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import axios from 'axios'

// 🔑 Replace with your Supabase URL and anon key
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'
)

export default function App() {
  const [user, setUser] = useState(null)
  const [prompt, setPrompt] = useState('')
  const [tasks, setTasks] = useState([])
  const [listId, setListId] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      const {  { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
    }
    checkSession()

    const {  { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogin = () => supabase.auth.signInWithOAuth({ provider: 'google' })
  const handleLogout = () => {
    supabase.auth.signOut()
    setUser(null)
    setTasks([])
  }

  const generateTasks = async () => {
    if (!prompt.trim()) return
    setLoading(true)

    const {  { session } } = await supabase.auth.getSession()
    if (!session) return

    try {
      // 🌐 Point to your Railway backend (update after deploy!)
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'
      
      const res = await axios.post(`${BACKEND_URL}/ai/generate-tasks`, 
        { prompt },
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      )
      setTasks(res.data.tasks || [])
    } catch (err) {
      console.error(err)
      alert('Failed to generate tasks. Check backend logs.')
    } finally {
      setLoading(false)
    }
  }

  const sendToTrello = async (task) => {
    if (!listId) return alert('Please enter a Trello List ID')
    
    const {  { session } } = await supabase.auth.getSession()
    if (!session) return

    try {
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'
      await axios.post(`${BACKEND_URL}/trello/create-card`,
        { list_id: listId, task },
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      )
      alert('✅ Added to Trello!')
    } catch (err) {
      console.error(err)
      alert('Failed to add to Trello')
    }
  }

  if (!user) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>🤖 AI Project Manager</h1>
        <p>Log in to generate and sync Agile tasks</p>
        <button onClick={handleLogin} style={buttonStyle}>
          Login with Google
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>🤖 AI Project Manager</h1>
        <button onClick={handleLogout} style={{ ...buttonStyle, backgroundColor: '#ff6b6b' }}>
          Logout
        </button>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., Build a customer feedback tool"
          style={inputStyle}
        />
        <button onClick={generateTasks} disabled={loading} style={buttonStyle}>
          {loading ? 'Generating...' : 'Generate Tasks'}
        </button>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <input
          value={listId}
          onChange={(e) => setListId(e.target.value)}
          placeholder="Trello List ID (from board URL)"
          style={{ ...inputStyle, width: '100%' }}
        />
        <small style={{ display: 'block', marginTop: '4px', color: '#666' }}>
          Find it in your Trello board URL: .../LIST_ID
        </small>
      </div>

      {tasks.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h2>Generated Tasks ({tasks.length})</h2>
          {tasks.map((task, i) => (
            <div key={i} style={cardStyle}>
              <h3>{task.title} <span style={{ color: task.priority === 'high' ? 'red' : task.priority === 'medium' ? 'orange' : 'green' }}>
                ({task.priority})
              </span></h3>
              <p>{task.description}</p>
              <button onClick={() => sendToTrello(task)} style={buttonStyle}>
                ➕ Add to Trello
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Simple styles
const buttonStyle = {
  padding: '8px 16px',
  backgroundColor: '#4f46e5',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer'
}

const inputStyle = {
  padding: '8px',
  marginRight: '8px',
  border: '1px solid #ccc',
  borderRadius: '4px',
  width: '70%'
}

const cardStyle = {
  border: '1px solid #eee',
  padding: '1rem',
  margin: '1rem 0',
  borderRadius: '8px',
  backgroundColor: '#fafafa'
}
