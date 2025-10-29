import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// Initialize Supabase (env vars injected at build)
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function App() {
  const [user, setUser] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [tasks, setTasks] = useState([]);
  const [listId, setListId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // ✅ CORRECT: Get current session
    const checkSession = async () => {
      const {  { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    checkSession();

    // ✅ CORRECT: Subscribe to auth changes
    const {  { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogin = () => supabase.auth.signInWithOAuth({ provider: 'google' });
  const handleLogout = () => {
    supabase.auth.signOut();
    setUser(null);
    setTasks([]);
  };

  const generateTasks = async () => {
    if (!prompt.trim()) return;
    setLoading(true);

    const {  { session } } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      return;
    }

    try {
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const response = await axios.post(
        `${BACKEND_URL}/ai/generate-tasks`,
        { prompt },
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      setTasks(response.data.tasks || []);
    } catch (error) {
      console.error('AI task generation failed:', error);
      alert('Failed to generate tasks. Check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  const sendToTrello = async (task) => {
    if (!listId) {
      alert('Please enter your Trello List ID (from the board URL)');
      return;
    }

    const {  { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      await axios.post(
        `${BACKEND_URL}/trello/create-card`,
        { list_id: listId, task },
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      alert('✅ Task added to Trello!');
    } catch (error) {
      console.error('Trello sync failed:', error);
      alert('Failed to add task to Trello. Check your List ID and backend.');
    }
  };

  if (!user) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h1>🤖 AI Project Manager</h1>
        <p>Log in to generate Agile tasks and sync with Trello</p>
        <button
          onClick={handleLogin}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: '#4285F4',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Login with Google
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>🤖 AI Project Manager</h1>
        <button
          onClick={handleLogout}
          style={{
            padding: '6px 12px',
            backgroundColor: '#ea4335',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Logout
        </button>
      </div>

      <div style={{ marginTop: '1.5rem' }}>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., Plan a 2-week product launch"
          style={{
            width: '70%',
            padding: '10px',
            marginRight: '10px',
            border: '1px solid #ccc',
            borderRadius: '4px',
          }}
        />
        <button
          onClick={generateTasks}
          disabled={loading}
          style={{
            padding: '10px 16px',
            backgroundColor: loading ? '#ccc' : '#1a73e8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Generating...' : 'Generate Tasks'}
        </button>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <input
          type="text"
          value={listId}
          onChange={(e) => setListId(e.target.value)}
          placeholder="Trello List ID (from board URL: .../LIST_ID)"
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            marginTop: '8px',
          }}
        />
      </div>

      {tasks.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h2>Generated Tasks ({tasks.length})</h2>
          {tasks.map((task, index) => (
            <div
              key={index}
              style={{
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                padding: '16px',
                margin: '16px 0',
                backgroundColor: '#f9f9f9',
              }}
            >
              <h3 style={{ margin: '0 0 8px 0' }}>{task.title}</h3>
              <p style={{ color: '#555', margin: '0 0 12px 0' }}>{task.description}</p>
              <button
                onClick={() => sendToTrello(task)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#00c853',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                ➕ Add to Trello
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
